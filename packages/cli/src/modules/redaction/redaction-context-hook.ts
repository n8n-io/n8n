import type { RedactionFloor } from '@n8n/api-types';
import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';
import type { WorkflowSettings } from 'n8n-workflow';

import { InstanceRedactionEnforcementService } from './instance-redaction-enforcement.service';

/**
 * | floor      | policy       |
 * |------------|--------------|
 * | all        | 'all'        |
 * | production | 'non-manual' |
 *
 * `off` is never passed here — it is filtered out by the caller, which falls
 * back to the workflow's own redaction policy when enforcement is off.
 */
function deriveEnforcedPolicy(enforcement: RedactionFloor): WorkflowSettings.RedactionPolicy {
	return enforcement === 'all' ? 'all' : 'non-manual';
}

@ContextEstablishmentHook({
	alwaysExecute: true,
})
export class RedactionContextHook implements IContextEstablishmentHook {
	constructor(
		private readonly instanceRedactionEnforcementService: InstanceRedactionEnforcementService,
	) {}

	hookDescription: HookDescription = {
		name: 'RedactionContextHook',
	};

	isApplicableToTriggerNode(_nodeType: string): boolean {
		// Global hook, never user-facing.
		return false;
	}

	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		const context = await this.instanceRedactionEnforcementService.buildContext();

		const policy: WorkflowSettings.RedactionPolicy =
			context && context.enforcement !== 'off'
				? deriveEnforcedPolicy(context.enforcement)
				: (options.workflow.settings?.redactionPolicy ?? 'none');

		return {
			contextUpdate: {
				redaction: {
					version: 1,
					policy,
				},
			},
		};
	}
}
