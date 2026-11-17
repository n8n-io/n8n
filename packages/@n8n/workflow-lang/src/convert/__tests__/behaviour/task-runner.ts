/**
 * n8n's real task runner for the Code node, as the oracle of Code node behaviour.
 *
 * v1 runs the JavaScript of a Code node in a task runner process. This module starts the
 * parts of n8n that do it, unchanged, from the built packages:
 * - the main process side: `TaskBroker`, the connection handling of `TaskBrokerWsServer`
 *   and `LocalTaskRequester` of the n8n CLI (`packages/cli/dist/task-runners`), which build
 *   the task data, answer the data and helper requests of the runner, and give the result
 *   or the error to the Code node;
 * - the runner side: the process that n8n starts in its default ("internal") mode,
 *   `@n8n/task-runner/start` with the same Node.js flags and environment
 *   (`task-runner-process-js.ts`), with the JavaScript sandbox and the workflow data proxy.
 *
 * One part is not n8n's: the HTTP route that upgrades the runner's connection and checks its
 * grant token. A bare WebSocket server takes the connection and hands it to
 * `TaskBrokerWsServer.add`, as that route does.
 *
 * `startRunnerTask` is the function that n8n's engine calls for a Code node
 * (`additionalData.startRunnerTask`); give it to `runOracle` (`oracle-engine.ts`).
 *
 * It needs the built `n8n` CLI and `@n8n/task-runner` packages.
 */
import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cliPackage = join(here, '../../../../../../cli/package.json');

type StartRunnerTask = (...args: unknown[]) => Promise<unknown>;

export interface TaskRunnerOracle {
	startRunnerTask: StartRunnerTask;
	stop(): void;
}

interface Socket {
	on(event: string, listener: (...args: unknown[]) => void): void;
}

interface SocketServer {
	on(event: 'listening', listener: () => void): void;
	on(event: 'connection', listener: (socket: Socket, request: { url?: string }) => void): void;
	address(): AddressInfo;
	close(): void;
}

/** True when the built packages of the real task runner are here. */
export function taskRunnerAvailable(): boolean {
	return (
		existsSync(join(dirname(cliPackage), 'dist/task-runners/task-broker/task-broker.service.js')) &&
		existsSync(join(dirname(cliPackage), '../@n8n/task-runner/dist/start.js'))
	);
}

let started: Promise<TaskRunnerOracle> | undefined;

/** Starts the broker, the requester and the runner process once for this process. */
export async function startTaskRunner(): Promise<TaskRunnerOracle> {
	started ??= start();
	return await started;
}

async function start(): Promise<TaskRunnerOracle> {
	// n8n reads its settings from this folder when its modules load.
	process.env.N8N_USER_FOLDER ??= mkdtempSync(join(tmpdir(), 'wf-task-runner-'));
	const req = createRequire(cliPackage);
	const load = <T>(id: string): T => req(id) as T;
	const { Container } = load<{ Container: { get(token: unknown): unknown } }>('@n8n/di');
	const config = load<Record<string, unknown>>('@n8n/config');
	const { TaskBrokerWsServer } = load<{ TaskBrokerWsServer: unknown }>(
		'./dist/task-runners/task-broker/task-broker-ws-server.js',
	);
	const { LocalTaskRequester } = load<{
		LocalTaskRequester: new (...deps: unknown[]) => { startTask: StartRunnerTask };
	}>('./dist/task-runners/task-managers/local-task-requester.js');
	const { WebSocketServer } = load<{
		WebSocketServer: new (options: { port: number; host: string }) => SocketServer;
	}>('ws');

	const connections = Container.get(TaskBrokerWsServer) as {
		add(id: string, socket: Socket): void;
	};
	const server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
	await new Promise<void>((resolve) => server.on('listening', resolve));
	const registered = new Promise<void>((resolve) => {
		server.on('connection', (socket, request) => {
			const id = new URL(request.url ?? '/', 'http://localhost').searchParams.get('id') ?? 'runner';
			// The broker asks for the runner's info and registers it on its answer.
			socket.on('message', () => resolve());
			connections.add(id, socket);
		});
	});
	// The requester asks the node types only for nodes that the code names; none here.
	const requester = new LocalTaskRequester(
		{ getNodeTypeDescriptions: () => [] },
		{ emit: () => {} },
		Container.get(config.TaskRunnersConfig),
		Container.get(config.GlobalConfig),
		{ error: () => {} },
	);
	// As `JsTaskRunnerProcess.startProcess` of the n8n CLI.
	const child: ChildProcess = spawn(
		'node',
		[
			'--disallow-code-generation-from-strings',
			'--disable-proto=delete',
			'--no-experimental-webstorage',
			req.resolve('@n8n/task-runner/start'),
		],
		{
			env: {
				PATH: process.env.PATH,
				HOME: process.env.HOME,
				// The tests run in UTC, as the workflows do.
				TZ: process.env.TZ,
				GENERIC_TIMEZONE: process.env.GENERIC_TIMEZONE,
				N8N_RUNNERS_ID: 'oracle-runner',
				N8N_RUNNERS_GRANT_TOKEN: 'oracle',
				N8N_RUNNERS_TASK_BROKER_URI: `http://127.0.0.1:${server.address().port}`,
				N8N_RUNNERS_MAX_PAYLOAD: String(1024 * 1024 * 1024),
				N8N_RUNNERS_MAX_CONCURRENCY: '10',
				N8N_RUNNERS_TASK_TIMEOUT: '60',
				N8N_RUNNERS_HEARTBEAT_INTERVAL: '30',
			},
			// The runner prints the errors of the code that it runs: not for the test output.
			stdio: 'ignore',
		},
	);
	const stop = () => {
		child.kill('SIGKILL');
		server.close();
	};
	process.once('exit', stop);
	await registered;
	// The registration follows the info message in the same turn of the broker.
	await new Promise((resolve) => setTimeout(resolve, 50));
	return {
		startRunnerTask: async (...args) => await requester.startTask(...args),
		stop,
	};
}
