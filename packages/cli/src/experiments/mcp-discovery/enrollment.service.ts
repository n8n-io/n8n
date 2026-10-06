import {
	MCP_DISCOVERY_EXPERIMENT_KEY,
	mcpDiscoveryAssignmentSchema,
	type McpDiscoveryState,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { ApiKeyRepository, SettingsRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { License } from '@/license';
import { UserConsentRepository } from '@/modules/oauth-server/database/repositories/oauth-user-consent.repository';
import { PostHogClient } from '@/posthog';

import { discoveryUserKey, isClaudeMcpClient } from './activity.service';
import { evaluateMcpDiscoveryEligibility } from './eligibility';

const instanceAssignmentKey = 'experiment.mcpDiscovery.instanceAssignment';

@Service()
export class McpDiscoveryEnrollmentService {
	constructor(
		private readonly settings: SettingsRepository,
		private readonly config: GlobalConfig,
		private readonly posthog: PostHogClient,
		private readonly consents: UserConsentRepository,
		private readonly apiKeys: ApiKeyRepository,
		private readonly license: License,
	) {}

	async dismissCoachmark(userId: string): Promise<void> {
		await this.settings.claimKey(discoveryUserKey(userId, 'coachmarkDismissed'), 'true');
	}

	async visit(user: Pick<User, 'id' | 'role'>, pickedClaude?: boolean): Promise<McpDiscoveryState> {
		const inactive: McpDiscoveryState = { status: 'inactive', coachmarkDismissed: false };
		if (this.config.deployment.type !== 'cloud') return inactive;
		if (user.role.slug !== 'global:owner') return inactive;
		const userId = user.id;

		const dismissed = await this.settings.findByKey(discoveryUserKey(userId, 'coachmarkDismissed'));
		const base = { coachmarkDismissed: dismissed?.value === 'true' };
		const unknown: McpDiscoveryState = { ...base, status: 'unknown' };
		const enrolled = await this.settings.findByKey(discoveryUserKey(userId, 'assignment'));

		const planName = this.license.getPlanName();
		if (!enrolled?.value && planName !== 'Trial') return { ...base, status: 'excluded' };

		// A disabled flag remains a kill switch. It never removes the saved assignment.
		const evaluation = await this.posthog.getFeatureFlagForInstanceWithStatus(
			MCP_DISCOVERY_EXPERIMENT_KEY,
		);
		// An unavailable result must allow the editor to retry.
		if (evaluation.status === 'unavailable') return unknown;
		const flag = evaluation.value;
		if (flag !== 'control' && flag !== 'variant') return { ...base, status: 'inactive' };
		// An empty value is an unfinished claim. Retry it after checking eligibility.
		if (enrolled?.value) {
			const assignment = mcpDiscoveryAssignmentSchema.safeParse(this.parseJson(enrolled.value));
			return assignment.success
				? {
						...base,
						status: 'assigned',
						assignment: assignment.data,
						eligibleAt: await this.readEligibilityTime(userId),
						...(await this.getClaudeState(userId)),
					}
				: unknown;
		}

		// Instance creation dates are filtered by the PostHog release condition.
		const now = Date.now();
		const [firstVisit, mutation] = await Promise.all([
			this.settings.findByKey(discoveryUserKey(userId, 'firstLoginAt')),
			this.settings.findByKey(discoveryUserKey(userId, 'assistantMutationAt')),
		]);
		const eligibility = evaluateMcpDiscoveryEligibility({
			pickedClaude,
			now,
			planName,
			firstLoginAt: this.parseTimestamp(firstVisit?.value),
			assistantMutationAt: mutation ? this.parseTimestamp(mutation.value) : null,
		});
		if (eligibility.status !== 'eligible') return { ...base, ...eligibility };
		await this.settings.claimKey(
			discoveryUserKey(userId, 'eligibleAt'),
			String(eligibility.eligibleAt),
		);

		await this.settings.claimKey(
			instanceAssignmentKey,
			JSON.stringify({ variant: flag, assignedAt: now }),
		);
		// Read the winning claim so concurrent users cannot split the instance.
		const claimed = await this.settings.findByKey(instanceAssignmentKey);
		const assignment = mcpDiscoveryAssignmentSchema.safeParse(this.parseJson(claimed?.value));
		if (!assignment.success) return unknown;
		await this.settings.claimKey(
			discoveryUserKey(userId, 'assignment'),
			JSON.stringify(assignment.data),
		);
		return {
			...base,
			status: 'assigned',
			eligibleAt: eligibility.eligibleAt,
			assignment: assignment.data,
			...(await this.getClaudeState(userId)),
		};
	}

	private async getClaudeState(userId: string) {
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
			hasUsedClaudeMcp: this.parseTimestamp(used?.value) !== undefined,
		};
	}

	private async readEligibilityTime(userId: string): Promise<number | undefined> {
		const row = await this.settings.findByKey(discoveryUserKey(userId, 'eligibleAt'));
		return this.parseTimestamp(row?.value);
	}

	private parseTimestamp(value?: string): number | undefined {
		return value && Number.isFinite(Number(value)) ? Number(value) : undefined;
	}

	private parseJson(value: string | undefined): unknown {
		if (!value) return undefined;
		try {
			return JSON.parse(value);
		} catch {
			return undefined;
		}
	}
}
