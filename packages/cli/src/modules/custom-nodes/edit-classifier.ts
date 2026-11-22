import type {
	CustomActionDraft,
	CustomActionEditKind,
	CustomActionInput,
	CustomActionRequest,
} from '@n8n/api-types';
import { UnexpectedError } from '@n8n/errors';
import isEqual from 'lodash/isEqual';

/**
 * Decides how the server stores an edit of a custom action.
 *
 * A wrong answer is costly. A contract change stored as a revision breaks running workflows.
 * A revision stored as a version creates needless versions.
 */

/** An input as stored in a version. Target and key belong to the revision. */
export type StoredInput = Omit<CustomActionInput, 'target' | 'key'>;

export type StoredRequest = CustomActionRequest & {
	inputTargets: Record<string, { target: CustomActionInput['target']; key: string }>;
};

export function splitDraft(draft: CustomActionDraft): {
	inputs: StoredInput[];
	request: StoredRequest;
} {
	const inputTargets: StoredRequest['inputTargets'] = {};
	const inputs = draft.inputs.map(({ target, key, ...rest }) => {
		inputTargets[rest.name] = { target, key };
		return rest;
	});
	return { inputs, request: { ...draft.request, inputTargets } };
}

export function joinDraft(
	meta: { name: string; description?: string },
	inputs: StoredInput[],
	request: StoredRequest,
): CustomActionDraft {
	const { inputTargets, ...requestRest } = request;
	return {
		name: meta.name,
		...(meta.description !== undefined && { description: meta.description }),
		inputs: inputs.map((input) => {
			const placement = inputTargets[input.name];
			if (!placement) {
				throw new UnexpectedError(`The stored request has no target for input "${input.name}"`);
			}
			return { ...input, target: placement.target, key: placement.key };
		}),
		request: requestRest,
	};
}

/** The part of an input that nodes depend on. Option names and `options` of other types do not count. */
function contractOf(input: CustomActionInput) {
	return {
		type: input.type,
		required: input.required,
		default: input.default,
		optionValues:
			input.type === 'options'
				? [...new Set((input.options ?? []).map((o) => o.value))].sort()
				: [],
	};
}

const byName = (inputs: CustomActionInput[]) => new Map(inputs.map((i) => [i.name, i]));

function sameContract(current: CustomActionDraft, next: CustomActionDraft): boolean {
	const a = byName(current.inputs);
	const b = byName(next.inputs);
	if (a.size !== b.size) return false;
	for (const [name, input] of a) {
		const other = b.get(name);
		// Both contracts always carry a `default` key, so undefined and missing compare equal.
		if (!other || !isEqual(contractOf(input), contractOf(other))) return false;
	}
	return true;
}

function sameRevision(current: CustomActionDraft, next: CustomActionDraft): boolean {
	if (!isEqual(current.request, next.request)) return false;
	const b = byName(next.inputs);
	return current.inputs.every((input) => {
		const other = b.get(input.name);
		return other?.target === input.target && other.key === input.key;
	});
}

const optionNames = (input: CustomActionInput) =>
	input.type === 'options'
		? Object.fromEntries((input.options ?? []).map((o) => [o.value, o.name]))
		: {};

function sameDisplay(current: CustomActionDraft, next: CustomActionDraft): boolean {
	if (current.name !== next.name || current.description !== next.description) return false;
	if (
		!isEqual(
			current.inputs.map((i) => i.name),
			next.inputs.map((i) => i.name),
		)
	)
		return false;
	const b = byName(next.inputs);
	return current.inputs.every((input) => {
		const other = b.get(input.name);
		return (
			other?.displayName === input.displayName &&
			other.description === input.description &&
			isEqual(optionNames(input), optionNames(other))
		);
	});
}

export function classifyEdit(
	current: CustomActionDraft,
	next: CustomActionDraft,
): CustomActionEditKind {
	if (!sameContract(current, next)) return 'version';
	if (!sameRevision(current, next)) return 'revision';
	if (!sameDisplay(current, next)) return 'cosmetic';
	return 'none';
}
