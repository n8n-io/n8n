import type { AgentProposalEvalCase } from '@n8n/api-types';
import { diffWords, type DiffSegment } from '@n8n/utils/diff-text';

export type AgentProposalFieldName = 'value' | 'input' | 'criteria' | 'expectedTools';

export type AgentProposalFieldChange = {
	field: AgentProposalFieldName;
	/** `null` when the side has no value. */
	before: DiffSegment[] | null;
	after: DiffSegment[] | null;
};

/** Separates the tools that a case must call from the tools that it must not call (`!name`). */
export function splitExpectedTools(expectedTools: string[]): {
	required: string[];
	forbidden: string[];
} {
	const required: string[] = [];
	const forbidden: string[] = [];
	for (const tool of expectedTools) {
		if (tool.startsWith('!')) forbidden.push(tool.slice(1));
		else required.push(tool);
	}
	return { required, forbidden };
}

const plain = (text: string | null): DiffSegment[] | null =>
	text === null || text === '' ? null : [{ text, changed: false }];

/** Marks the changed words of the two sides. A side without a value has no marks on the other side. */
export function fieldChange(
	field: AgentProposalFieldName,
	before: string | null,
	after: string | null,
): AgentProposalFieldChange {
	if (!before || !after) return { field, before: plain(before), after: plain(after) };

	const { from, to } = diffWords(before, after);
	return { field, before: from, after: to };
}

/**
 * The fields of an eval case change. An added case has all its fields with an empty `before`.
 * An updated case has only the fields that changed. When no field changed, it has all its fields.
 */
export function evalCaseFields(
	evalCase: AgentProposalEvalCase,
	formatTools: (expectedTools: string[]) => string,
): AgentProposalFieldChange[] {
	const tools = (expectedTools: string[]) =>
		expectedTools.length > 0 ? formatTools(expectedTools) : null;
	const before = evalCase.before;
	const fields = [
		fieldChange('input', before?.input ?? null, evalCase.input),
		fieldChange('criteria', before?.criteria ?? null, evalCase.criteria),
		fieldChange(
			'expectedTools',
			before ? tools(before.expectedTools) : null,
			tools(evalCase.expectedTools),
		),
	];

	const text = (segments: DiffSegment[] | null) =>
		segments?.map((segment) => segment.text).join('') ?? null;
	const withValue = fields.filter((change) => change.after !== null);
	if (!before) return withValue;

	const changed = fields.filter((change) => text(change.before) !== text(change.after));
	// An update that changes no field still shows the case, so the row is not empty.
	return changed.length > 0 ? changed : withValue;
}
