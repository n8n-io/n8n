/**
 * Starts the built n8n as a child process with a hook file, and checks the
 * versioned hooks API from the outside, as an extension sees it.
 *
 * An in-process test cannot cover this: with `NODE_ENV=test` the server skips
 * `register()` and the `n8n.ready` hooks. Run `pnpm build` in packages/cli first.
 */
import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// CI picks tests with `vitest related`, which follows imports. These imports make
// CI run this test when the startup wiring changes, although the test runs dist/.
import '@/abstract-server';
import '@/hooks-api/hooks-api.service';
import '@/scaling/worker-server';

const CLI_ROOT = resolve(__dirname, '../../..');
const STARTUP_TIMEOUT = 120_000;

type RecordedEvent = { type: string; [key: string]: unknown };

let n8n: ChildProcess;
let output = '';
let dataDir: string;
let eventsFile: string;
let baseUrl: string;
let authCookie: string;

const getFreePort = async () =>
	await new Promise<number>((resolvePort, reject) => {
		const server = createServer();
		server.on('error', reject);
		server.listen(0, () => {
			const address = server.address();
			server.close(() =>
				typeof address === 'object' && address ? resolvePort(address.port) : reject(),
			);
		});
	});

const readEvents = (): RecordedEvent[] =>
	readFileSync(eventsFile, 'utf8')
		.split('\n')
		.filter(Boolean)
		.map((line) => JSON.parse(line) as RecordedEvent);

const waitFor = async <T>(
	description: string,
	check: () => T | undefined | Promise<T | undefined>,
	timeout: number,
): Promise<T> => {
	const deadline = Date.now() + timeout;
	for (;;) {
		const result = await check();
		if (result) return result;
		if (n8n.exitCode !== null) {
			throw new Error(`n8n exited with code ${n8n.exitCode} while waiting for ${description}`);
		}
		if (Date.now() > deadline) throw new Error(`Timed out waiting for ${description}`);
		await new Promise((r) => setTimeout(r, 250));
	}
};

const rest = async (path: string, init: RequestInit = {}) =>
	await fetch(`${baseUrl}/rest${path}`, {
		...init,
		headers: {
			'content-type': 'application/json',
			'browser-id': 'hooks-api-startup-test',
			cookie: authCookie,
			...init.headers,
		},
	});

const createActiveWebhookWorkflow = async (name: string) => {
	const created = await rest('/workflows', {
		method: 'POST',
		body: JSON.stringify({
			name,
			nodes: [
				{
					id: 'webhook',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 0],
					webhookId: name,
					parameters: { path: name },
				},
			],
			connections: {},
			settings: {},
		}),
	});
	expect(created.status).toBe(200);
	const { data } = (await created.json()) as { data: { id: string; versionId: string } };

	const activated = await rest(`/workflows/${data.id}/activate`, {
		method: 'POST',
		body: JSON.stringify({ versionId: data.versionId }),
	});
	expect(activated.status).toBe(200);

	return data.id;
};

/** Activation is asynchronous, so call the webhook until n8n has registered it. */
const callWebhookWhenLive = async (path: string) =>
	await waitFor(
		`webhook ${path} to be registered`,
		async () => {
			const response = await fetch(`${baseUrl}/webhook/${path}`);
			return response.status === 404 ? undefined : response;
		},
		30_000,
	);

beforeAll(async () => {
	const n8nBin = join(CLI_ROOT, 'bin', 'n8n');
	if (!existsSync(join(CLI_ROOT, 'dist', 'commands', 'start.js'))) {
		throw new Error('packages/cli is not built. Run `pnpm build` in packages/cli first.');
	}

	dataDir = mkdtempSync(join(tmpdir(), 'hooks-api-startup-'));
	eventsFile = join(dataDir, 'events.jsonl');
	writeFileSync(eventsFile, '');

	const [port, brokerPort] = [await getFreePort(), await getFreePort()];
	baseUrl = `http://localhost:${port}`;

	// Do not pass on test settings such as NODE_ENV=test or the test DB settings.
	const inheritedEnv = Object.fromEntries(
		Object.entries(process.env).filter(
			([key]) => key !== 'NODE_ENV' && !key.startsWith('N8N_') && !key.startsWith('DB_'),
		),
	);

	n8n = spawn(process.execPath, [n8nBin, 'start'], {
		env: {
			...inheritedEnv,
			N8N_USER_FOLDER: dataDir,
			N8N_PORT: String(port),
			N8N_RUNNERS_BROKER_PORT: String(brokerPort),
			N8N_DIAGNOSTICS_ENABLED: 'false',
			N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
			N8N_LOG_LEVEL: 'warn',
			DB_TYPE: 'sqlite',
			EXTERNAL_HOOK_FILES: join(__dirname, 'fixtures', 'startup.hook.js'),
			HOOKS_API_TEST_EVENTS_FILE: eventsFile,
		},
	});
	n8n.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
	n8n.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));

	try {
		await waitFor(
			'the n8n.ready hook',
			() => readEvents().some((e) => e.type === 'n8n.ready'),
			STARTUP_TIMEOUT,
		);
	} catch (error) {
		console.error(output);
		throw error;
	}

	if (!readEvents().some((e) => e.type === 'register')) {
		throw new Error('n8n did not call register() from the hook file on startup');
	}

	const login = await rest('/login', {
		method: 'POST',
		body: JSON.stringify({ emailOrLdapLoginId: 'owner@example.com', password: 'Password123' }),
	});
	expect(login.status).toBe(200);
	authCookie = login.headers
		.getSetCookie()
		.map((cookie) => cookie.split(';')[0])
		.join('; ');
}, STARTUP_TIMEOUT + 10_000);

afterAll(async () => {
	if (n8n && n8n.exitCode === null) {
		const exited = new Promise((r) => n8n.once('exit', r));
		n8n.kill('SIGTERM');
		await Promise.race([exited, new Promise((r) => setTimeout(r, 15_000))]);
		if (n8n.exitCode === null) n8n.kill('SIGKILL');
	}
	if (dataDir) rmSync(dataDir, { recursive: true, force: true });
}, 30_000);

describe('Hooks API on n8n startup', () => {
	it('calls register once on main with V1, before the legacy n8n.ready hooks', () => {
		const types = readEvents().map((e) => e.type);

		expect(types.filter((t) => t === 'register')).toHaveLength(1);
		expect(types.indexOf('register')).toBeLessThan(types.indexOf('n8n.ready'));
		expect(readEvents().find((e) => e.type === 'register')).toMatchObject({
			versions: ['v1'],
			instanceType: 'main',
		});
	});

	it('lets the owner from register log in', () => {
		// The login in beforeAll used the owner that the hook file set up.
		expect(authCookie).toContain('n8n-auth=');
	});

	it('serves routes from register before the editor UI fallback', async () => {
		const path = '/hooks-api-test/executions/does-not-exist/workflow';

		const asJson = await fetch(`${baseUrl}${path}`);
		const asHtml = await fetch(`${baseUrl}${path}`, { headers: { accept: 'text/html' } });

		expect(asJson.status).toBe(404);
		expect(asHtml.status).toBe(404);
		expect(await asHtml.text()).toBe('');
	});

	it('runs the pre-execute handler for a real execution, and the execution is found by ID', async () => {
		const workflowId = await createActiveWebhookWorkflow('hooks-api-allowed');

		const webhook = await callWebhookWhenLive('hooks-api-allowed');
		expect(webhook.status).toBe(200);

		expect(readEvents()).toContainEqual({
			type: 'preExecute',
			workflow: { id: workflowId, name: 'hooks-api-allowed', active: true },
			mode: 'webhook',
		});

		const executionId = await waitFor(
			'the execution to be saved',
			async () => {
				const response = await rest('/executions?limit=10');
				const { data } = (await response.json()) as {
					data: { results: Array<{ id: string; workflowId: string }> };
				};
				return data.results.find((e) => e.workflowId === workflowId)?.id;
			},
			10_000,
		);

		const lookup = await fetch(`${baseUrl}/hooks-api-test/executions/${executionId}/workflow`);
		expect(lookup.status).toBe(200);
		expect(await lookup.json()).toEqual({ workflowId });
	}, 60_000);

	it('stops the execution if the pre-execute handler throws', async () => {
		const workflowId = await createActiveWebhookWorkflow('blocked-hooks-api');

		const webhook = await callWebhookWhenLive('blocked-hooks-api');

		expect(webhook.status).toBe(500);
		expect(readEvents()).toContainEqual(
			expect.objectContaining({
				type: 'preExecute',
				workflow: expect.objectContaining({ id: workflowId }),
			}),
		);
	}, 60_000);
});
