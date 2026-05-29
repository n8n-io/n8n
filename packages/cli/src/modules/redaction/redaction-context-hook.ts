import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';

import { InstanceRedactionEnforcementService } from './instance-redaction-enforcement.service';
import { policyToChannels } from './redaction-channels';

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

	/**
	 * Captures the effective redaction snapshot per channel at execution time.
	 *
	 * The instance floor is a minimum, not an override: each channel is redacted when
	 * the workflow setting redacts it OR the floor enforces it (strictest-per-channel).
	 * A workflow can be equal to or stricter than the floor, never weaker.
	 */
	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		const floor = await this.instanceRedactionEnforcementService.getFloor();
		const workflow = policyToChannels(options.workflow.settings?.redactionPolicy ?? 'none');

		const floorEnforcesProduction = floor !== 'off';
		const floorEnforcesManual = floor === 'all';

		const manual = workflow.manual || floorEnforcesManual;
		// Manual redaction implies production redaction (IAM-697 + floor normalization
		// already guarantee this; the clamp keeps the captured snapshot valid regardless).
		const production = workflow.production || floorEnforcesProduction || manual;

		return {
			contextUpdate: {
				redaction: {
					version: 2,
					production,
					manual,
				},
			},
		};
	}
}
