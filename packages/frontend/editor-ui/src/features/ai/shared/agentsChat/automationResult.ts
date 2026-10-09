import { automationProposalResultSchema, type AutomationPlace } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';

/**
 * Pure rules for the result of the n8n Assistant tool `propose_automation`. The chat summary of
 * the tool step and the answered automation card both read the result through these rules.
 */

export const PROPOSE_AUTOMATION_TOOL_NAME = 'propose_automation';

/** What a `propose_automation` result says about the workflow. */
export type AutomationResult =
	| {
			kind: 'kept';
			active: boolean;
			failed: boolean;
			/** Opens the workflow in the editor of the instance that runs it. Not checked yet. */
			url: string;
			/** Set when the workflow went to a linked instance. */
			place?: AutomationPlace;
			/** The copy is live there and the workflow here still runs too. */
			localStillOn?: true;
	  }
	/** Declined, or blocked by an admin before the first change: nothing was kept. */
	| { kind: 'refused' };

/** A declined or blocked capability answers `{ denied: true, message }`. */
function isDenied(output: unknown): boolean {
	return isRecord(output) && output.denied === true;
}

/** The outcome in a tool result, or undefined for any other value (for example the answer). */
export function automationResultOf(output: unknown): AutomationResult | undefined {
	if (isDenied(output)) return { kind: 'refused' };
	const parsed = automationProposalResultSchema.safeParse(output);
	if (!parsed.success) return undefined;
	const { active, error, url, place, localStillOn } = parsed.data;
	return {
		kind: 'kept',
		active,
		failed: error !== undefined,
		url,
		...(place && { place }),
		...(localStillOn === true && { localStillOn: true }),
	};
}

/**
 * The summary of a `propose_automation` tool step, from its result only. It names the state,
 * not the button: "Save" on a live workflow also gives `active: true`.
 */
export function summariseAutomationResult(output: unknown): BaseTextKey | undefined {
	const result = automationResultOf(output);
	if (result === undefined) return undefined;
	if (result.kind === 'refused') return 'instanceAi.automation.summary.declined';
	if (result.failed) {
		// A live copy in a linked instance with a problem is new there, so no "changes" are late.
		if (result.active && result.place?.kind === 'linked') {
			return 'instanceAi.automation.summary.needsCheck';
		}
		return result.active
			? 'instanceAi.automation.summary.notLive'
			: 'instanceAi.automation.summary.notOn';
	}
	return result.active ? 'instanceAi.automation.summary.on' : 'instanceAi.automation.summary.off';
}
