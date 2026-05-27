import type { RedactionEnforcementSettings } from '@n8n/api-types';
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
 * | manual | production | policy        |
 * |--------|------------|---------------|
 * | true   | true       | 'all'         |
 * | false  | true       | 'non-manual'  |
 * | true   | false      | 'manual-only' |
 * | false  | false      | 'none'        |
 */
function deriveEnforcedPolicy(
	enforcement: RedactionEnforcementSettings,
): WorkflowSettings.RedactionPolicy {
	const { manual, production } = enforcement;

	if (manual && production) return 'all';
	if (!manual && production) return 'non-manual';
	if (manual && !production) return 'manual-only';

	return 'none';
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

	async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		const context = await this.instanceRedactionEnforcementService.buildContext();

		if (!context?.enforcement.enforced) return {};

		return {
			contextUpdate: {
				redaction: {
					version: 1,
					policy: deriveEnforcedPolicy(context.enforcement),
				},
			},
		};
	}
}
