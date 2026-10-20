// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import { GlobalConfig } from '@n8n/config';
import { ApiKeyRepository, SettingsRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { UserConsentRepository } from '@/modules/oauth-server/database/repositories/oauth-user-consent.repository';

import { discoveryUserKey, isClaudeMcpClient } from './activity.service';
import { McpDiscoveryActivityEvents } from './activity-events.service';
import { evaluateMcpDiscoveryEligibility } from './eligibility';
import type { McpDiscoveryVisitRequestDto } from './mcp-discovery.dto';
import type { McpDiscoveryState } from './types';

@Service()
export class McpDiscoveryEnrollmentService {
	constructor(
		private readonly settings: SettingsRepository,
		private readonly config: GlobalConfig,
		private readonly consents: UserConsentRepository,
		private readonly apiKeys: ApiKeyRepository,
		private readonly activityEvents: McpDiscoveryActivityEvents,
	) {}

	async visit(
		user: Pick<User, 'id' | 'role'>,
		{ pickedClaude, isTrial }: McpDiscoveryVisitRequestDto = {},
	): Promise<McpDiscoveryState> {
		const inactive: McpDiscoveryState = { status: 'inactive' };
		if (this.config.deployment.type !== 'cloud') return inactive;
		if (user.role.slug !== 'global:owner') return inactive;
		const userId = user.id;
		await this.activityEvents.flush(userId);

		const unknown: McpDiscoveryState = { status: 'unknown' };
		const savedEligibility = await this.readEligibilityTime(userId);
		if (savedEligibility !== undefined) {
			return {
				status: 'assigned',
				eligibleAt: savedEligibility,
				...(await this.getMcpState(userId)),
			};
		}
		if (isTrial === undefined) return unknown;
		if (!isTrial) return { status: 'excluded' };

		// Instance creation dates are filtered by the PostHog release condition.
		const now = Date.now();
		const [firstVisit, mutation] = await Promise.all([
			this.settings.findByKey(discoveryUserKey(userId, 'firstLoginAt')),
			this.settings.findByKey(discoveryUserKey(userId, 'assistantMutationAt')),
		]);
		const eligibility = evaluateMcpDiscoveryEligibility({
			pickedClaude,
			now,
			isTrial,
			firstLoginAt: this.parseTimestamp(firstVisit?.value),
			assistantMutationAt: mutation ? this.parseTimestamp(mutation.value) : null,
		});
		if (eligibility.status !== 'eligible') return eligibility;
		await this.settings.claimKey(
			discoveryUserKey(userId, 'eligibleAt'),
			String(eligibility.eligibleAt),
		);

		return {
			status: 'assigned',
			eligibleAt: eligibility.eligibleAt,
			...(await this.getMcpState(userId)),
		};
	}

	private async getMcpState(userId: string) {
		const [connected, keys, used] = await Promise.all([
			this.consents.findConnectedClients({ userId, now: Date.now() }),
			this.apiKeys.find({ where: { userId, audience: 'mcp-server-api' }, select: ['id'] }),
			this.settings.findByKey(discoveryUserKey(userId, 'claudeMcpUsedAt')),
		]);
		// Only observations tied to credentials that still exist count as connected.
		const observed = await Promise.all([
			...connected.rows.map(
				async ({ clientId }) =>
					await this.settings.findByKey(discoveryUserKey(userId, `claudeClient.${clientId}`)),
			),
			...keys.map(
				async ({ id }) =>
					await this.settings.findByKey(discoveryUserKey(userId, `claudeApiKey.${id}`)),
			),
		]);
		const hasConnectedClaude =
			observed.some((row) => Boolean(row?.value)) ||
			connected.rows.some(({ client }) => isClaudeMcpClient(client.name));
		return {
			hasConnectedClaude,
			hasUsedMcp: this.parseTimestamp(used?.value) !== undefined,
		};
	}

	private async readEligibilityTime(userId: string): Promise<number | undefined> {
		const row = await this.settings.findByKey(discoveryUserKey(userId, 'eligibleAt'));
		return this.parseTimestamp(row?.value);
	}

	private parseTimestamp(value?: string): number | undefined {
		return value && Number.isFinite(Number(value)) ? Number(value) : undefined;
	}
}
// EOF Experiment cleanup
