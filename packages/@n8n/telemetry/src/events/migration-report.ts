import { breakingChangeRuleImpactSchema, breakingChangeVersionSchema } from '@n8n/api-types';
import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const MIGRATION_REPORT_TELEMETRY = defineTelemetryEvents({
	USER_VIEWED_MIGRATION_REPORT: {
		name: 'User viewed migration report',
		description:
			'The migration report overview was served to a user, with the counts it showed. Fires on every load of the overview and on every Refresh. Carries counts only, never workflow names or finding content.',
		properties: z.object({
			user_id: z.string(),
			// Rebuilt from the api-types options: those schemas are zod v3, the registry is v4.
			target_version: z
				.enum(breakingChangeVersionSchema.options)
				.describe('The n8n major version the report prepares the instance for'),
			refreshed: z
				.boolean()
				.describe('The user clicked Refresh, which re-scanned every workflow before the read'),
			total_workflows: z.number().describe('All workflows on the instance'),
			affected_workflows: z.number().describe('Distinct workflows with at least one open finding'),
			affected_instance_rules: z
				.number()
				.describe('Instance-level rules that fired, such as a removed config option'),
			rules: z
				.array(
					z.object({
						rule_id: z.string(),
						impact: z.enum(breakingChangeRuleImpactSchema.options),
						affected_workflows: z.number().describe('Workflows with an open finding for the rule'),
					}),
				)
				.describe('One entry per workflow rule with at least one open finding'),
			synced_at: z
				.string()
				.describe(
					'ISO time the finding table was last filled, which the overview shows as the report date',
				),
		}),
	},
});
