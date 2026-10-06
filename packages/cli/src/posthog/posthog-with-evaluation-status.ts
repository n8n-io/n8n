import { PostHog } from 'posthog-node';

export type InstanceFlagEvaluation =
	| { status: 'available'; value: boolean | string }
	| { status: 'unavailable' };

/** Preserve request errors that the SDK's public flag snapshots omit. */
export class PostHogWithEvaluationStatus extends PostHog {
	async evaluateFlagWithStatus(
		flagName: string,
		distinctId: string,
		groups: Record<string, string>,
	): Promise<InstanceFlagEvaluation> {
		const result = await this.getFlags(
			distinctId,
			groups,
			{},
			{},
			{
				flag_keys_to_evaluate: [flagName],
				geoip_disable: true,
			},
		);
		if (
			!result.success ||
			result.response.errorsWhileComputingFlags ||
			result.response.quotaLimited?.includes('feature_flags')
		) {
			return { status: 'unavailable' };
		}

		const flag = result.response.flags[flagName];
		return {
			status: 'available',
			value: flag?.enabled ? (flag.variant ?? true) : false,
		};
	}
}
