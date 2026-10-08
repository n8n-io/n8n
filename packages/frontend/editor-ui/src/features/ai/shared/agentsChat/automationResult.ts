import { automationProposalResultSchema } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';
import { isRecord } from '@n8n/utils/is-record';

/**
 * Pure rules for the result of the n8n Assistant tool `propose_automation`. The chat summary of
 * the tool step and the answered automation card both read the result through these rules.
 */

export const PROPOSE_AUTOMATION_TOOL_NAME = 'propose_automation';

/** What a `propose_automation` result says about the workflow. */
export type AutomationResult =
	| { kind: 'kept'; active: boolean; failed: boolean }
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
	return { kind: 'kept', active: parsed.data.active, failed: parsed.data.error !== undefined };
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
		return result.active
			? 'instanceAi.automation.summary.notLive'
			: 'instanceAi.automation.summary.notOn';
	}
	return result.active ? 'instanceAi.automation.summary.on' : 'instanceAi.automation.summary.off';
}
