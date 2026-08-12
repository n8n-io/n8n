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

			// The primary hosts coordination features (leader election, instance
			// registry, pubsub) over IPC; the router dispatches messages to them by
			// type prefix.
			const router = Container.get(HypervisorMessageRouter);
			router.register(Container.get(LeaderElectionHost));
			router.register(Container.get(InstanceRegistryHost));
			router.register(Container.get(PubSubHost));
			router.register(Container.get(CacheHost));
			cluster.on('message', (worker, message) => router.handleMessage(worker, message));

			for (const role of ['main', 'main', 'worker', 'worker'] as const) {
				const child = cluster.fork({
					N8N_HYPERVISOR_ROLE: role,
					N8N_HYPERVISOR_MODE: '1',
					N8N_TRANSPORT_LEADER_ELECTION: 'ipc',
					N8N_TRANSPORT_INSTANCE_REGISTRY: 'ipc',
					N8N_TRANSPORT_PUBSUB: 'ipc',
					N8N_TRANSPORT_CACHE: 'ipc',
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
				router.handleExit(worker);
			});
			const tick = setInterval(
				() => router.tick(Date.now()),
				this.globalConfig.multiMainSetup.interval * 1000,
			);
			tick.unref();
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
