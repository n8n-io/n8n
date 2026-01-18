/**
 * Toggl Trigger Node Types
 *
 * Starts the workflow when Toggl events occur
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/toggltrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TogglTriggerV1Params {
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
	event: 'newTimeEntry' | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface TogglTriggerV1Credentials {
	togglApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type TogglTriggerV1Node = {
	type: 'n8n-nodes-base.togglTrigger';
	version: 1;
	config: NodeConfig<TogglTriggerV1Params>;
	credentials?: TogglTriggerV1Credentials;
	isTrigger: true;
};

export type TogglTriggerNode = TogglTriggerV1Node;
