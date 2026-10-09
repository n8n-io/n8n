import type { InstanceAiThreadRunTarget } from '@n8n/api-types';
import fc from 'fast-check';

import {
	keepFirstRunTarget,
	LOCAL_RUN_TARGET,
	lostRunTargetOf,
	storedRunTargetOf,
	withTurnDefaults,
	withoutLostRunTarget,
	withoutServerMetadata,
} from '../run-target';

const LINK_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';
const OTHER_LINK_ID = '0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d';

describe('storedRunTargetOf', () => {
	it('reads a stored local target and a stored linked target', () => {
		expect(storedRunTargetOf({ runTarget: { kind: 'local' } })).toEqual({ kind: 'local' });
		expect(
			storedRunTargetOf({ runTarget: { kind: 'linked', instanceId: LINK_ID, name: 'Cloud' } }),
		).toEqual({ kind: 'linked', instanceId: LINK_ID, name: 'Cloud' });
	});

	it('returns undefined when the defaults have no target', () => {
		expect(storedRunTargetOf(undefined)).toBeUndefined();
		expect(storedRunTargetOf('not an object')).toBeUndefined();
		expect(storedRunTargetOf({ timeZone: 'Europe/Helsinki' })).toBeUndefined();
	});

	it.each([
		['an unknown kind', { kind: 'remote', instanceId: LINK_ID, name: 'Cloud' }],
		['a linked target without a name', { kind: 'linked', instanceId: LINK_ID }],
		[
			'a linked target with an id that is not a uuid',
			{ kind: 'linked', instanceId: 'x', name: 'C' },
		],
		['a linked target with an empty name', { kind: 'linked', instanceId: LINK_ID, name: '' }],
	])('returns undefined for %s', (_label, runTarget) => {
		expect(storedRunTargetOf({ runTarget })).toBeUndefined();
	});

	it('round-trips every valid target (property)', () => {
		const targetArb = fc.oneof(
			fc.constant<InstanceAiThreadRunTarget>({ kind: 'local' }),
			fc
				.record({
					instanceId: fc.uuid(),
					name: fc.string({ minLength: 1, maxLength: 64 }),
				})
				.map(
					({ instanceId, name }): InstanceAiThreadRunTarget => ({
						kind: 'linked',
						instanceId,
						name,
					}),
				),
		);
		fc.assert(
			fc.property(targetArb, (target) => {
				expect(storedRunTargetOf({ runTarget: target })).toEqual(target);
			}),
		);
	});
});

describe('keepFirstRunTarget', () => {
	it('keeps the stored target over the first one', () => {
		const stored = { runTarget: { kind: 'linked', instanceId: LINK_ID, name: 'Cloud' } };
		expect(keepFirstRunTarget(stored, LOCAL_RUN_TARGET)).toEqual(stored.runTarget);
	});

	it('uses the first target when nothing is stored', () => {
		const first = { kind: 'linked', instanceId: OTHER_LINK_ID, name: 'Office' } as const;
		expect(keepFirstRunTarget(undefined, first)).toEqual(first);
	});

	it('falls back to local when neither exists', () => {
		expect(keepFirstRunTarget({ timeZone: 'UTC' }, undefined)).toEqual(LOCAL_RUN_TARGET);
	});

	it('never changes a stored target, whatever the new value is (property)', () => {
		const storedArb = fc.record({
			instanceId: fc.uuid(),
			name: fc.string({ minLength: 1, maxLength: 64 }),
		});
		const firstArb = fc.oneof(
			fc.constant<InstanceAiThreadRunTarget>({ kind: 'local' }),
			fc.record({ instanceId: fc.uuid(), name: fc.string({ minLength: 1, maxLength: 64 }) }).map(
				({ instanceId, name }): InstanceAiThreadRunTarget => ({
					kind: 'linked',
					instanceId,
					name,
				}),
			),
		);
		fc.assert(
			fc.property(storedArb, firstArb, (stored, first) => {
				const current = { runTarget: { kind: 'linked', ...stored } };
				expect(keepFirstRunTarget(current, first)).toEqual({ kind: 'linked', ...stored });
			}),
		);
	});
});

describe('withoutServerMetadata', () => {
	it('returns undefined for a missing write', () => {
		expect(withoutServerMetadata(undefined)).toBeUndefined();
	});

	it('removes assistant keys and keeps the others', () => {
		expect(
			withoutServerMetadata({
				assistantTurnDefaults: { runTarget: { kind: 'local' } },
				assistantLiveRun: {},
				titleRefined: true,
				source: 'assistant_page',
			}),
		).toEqual({ titleRefined: true, source: 'assistant_page' });
	});

	it('keeps keys that only contain the word in another position', () => {
		expect(withoutServerMetadata({ myassistant: 1, Assistant: 2 })).toEqual({
			myassistant: 1,
			Assistant: 2,
		});
	});

	it('leaves no key that starts with assistant, and keeps every other key (property)', () => {
		const keyArb = fc.oneof(
			fc.string(),
			fc.string().map((suffix) => `assistant${suffix}`),
		);
		const metadataArb = fc.dictionary(keyArb, fc.jsonValue());
		fc.assert(
			fc.property(metadataArb, (metadata) => {
				const result = withoutServerMetadata(metadata) ?? {};
				const keys = Object.keys(result);
				expect(keys.some((key) => key.startsWith('assistant'))).toBe(false);
				const expectedKeys = Object.keys(metadata).filter((key) => !key.startsWith('assistant'));
				expect(keys.sort()).toEqual(expectedKeys.sort());
				for (const key of expectedKeys) expect(result[key]).toEqual(metadata[key]);
			}),
		);
	});
});

describe('withTurnDefaults', () => {
	const stored: InstanceAiThreadRunTarget = { kind: 'linked', instanceId: LINK_ID, name: 'Office' };

	it('keeps the stored run target over the target of the new turn', () => {
		const result = withTurnDefaults(
			{ assistantTurnDefaults: { runTarget: stored, pushRef: 'old' } },
			{ timeZone: 'Europe/Helsinki', runTarget: LOCAL_RUN_TARGET },
		);

		expect(result).toEqual({
			assistantTurnDefaults: { timeZone: 'Europe/Helsinki', runTarget: stored },
		});
	});

	it('takes the target of the new turn when none is stored, and keeps the other metadata', () => {
		const result = withTurnDefaults(
			{ source: 'assistant_page', assistantTurnDefaults: { timeZone: 'UTC' } },
			{ timeZone: 'Europe/Helsinki', runTarget: stored },
		);

		expect(result).toEqual({
			source: 'assistant_page',
			assistantTurnDefaults: { timeZone: 'Europe/Helsinki', runTarget: stored },
		});
	});

	it('stores local when neither the stored defaults nor the turn has a target', () => {
		expect(withTurnDefaults(undefined, { timeZone: 'UTC' })).toEqual({
			assistantTurnDefaults: { timeZone: 'UTC', runTarget: LOCAL_RUN_TARGET },
		});
	});

	it('never changes a stored target and always replaces the other defaults (property)', () => {
		const targetArb = fc.oneof(
			fc.constant<InstanceAiThreadRunTarget>({ kind: 'local' }),
			fc.record({ instanceId: fc.uuid(), name: fc.string({ minLength: 1, maxLength: 64 }) }).map(
				({ instanceId, name }): InstanceAiThreadRunTarget => ({
					kind: 'linked',
					instanceId,
					name,
				}),
			),
		);
		fc.assert(
			fc.property(
				targetArb,
				fc.option(targetArb, { nil: undefined }),
				fc.string(),
				(storedTarget, turnTarget, timeZone) => {
					const result = withTurnDefaults(
						{ assistantTurnDefaults: { runTarget: storedTarget, pushRef: 'old' } },
						{ timeZone, runTarget: turnTarget },
					);
					expect(result.assistantTurnDefaults).toEqual({ timeZone, runTarget: storedTarget });
				},
			),
		);
	});
});

describe('lostRunTargetOf', () => {
	it('reads the name of the link that the chat lost', () => {
		expect(lostRunTargetOf({ assistantRunTargetLost: { name: 'Office' } })).toEqual({
			name: 'Office',
		});
	});

	it.each([
		['no metadata', undefined],
		['no marker', { assistantTurnDefaults: { runTarget: LOCAL_RUN_TARGET } }],
		['a marker without a name', { assistantRunTargetLost: {} }],
		['a marker with an empty name', { assistantRunTargetLost: { name: '' } }],
		['a marker that is not an object', { assistantRunTargetLost: 'Office' }],
	])('returns undefined for %s', (_label, metadata) => {
		expect(lostRunTargetOf(metadata)).toBeUndefined();
	});
});

describe('withoutLostRunTarget', () => {
	it('removes the lost link marker and keeps every other key', () => {
		const metadata = {
			title: 'Chat',
			assistantRunTargetLost: { name: 'Office' },
			assistantTurnDefaults: { runTarget: LOCAL_RUN_TARGET },
		};

		expect(withoutLostRunTarget(metadata)).toEqual({
			title: 'Chat',
			assistantTurnDefaults: { runTarget: LOCAL_RUN_TARGET },
		});
	});
});
