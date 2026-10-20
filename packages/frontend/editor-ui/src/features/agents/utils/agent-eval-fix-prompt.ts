import type { BaseTextKey } from '@n8n/i18n';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

import {
	MAX_FIX_WITH_ASSISTANT_DRAFT_LENGTH,
	sanitizeDiagnosticText,
	type FixWithAssistantI18n,
} from './fix-with-assistant';

/** One check as the Assistant reads it. */
export type AgentEvalFixCheck = {
	rule: string | null;
	sampleMessage: string;
	reply: string | null;
	judgeReason: string | null;
};

/** Keeps one long reply from taking the whole draft. */
const MAX_FIELD_LENGTH = 1_500;
/** The checks one draft carries. More would not fit the Assistant's prompt. */
const MAX_CHECKS = 10;
/** Room for the checks in the draft, with space left for the template. */
const CHECKS_BUDGET = MAX_FIX_WITH_ASSISTANT_DRAFT_LENGTH - 2_000;
const FIELDS_PER_CHECK = 4;
const BODY_SENTINEL = '__N8N_EVAL_FIX_BODY__';

function clean(text: string | null, limit = MAX_FIELD_LENGTH): string | null {
	if (text === null) return null;
	return scrubSecretsInText(sanitizeDiagnosticText(text.trim())).slice(0, limit);
}

/**
 * The sample message and the reply come from a model, so the block is fenced and
 * the template tells the Assistant to read it as data.
 */
function fenceChecks(checks: AgentEvalFixCheck[]): string {
	const sent = checks.slice(0, MAX_CHECKS);
	// Many checks share the budget, so each field gets less room.
	const limit = Math.min(
		MAX_FIELD_LENGTH,
		Math.floor(CHECKS_BUDGET / Math.max(sent.length * FIELDS_PER_CHECK, 1)),
	);
	const payload = sent.map((check) => ({
		rule: clean(check.rule, limit),
		sampleMessage: clean(check.sampleMessage, limit),
		reply: clean(check.reply, limit),
		judgeReason: clean(check.judgeReason, limit),
	}));
	return [
		'<untrusted_data source="agent-eval-checks">',
		JSON.stringify(payload, null, 2),
		'</untrusted_data>',
	].join('\n');
}

function render(
	i18n: FixWithAssistantI18n,
	key: BaseTextKey,
	interpolate: Record<string, string>,
	count: number,
	body: string,
): string {
	const template = i18n.baseText(key, {
		adjustToNumber: count,
		interpolate: { ...interpolate, count: String(count), checks: BODY_SENTINEL },
	});
	// A replacer function keeps `$&` and `$1` in the body literal.
	return template.replaceAll(BODY_SENTINEL, () => body);
}

/** The draft that asks the Assistant to fix every failing check with one change. */
export function buildEvalFixPrompt(checks: AgentEvalFixCheck[], i18n: FixWithAssistantI18n) {
	return render(
		i18n,
		'agents.builder.agentEvals.fixPrompt.all',
		{},
		checks.length,
		fenceChecks(checks),
	);
}

/**
 * The draft for a check the person says the judge got wrong. The Assistant
 * decides whether the rule or the agent's instructions need the change.
 */
export function buildEvalCorrectionPrompt(
	check: AgentEvalFixCheck,
	correction: string,
	i18n: FixWithAssistantI18n,
) {
	return render(
		i18n,
		'agents.builder.agentEvals.fixPrompt.correction',
		{ correction: clean(correction) ?? '' },
		1,
		fenceChecks([check]),
	);
}
