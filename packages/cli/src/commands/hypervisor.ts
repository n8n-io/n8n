import { Command, type ICommand } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';
import cluster from 'node:cluster';
import readline from 'node:readline';
import type { Readable } from 'node:stream';

import type { LeaderMessage } from '@/scaling/hypervisor-leader-election';

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

type Claimant = { id: number; send: (message: LeaderMessage) => void; process: { pid?: number } };

/**
 * Assigns leadership among main-role workers. The primary's message loop is
 * single-threaded, so simultaneous claims resolve in arrival order — no lock.
 * Liveness is heartbeat based: `checkTimeouts` fails over a main that stopped
 * heartbeating (a *hung* leader), while `onExit` handles a crashed one instantly.
 */
export function createLeaderCoordinator(log: (message: string) => void, timeoutMs: number) {
	const claimants = new Map<number, { worker: Claimant; lastSeen: number }>();
	let leaderId: number | null = null;

	const assign = (worker: Claimant) => {
		leaderId = worker.id;
		worker.send({ type: 'leader:assign', isLeader: true });
		log(`Leader = worker id=${worker.id} pid=${worker.process.pid}`);
	};

	// Drop a main and, if it held leadership, promote any survivor.
	const dropAndMaybePromote = (id: number) => {
		claimants.delete(id);
		if (id !== leaderId) return;
		leaderId = null;
		const next = claimants.values().next().value;
		if (next) assign(next.worker);
		else log('No main available to lead');
	};

	return {
		onClaim(worker: Claimant, now: number) {
			claimants.set(worker.id, { worker, lastSeen: now });
			if (leaderId === null) assign(worker);
			else worker.send({ type: 'leader:assign', isLeader: false });
		},
		onHeartbeat(id: number, now: number) {
			const entry = claimants.get(id);
			if (entry) entry.lastSeen = now;
		},
		onExit(worker: { id: number }) {
			dropAndMaybePromote(worker.id);
		},
		checkTimeouts(now: number) {
			for (const [id, { worker, lastSeen }] of claimants) {
				if (now - lastSeen <= timeoutMs) continue;
				log(`Main id=${id} pid=${worker.process.pid} missed heartbeat; failing over`);
				const wasLeader = id === leaderId;
				dropAndMaybePromote(id);
				// Best-effort demotion in case it is hung rather than dead — delivered
				// when its event loop resumes, so it steps down and can't split-brain.
				if (wasLeader) worker.send({ type: 'leader:assign', isLeader: false });
			}
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
			// Pipe children's output here so we can tag each line with its role + pid.
			cluster.setupPrimary({ silent: true });
			const selfTag = `[hypervisor pid=${process.pid}]`;

			// The primary hosts leader election over IPC (replaces the Redis lease).
			const { interval, ttl } = this.globalConfig.multiMainSetup;
			const coordinator = createLeaderCoordinator(
				(message) => this.logger.info(`${selfTag} ${message}`),
				ttl * 1000,
			);
			cluster.on('message', (worker, message: LeaderMessage) => {
				if (message?.type === 'leader:claim') coordinator.onClaim(worker, Date.now());
				else if (message?.type === 'leader:heartbeat')
					coordinator.onHeartbeat(worker.id, Date.now());
			});
			const timeoutCheck = setInterval(
				() => coordinator.checkTimeouts(Date.now()),
				interval * 1000,
			);
			timeoutCheck.unref();

			for (const role of ['main', 'main', 'worker', 'worker'] as const) {
				const child = cluster.fork({
					N8N_HYPERVISOR_ROLE: role,
					N8N_HYPERVISOR_MODE: '1',
					N8N_TRANSPORT_LEADER_ELECTION: 'ipc',
				});
				const childTag = `[${role} pid=${child.process.pid}]`;
				forwardPrefixed(child.process.stdout, process.stdout, childTag);
				forwardPrefixed(child.process.stderr, process.stderr, childTag);
				this.logger.info(`${selfTag} Forked ${role} (pid ${child.process.pid})`);
			}
			cluster.on('exit', (worker, code, signal) => {
				this.logger.info(
					`${selfTag} Child pid ${worker.process.pid} exited (code ${code}, signal ${signal})`,
				);
				coordinator.onExit(worker);
			});
			// ponytail: no restart yet (step 2); supervisor just stays alive
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
