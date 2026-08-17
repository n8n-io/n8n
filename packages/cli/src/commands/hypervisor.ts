import { Command, type ICommand } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import cluster from 'node:cluster';
import readline from 'node:readline';
import type { Readable } from 'node:stream';

import { InstanceRegistryHost } from '@/modules/instance-registry/storage/ipc-instance-storage';
import { LeaderElectionHost } from '@/scaling/hypervisor-leader-election';
import { HypervisorMessageRouter } from '@/scaling/hypervisor-message-router';
import { SupervisorInfoClient, SupervisorInfoHost } from '@/scaling/hypervisor-supervisor-info';
import { JobQueueHost } from '@/scaling/queue/ipc-job-queue';
import { PubSubHost } from '@/scaling/transport/hypervisor-message-transport';
import { CacheHost } from '@/services/cache/ipc.cache-manager';

import { BaseCommand } from './base-command';
import { Start } from './start';
import { Worker } from './worker';

/** Forward each line of a child stream to the supervisor's output, line-tagged. */
export function forwardPrefixed(stream: Readable | null, out: NodeJS.WriteStream, prefix: string) {
	if (!stream) return;
	readline
		.createInterface({ input: stream })
		.on('line', (line) => out.write(`${prefix} ${line}\n`));
}

type ChildEnv = Record<string, string>;
type SupervisedChild = {
	id: number;
	process: { pid?: number; kill: (signal: NodeJS.Signals) => void };
	isDead: () => boolean;
};

/** Best-effort crash classification for the log line — all take the same respawn path. */
function classifyCrash(code: number | null, signal: string | null): string {
	if (signal === 'SIGKILL') return 'killed (SIGKILL — OS or OOM-killer)';
	if (signal === 'SIGABRT' || code === 134) return 'V8 heap OOM (SIGABRT — allocation failed)';
	return `crash (code=${code} signal=${signal})`;
}

/**
 * Tracks forked children with their role/env so a crashed one can be respawned
 * identically, and drives graceful shutdown (SIGTERM each child → n8n's own drain →
 * SIGKILL backstop). Cluster-agnostic (fork is injected) so it unit-tests without
 * `cluster`. PoC: infinite respawn, no crash-loop backoff, no execution recovery.
 */
export function createChildSupervisor(deps: {
	fork: (role: string, env: ChildEnv, execArgv?: string[]) => SupervisedChild;
	log: (message: string) => void;
	exit?: () => void;
	forceKillMs?: number;
}) {
	const exit = deps.exit ?? (() => process.exit(0));
	const forceKillMs = deps.forceKillMs ?? 10_000;
	const children = new Map<
		number,
		{ child: SupervisedChild; role: string; env: ChildEnv; execArgv?: string[] }
	>();
	const respawns = new Map<string, number>();
	let shuttingDown = false;

	const spawn = (role: string, env: ChildEnv, execArgv?: string[]) => {
		const child = deps.fork(role, env, execArgv);
		children.set(child.id, { child, role, env, execArgv });
	};

	return {
		spawn,
		getRespawnCounts: (): Record<string, number> => Object.fromEntries(respawns),
		onExit(id: number, code: number | null, signal: string | null) {
			const meta = children.get(id);
			children.delete(id);
			deps.log(
				`child role=${meta?.role ?? '?'} pid=${meta?.child.process.pid} exited (code=${code} signal=${signal})`,
			);
			if (shuttingDown) {
				if (children.size === 0) exit();
				return;
			}
			if (!meta) return;
			respawns.set(meta.role, (respawns.get(meta.role) ?? 0) + 1);
			deps.log(`${classifyCrash(code, signal)} — respawning ${meta.role}`);
			spawn(meta.role, meta.env, meta.execArgv);
		},
		shutdown(signal: string) {
			if (shuttingDown) return;
			shuttingDown = true;
			deps.log(`Received ${signal}; gracefully stopping ${children.size} child(ren)`);
			if (children.size === 0) {
				exit();
				return;
			}
			// SIGTERM triggers each child's own graceful shutdown (BaseCommand handler).
			for (const { child } of children.values()) child.process.kill('SIGTERM');
			setTimeout(() => {
				for (const { child } of children.values())
					if (!child.isDead()) child.process.kill('SIGKILL');
			}, forceKillMs).unref();
		},
	};
}

@Command({
	name: 'hypervisor',
	description:
		'Boots n8n main and worker as forked cluster processes on one host (cluster-mode POC)',
	examples: [''],
})
export class Hypervisor extends BaseCommand {
	async init() {
		// Supervisor only forks; each child runs Start/Worker, which bootstrap themselves.
	}

	async run() {
		if (cluster.isPrimary) {
			const selfTag = `[hypervisor pid=${process.pid}]`;

			// The primary hosts coordination features (leader election, instance
			// registry, pubsub, cache) over IPC; the router dispatches messages to
			// them by type prefix.
			const router = Container.get(HypervisorMessageRouter);
			router.register(Container.get(LeaderElectionHost));
			router.register(Container.get(InstanceRegistryHost));
			router.register(Container.get(PubSubHost));
			router.register(Container.get(CacheHost));
			router.register(Container.get(JobQueueHost));
			const supervisorInfoHost = Container.get(SupervisorInfoHost);
			router.register(supervisorInfoHost);

			const baseExecArgv = process.execArgv;
			// Fork a child, piping+tagging its output. `silent: true` keeps stdio
			// piped; per-fork execArgv lets us heap-limit one worker for the OOM demo
			// without touching the others. All children stay cluster-forked so their
			// registry/cache/pubsub IPC reaches the router.
			const doFork = (role: string, env: ChildEnv, execArgv?: string[]) => {
				cluster.setupPrimary({ silent: true, execArgv: execArgv ?? baseExecArgv });
				const child = cluster.fork(env);
				const childTag = `[${role} pid=${child.process.pid}]`;
				forwardPrefixed(child.process.stdout, process.stdout, childTag);
				forwardPrefixed(child.process.stderr, process.stderr, childTag);
				this.logger.info(`${selfTag} Forked ${role} (pid ${child.process.pid})`);
				return child;
			};

			const supervisor = createChildSupervisor({
				fork: doFork,
				log: (message) => this.logger.info(`${selfTag} ${message}`),
			});
			supervisorInfoHost.setCountsProvider(() => supervisor.getRespawnCounts());

			cluster.on('message', (worker, message) => router.handleMessage(worker, message));
			cluster.on('exit', (worker, code, signal) => {
				router.handleExit(worker);
				supervisor.onExit(worker.id, code, signal);
			});
			process.on('SIGTERM', () => supervisor.shutdown('SIGTERM'));
			process.on('SIGINT', () => supervisor.shutdown('SIGINT'));

			// Opt-in OOM demo: heap-limit children per role so a memory-hog workflow
			// crashes them fast. Set per type (mains and workers can differ). Stored
			// in metadata, so a respawn stays constrained.
			const heapMbFor = (role: 'main' | 'worker') =>
				role === 'worker'
					? process.env.N8N_HYPERVISOR_OOM_DEMO_HEAP_MB_WORKER
					: process.env.N8N_HYPERVISOR_OOM_DEMO_HEAP_MB_MAIN;
			const childEnv = (role: string): ChildEnv => ({
				N8N_HYPERVISOR_ROLE: role,
				N8N_HYPERVISOR_MODE: '1',
				N8N_TRANSPORT_LEADER_ELECTION: 'ipc',
				N8N_TRANSPORT_INSTANCE_REGISTRY: 'ipc',
				N8N_TRANSPORT_PUBSUB: 'ipc',
				N8N_TRANSPORT_CACHE: 'ipc',
				N8N_TRANSPORT_QUEUE: 'ipc',
			});
			const roles = ['main', 'main', 'worker', 'worker'] as const;
			roles.forEach((role) => {
				const heapMb = heapMbFor(role);
				const execArgv = heapMb ? [...baseExecArgv, `--max-old-space-size=${heapMb}`] : undefined;
				supervisor.spawn(role, childEnv(role), execArgv);
			});

			const tick = setInterval(
				() => router.tick(Date.now()),
				this.globalConfig.multiMainSetup.interval * 1000,
			);
			tick.unref();
			// ponytail: infinite respawn, no backoff; graceful drain on SIGTERM/SIGINT
			await new Promise(() => {});
			return;
		}

		// Typed as ICommand so `flags` (readonly on BaseCommand) is assignable, matching
		// how the CommandRegistry injects flags before running a command.
		const role = process.env.N8N_HYPERVISOR_ROLE;
		let command: ICommand;
		if (role === 'main') {
			Container.get(InstanceSettings).instanceType = 'main';
			command = Container.get(Start);
			command.flags = {};
		} else if (role === 'worker') {
			Container.get(InstanceSettings).instanceType = 'worker';
			command = Container.get(Worker);
			command.flags = { concurrency: 10 };
		} else {
			throw new UnexpectedError(`Unknown N8N_HYPERVISOR_ROLE: ${String(role)}`);
		}

		// Push this child's live process info to the primary so an aggregate
		// /cluster-info reports current memory for every forked process.
		Container.get(SupervisorInfoClient).startPushing();

		await command.init?.();
		await command.run(); // Worker.run() blocks forever; Start.run() returns after boot.

		// Keep the 'main' child alive after Start.run() returns (its HTTP server
		// keeps the loop busy, but run() resolving would let the registry call finally).
		await new Promise(() => {});
	}

	// Children/supervisor manage their own lifecycle; only surface errors here. Overriding
	// skips BaseCommand.finally, which would touch the DB connection this command never opened.
	// eslint-disable-next-line @typescript-eslint/require-await -- async to match the base hook
	async finally(error: Error | undefined) {
		if (error?.message) this.logger.error(error.message);
	}
}
