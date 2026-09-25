import { describe, expect, it } from 'vitest';
import { INSTANCE_AI_THREAD_SOURCE_FALLBACK } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import {
	INSTANCE_AI_PREFILL_TYPE_FALLBACK,
	INSTANCE_AI_PREFILL_TYPES,
	isInstanceAiPrefillType,
	isMessageAuthorship,
} from '../prefills';

describe('isInstanceAiPrefillType', () => {
	it('accepts every registered pre-fill type', () => {
		for (const type of INSTANCE_AI_PREFILL_TYPES) {
			expect(isInstanceAiPrefillType(type)).toBe(true);
		}
	});

	it.each([['template_prefill'], [''], [null], [undefined], [42]])(
		'rejects %s',
		(value: unknown) => {
			expect(isInstanceAiPrefillType(value)).toBe(false);
		},
	);

	// The fallback is reportable but not declarable, so a new surface cannot pick it.
	it('rejects the read-path fallback', () => {
		expect(isInstanceAiPrefillType(INSTANCE_AI_PREFILL_TYPE_FALLBACK)).toBe(false);
	});
});

describe('isMessageAuthorship', () => {
	it('accepts a user-typed authorship', () => {
		expect(isMessageAuthorship({ kind: 'user_typed' })).toBe(true);
	});

	it('accepts a pre-fill authorship with a registered type', () => {
		expect(isMessageAuthorship({ kind: 'prefill', prefillType: 'handoff_fix_with_ai' })).toBe(true);
	});

	// A stash written by an older deploy, or a hand-edited one, must not be trusted:
	// an unrecognised type would reach telemetry and break the enum downstream.
	it('rejects a pre-fill authorship carrying an unregistered type', () => {
		expect(isMessageAuthorship({ kind: 'prefill', prefillType: 'template_prefill' })).toBe(false);
	});

	it('rejects a pre-fill authorship with no type at all', () => {
		expect(isMessageAuthorship({ kind: 'prefill' })).toBe(false);
	});

	it.each([[null], [undefined], ['user_typed'], [{ kind: 'something_else' }]])(
		'rejects %s',
		(value: unknown) => {
			expect(isMessageAuthorship(value)).toBe(false);
		},
	);
});

// `@n8n/api-types` owns the list and the registry builds its enum from it, so
// these check the wiring rather than guarding drift: that `prefill_type` really
// is the shared enum (not a loose string), that it admits the read-path
// fallback, and that it still rejects a value nobody defines.
describe('the prefill_type property on the message event', () => {
	const event = TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_BUILDER_MESSAGE;
	const payload = {
		thread_id: 'thread-1',
		instance_id: 'instance-1',
		is_first_message: true,
		action_source: 'assistant_page',
		prefill_id: null,
		prompt_modified: false,
		mention_count: 0,
		workflow_mention_count: 0,
		node_mention_count: 0,
		group_mention_count: 0,
		attachment_count: 0,
	};

	it.each([...INSTANCE_AI_PREFILL_TYPES, INSTANCE_AI_PREFILL_TYPE_FALLBACK].map((t) => [t]))(
		'accepts %s',
		(prefillType: string) => {
			expect(event.getValidationError({ ...payload, prefill_type: prefillType })).toBeNull();
		},
	);

	it('accepts a null prefill_type for a message the user typed', () => {
		expect(
			event.getValidationError({ ...payload, prefill_type: null, prompt_modified: null }),
		).toBeNull();
	});

	it('rejects a prefill_type nothing defines', () => {
		expect(
			event.getValidationError({ ...payload, prefill_type: 'template_prefill' }),
		).not.toBeNull();
	});

	it('accepts the legacy action_source fallback', () => {
		expect(
			event.getValidationError({
				...payload,
				action_source: INSTANCE_AI_THREAD_SOURCE_FALLBACK,
				prefill_type: null,
			}),
		).toBeNull();
	});
});
