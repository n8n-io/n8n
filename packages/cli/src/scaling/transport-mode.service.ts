import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

/** Coordination subsystems whose transport can be chosen independently. */
export type TransportSubsystem = 'leaderElection' | 'cache' | 'pubsub' | 'queue';

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

	resolve(subsystem: TransportSubsystem): TransportMode {
		return this.globalConfig.transport[subsystem];
	}

	/**
	 * Fail fast at boot for selections that cannot work. Only leader election
	 * consumes the `ipc` value today; this grows as other subsystems are wired.
	 */
	validateAtBoot(): void {
		if (this.resolve('leaderElection') === 'ipc' && process.env.N8N_HYPERVISOR_MODE !== '1') {
			throw new UserError(
				'N8N_TRANSPORT_LEADER_ELECTION=ipc requires running under `n8n hypervisor` (no IPC channel otherwise).',
			);
		}
	}
}
