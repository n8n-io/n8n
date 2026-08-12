import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

/** Coordination subsystems whose transport can be chosen independently. */
export type TransportSubsystem =
	| 'leaderElection'
	| 'cache'
	| 'pubsub'
	| 'queue'
	| 'instanceRegistry';

export type TransportMode = 'redis' | 'ipc';

/**
 * The single place that dictates which transport each coordination subsystem
 * uses. It only reads the explicit per-subsystem config — no detection, no
 * fallback branch. Adding a subsystem = one `TransportConfig` field + one member
 * of {@link TransportSubsystem}.
 */
@Service()
export class TransportModeService {
	constructor(private readonly globalConfig: GlobalConfig) {}

	// Generic so each subsystem returns its own declared value set — instance
	// registry has three values ('memory' | 'redis' | 'ipc'), the rest have two.
	resolve<S extends TransportSubsystem>(subsystem: S): GlobalConfig['transport'][S] {
		return this.globalConfig.transport[subsystem];
	}

	/** Whether this process was forked by `n8n hypervisor` - the only source of an IPC channel. */
	isUnderHypervisor(): boolean {
		return process.env.N8N_HYPERVISOR_MODE === '1';
	}

	/**
	 * Fail fast at boot for selections that cannot work. Leader election and
	 * pubsub consume the `ipc` value today; this grows as other subsystems are
	 * wired.
	 */
	validateAtBoot(): void {
		if (this.resolve('leaderElection') === 'ipc' && !this.isUnderHypervisor()) {
			throw new UserError(
				'N8N_TRANSPORT_LEADER_ELECTION=ipc requires running under `n8n hypervisor` (no IPC channel otherwise).',
			);
		}

		if (this.resolve('pubsub') === 'ipc' && !this.isUnderHypervisor()) {
			throw new UserError(
				'N8N_TRANSPORT_PUBSUB=ipc requires running under `n8n hypervisor` (no IPC channel otherwise).',
			);
		}

		if (this.resolve('cache') === 'ipc' && !this.isUnderHypervisor()) {
			throw new UserError(
				'N8N_TRANSPORT_CACHE=ipc requires running under `n8n hypervisor` (no IPC channel otherwise).',
			);
		}

		if (this.resolve('queue') === 'ipc' && !this.isUnderHypervisor()) {
			throw new UserError(
				'N8N_TRANSPORT_QUEUE=ipc requires running under `n8n hypervisor` (no IPC channel otherwise).',
			);
		}
	}
}
