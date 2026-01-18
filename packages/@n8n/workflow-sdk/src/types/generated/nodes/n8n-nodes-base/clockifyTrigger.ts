/**
 * Clockify Trigger Node Types
 *
 * Listens to Clockify events
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/clockifytrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface ClockifyTriggerV1Params {
	/**
	 * Time at which polling should occur
	 * @default {"item":[{"mode":"everyMinute"}]}
	 */
	pollTimes?: {
		item?: Array<{
			mode?:
				| 'everyMinute'
				| 'everyHour'
				| 'everyDay'
				| 'everyWeek'
				| 'everyMonth'
				| 'everyX'
				| 'custom'
				| Expression<string>;
			hour?: number | Expression<number>;
			minute?: number | Expression<number>;
			dayOfMonth?: number | Expression<number>;
			weekday?: '1' | '2' | '3' | '4' | '5' | '6' | '0' | Expression<string>;
			cronExpression?: string | Expression<string>;
			value?: number | Expression<number>;
			unit?: 'minutes' | 'hours' | Expression<string>;
		}>;
	};
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	workspaceId: string | Expression<string>;
	watchField: 0 | Expression<number>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface ClockifyTriggerV1Credentials {
	clockifyApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type ClockifyTriggerV1Node = {
	type: 'n8n-nodes-base.clockifyTrigger';
	version: 1;
	config: NodeConfig<ClockifyTriggerV1Params>;
	credentials?: ClockifyTriggerV1Credentials;
	isTrigger: true;
};

export type ClockifyTriggerNode = ClockifyTriggerV1Node;
