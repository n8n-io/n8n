import {
	ContextEstablishmentHook,
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	HookDescription,
	IContextEstablishmentHook,
} from '@n8n/decorators';
import { policyToChannels, redactionSettingToChannels, type RedactionSource } from 'n8n-workflow';

import { InstanceRedactionEnforcementService } from './instance-redaction-enforcement.service';

@ContextEstablishmentHook({
	alwaysExecute: true,
	// Also re-run for sub-workflows so a child's own execution record captures its
	// own redaction policy, merged with the inherited parent snapshot (see execute()).
	runForSubExecution: true,
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
	 *
	 * For a sub-workflow the context also carries the snapshot inherited from the
	 * parent execution; it is folded in the same way, so the child's own record is
	 * redacted per its own policy while still inheriting the parent's redaction
	 * (top-down escalation). Root executions carry no inherited snapshot, so it is
	 * a no-op there.
	 */
	async execute(options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
		const floor = await this.instanceRedactionEnforcementService.get();
		const workflow = policyToChannels(options.workflow.settings?.redactionPolicy ?? 'none');
		const inherited = redactionSettingToChannels(options.context?.redaction);

		const floorEnforcesProduction = floor !== 'off';
		const floorEnforcesManual = floor === 'all';

		const manual = workflow.manual || floorEnforcesManual || inherited.manual;
		// Manual redaction implies production redaction (IAM-697 + floor normalization
		// already guarantee this; the clamp keeps the captured snapshot valid regardless).
		//
		// Migration note: a legacy workflow persisted with the now-disallowed
		// `manual-only` policy (manual without production) is captured here as
		// `{ production: true, manual: true }`, i.e. upgraded to `all`. New executions of
		// such a workflow therefore redact production data that the old `manual-only`
		// resolution left revealable. This is the intended fail-safe direction of the
		// manual-implies-production invariant; past executions keep their V1 snapshot.
		const production =
			workflow.production || floorEnforcesProduction || manual || inherited.production;

		// Attribution: `'instance'` when the floor enforced redaction the workflow did
		// not ask for, `'workflow'` otherwise. The workflow's manual-implies-production
		// clamp is workflow-side, so a manual-only workflow that produces production
		// redaction is still attributed to the workflow, not the floor. Redaction a
		// sub-workflow inherited from its parent alone is left attributed to the
		// workflow (there is no `'parent'` source); `source` is telemetry only and
		// does not affect reveal permissions, which read the channels.
		const floorRaisedTheBar =
			(floorEnforcesProduction && !workflow.production) ||
			(floorEnforcesManual && !workflow.manual);
		const source: RedactionSource = floorRaisedTheBar ? 'instance' : 'workflow';

		return {
			contextUpdate: {
				redaction: {
					version: 2,
					production,
					manual,
					source,
				},
			},
		};
	}
}
