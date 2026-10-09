import { LINKED_INSTANCE_STATUSES, type LinkedInstanceSummary } from '@n8n/api-types';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
	isLinkedRunTarget,
	LOCAL_RUN_TARGET_ID,
	runTargetChipName,
	runTargetOptions,
	runTargetPlace,
	type RunTargetTranslate,
} from '../runTargetOptions';

const translate: RunTargetTranslate = (key) => key;

const linkArb: fc.Arbitrary<LinkedInstanceSummary> = fc.record({
	id: fc.uuid(),
	name: fc.string({ minLength: 1, maxLength: 64 }),
	baseUrl: fc.constant('https://cloud.example.test'),
	status: fc.constantFrom(...LINKED_INSTANCE_STATUSES),
	lastVerifiedAt: fc.constant(null),
	createdAt: fc.constant('2026-10-01T00:00:00.000Z'),
	defaultRemoteProject: fc.constant(null),
});

/** Links with distinct ids, as the server lists them. */
const linksArb = fc.uniqueArray(linkArb, { selector: ({ id }) => id, maxLength: 8 });

describe('runTargetOptions (property)', () => {
	it('lists this computer first and then one option per link, in order', () => {
		fc.assert(
			fc.property(linksArb, (links) => {
				const options = runTargetOptions(links, translate);

				expect(options).toHaveLength(links.length + 1);
				expect(options[0].id).toBe(LOCAL_RUN_TARGET_ID);
				expect(options.slice(1).map(({ id }) => id)).toEqual(links.map(({ id }) => id));
			}),
		);
	});

	it('enables a link exactly when it is online', () => {
		fc.assert(
			fc.property(linksArb, (links) => {
				const options = runTargetOptions(links, translate).slice(1);

				options.forEach((option, index) => {
					expect(option.disabled).toBe(links[index].status !== 'online');
				});
			}),
		);
	});

	it('targets each link by its own id and never by the id of this computer', () => {
		fc.assert(
			fc.property(linksArb, (links) => {
				const options = runTargetOptions(links, translate);

				options.slice(1).forEach((option, index) => {
					expect(option.id).not.toBe(LOCAL_RUN_TARGET_ID);
					expect(option.target).toEqual({ kind: 'linked', instanceId: links[index].id });
				});
				expect(options[0].target).toEqual({ kind: 'local' });
			}),
		);
	});

	it('names the chosen link by its id, which the list holds once', () => {
		fc.assert(
			fc.property(linksArb, (links) => {
				fc.pre(links.length > 0);
				const chosen = links[links.length - 1];

				expect(runTargetPlace({ kind: 'linked', instanceId: chosen.id }, links, translate)).toBe(
					chosen.name,
				);
			}),
		);
	});

	it('shows a chip only for a linked chat that is not shared', () => {
		fc.assert(
			fc.property(
				fc.oneof(
					fc.constant(undefined),
					fc.constant({ kind: 'local' as const }),
					fc.record({
						kind: fc.constant('linked' as const),
						instanceId: fc.uuid(),
						name: fc.string({ minLength: 1, maxLength: 64 }),
					}),
				),
				fc.boolean(),
				(runTarget, isShared) => {
					const name = runTargetChipName(runTarget, isShared);

					if (runTarget?.kind === 'linked' && !isShared) {
						expect(name).toBe(runTarget.name);
					} else {
						expect(name).toBeUndefined();
					}
				},
			),
		);
	});

	it('recognises a linked target only when it names a link by a uuid', () => {
		fc.assert(
			fc.property(fc.uuid(), fc.string({ maxLength: 35 }), (instanceId, shortId) => {
				expect(isLinkedRunTarget({ kind: 'linked', instanceId })).toBe(true);
				expect(isLinkedRunTarget({ kind: 'local', instanceId })).toBe(false);
				// A uuid has 36 characters, so a shorter id never names a link.
				expect(isLinkedRunTarget({ kind: 'linked', instanceId: shortId })).toBe(false);
			}),
		);
	});
});
