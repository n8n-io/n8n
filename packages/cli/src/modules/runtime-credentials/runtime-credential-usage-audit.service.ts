import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';

/** Executions to remember. Old ones drop out, so the memory use stays small. */
const MAX_TRACKED_EXECUTIONS = 1000;

export type RuntimeCredentialUse = {
	alias: string;
	credentialId: string;
	credentialType: string;
	workflowId?: string;
	executionId?: string;
	nodeName?: string;
	nodeType?: string;
};

/**
 * Sends the `runtime-credential-used` audit event once for each execution, stub and node.
 * A node can ask for its credential many times in a run (for example once for each item).
 * The memory is per process. In multi-main mode an execution runs on one process.
 */
@Service()
export class RuntimeCredentialUsageAudit {
	private readonly seen = new Map<string, Set<string>>();

	constructor(private readonly eventService: EventService) {}

	record(use: RuntimeCredentialUse): void {
		const { executionId } = use;
		if (executionId !== undefined) {
			const key = `${use.credentialId}\u0000${use.nodeName ?? ''}`;
			let keys = this.seen.get(executionId);
			if (!keys) {
				keys = new Set();
				this.seen.set(executionId, keys);
				if (this.seen.size > MAX_TRACKED_EXECUTIONS) {
					const oldest = this.seen.keys().next().value;
					if (oldest !== undefined) this.seen.delete(oldest);
				}
			}
			if (keys.has(key)) return;
			keys.add(key);
		}

		this.eventService.emit('runtime-credential-used', use);
	}
}
