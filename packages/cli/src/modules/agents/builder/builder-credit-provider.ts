import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { BuilderUsageItem, TraceStatus } from '@n8n/instance-ai';

/** The slice of credit accounting the agent builder needs from its host. */
export interface BuilderCreditProvider {
	claimRunUsage(
		user: User,
		threadId: string,
		dedupeId: string,
		usage: BuilderUsageItem[],
		status: TraceStatus,
	): Promise<number | undefined>;
}

/**
 * Seam through which the instance-ai module supplies credit accounting to the
 * agent builder without the agents module importing instance-ai. Instance-ai
 * registers its credit service during module `init()`. With no provider
 * registered (instance-ai module disabled) claims are no-ops, which is safe:
 * builder runs are only started through instance-ai's build-agent tool.
 */
@Service()
export class BuilderCreditProviderRegistry implements BuilderCreditProvider {
	private provider: BuilderCreditProvider | undefined;

	register(provider: BuilderCreditProvider) {
		this.provider = provider;
	}

	async claimRunUsage(
		user: User,
		threadId: string,
		dedupeId: string,
		usage: BuilderUsageItem[],
		status: TraceStatus,
	): Promise<number | undefined> {
		return await this.provider?.claimRunUsage(user, threadId, dedupeId, usage, status);
	}
}
