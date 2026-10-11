import type { INode } from 'n8n-workflow';

import { computeTriggerDiff } from '@/workflows/publication/trigger-diff';

describe('computeTriggerDiff', () => {
	function makeNode(id: string, overrides: Partial<INode> = {}): INode {
		return {
			id,
			name: id,
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		};
	}

	test('returns empty diff when trigger sets are identical', () => {
		const a = makeNode('a');

		const diff = computeTriggerDiff([a], [{ ...a }]);

		expect(diff).toEqual({ toAdd: new Set(), toRemove: new Set() });
	});

	test('detects added triggers', () => {
		const diff = computeTriggerDiff([makeNode('a')], [makeNode('a'), makeNode('b')]);

		expect(diff).toEqual({ toAdd: new Set(['b']), toRemove: new Set() });
	});

	test('detects removed triggers', () => {
		const diff = computeTriggerDiff([makeNode('a'), makeNode('b')], [makeNode('a')]);

		expect(diff).toEqual({ toAdd: new Set(), toRemove: new Set(['b']) });
	});

	test('treats a parameter change as a modification (remove-then-add)', () => {
		const before = makeNode('a', { parameters: { interval: 1 } });
		const after = makeNode('a', { parameters: { interval: 5 } });

		const diff = computeTriggerDiff([before], [after]);

		expect(diff).toEqual({ toAdd: new Set(['a']), toRemove: new Set(['a']) });
	});

	test('ignores changes to settings that do not affect registration', () => {
		const before = makeNode('a');
		const after = makeNode('a', {
			notes: 'some note',
			onError: 'continueRegularOutput',
			retryOnFail: true,
		});

		const diff = computeTriggerDiff([before], [after]);

		expect(diff).toEqual({ toAdd: new Set(), toRemove: new Set() });
	});

	test('treats a typeVersion change as a modification', () => {
		const diff = computeTriggerDiff(
			[makeNode('a', { typeVersion: 1 })],
			[makeNode('a', { typeVersion: 2 })],
		);

		expect(diff).toEqual({ toAdd: new Set(['a']), toRemove: new Set(['a']) });
	});

	test('handles a mix of added, removed, modified and unchanged triggers', () => {
		const unchanged = makeNode('unchanged');
		const removed = makeNode('removed');
		const modifiedBefore = makeNode('modified', { parameters: { value: 1 } });
		const modifiedAfter = makeNode('modified', { parameters: { value: 2 } });
		const added = makeNode('added');

		const diff = computeTriggerDiff(
			[unchanged, removed, modifiedBefore],
			[{ ...unchanged }, modifiedAfter, added],
		);

		expect(Array.from(diff.toAdd).sort()).toEqual(['added', 'modified']);
		expect(Array.from(diff.toRemove).sort()).toEqual(['modified', 'removed']);
	});

	test('returns empty diff for two empty trigger sets', () => {
		expect(computeTriggerDiff([], [])).toEqual({ toAdd: new Set(), toRemove: new Set() });
	});

	describe('triggers that are always re-registered on a version change', () => {
		const n8nTrigger = makeNode('n8n', {
			type: 'n8n-nodes-base.n8nTrigger',
			parameters: { events: ['update'] },
		});

		test('re-registers an unchanged n8n Trigger when the published version changed', () => {
			const diff = computeTriggerDiff([n8nTrigger], [{ ...n8nTrigger }], { versionChanged: true });

			expect(diff).toEqual({ toAdd: new Set(['n8n']), toRemove: new Set(['n8n']) });
		});

		test('leaves an unchanged n8n Trigger running when the published version is the same', () => {
			const diff = computeTriggerDiff([n8nTrigger], [{ ...n8nTrigger }], { versionChanged: false });

			expect(diff).toEqual({ toAdd: new Set(), toRemove: new Set() });
		});

		test('re-registers the deprecated Workflow Trigger the same way', () => {
			const workflowTrigger = makeNode('legacy', {
				type: 'n8n-nodes-base.workflowTrigger',
				parameters: { events: ['update'] },
			});

			const diff = computeTriggerDiff([workflowTrigger], [{ ...workflowTrigger }], {
				versionChanged: true,
			});

			expect(diff).toEqual({ toAdd: new Set(['legacy']), toRemove: new Set(['legacy']) });
		});

		test('re-registers an unchanged Email Trigger (IMAP) so a republish reconnects it', () => {
			const imapTrigger = makeNode('imap', {
				type: 'n8n-nodes-base.emailReadImap',
				typeVersion: 2.1,
				parameters: { mailbox: 'INBOX' },
			});

			const diff = computeTriggerDiff([imapTrigger], [{ ...imapTrigger }], {
				versionChanged: true,
			});

			expect(diff).toEqual({ toAdd: new Set(['imap']), toRemove: new Set(['imap']) });
		});

		test('re-registers an unchanged Postgres Trigger so a republish reconnects its LISTEN connection', () => {
			const postgresTrigger = makeNode('pg', {
				type: 'n8n-nodes-base.postgresTrigger',
				parameters: { triggerMode: 'listenTrigger', channelName: 'n8n_channel' },
			});

			const diff = computeTriggerDiff([postgresTrigger], [{ ...postgresTrigger }], {
				versionChanged: true,
			});

			expect(diff).toEqual({ toAdd: new Set(['pg']), toRemove: new Set(['pg']) });
		});

		test('does not force other unchanged trigger types when the published version changed', () => {
			const schedule = makeNode('a');

			const diff = computeTriggerDiff([schedule], [{ ...schedule }], { versionChanged: true });

			expect(diff).toEqual({ toAdd: new Set(), toRemove: new Set() });
		});
	});
});
