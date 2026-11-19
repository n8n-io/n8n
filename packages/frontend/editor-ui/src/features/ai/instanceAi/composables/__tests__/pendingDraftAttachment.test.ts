import { describe, it, expect } from 'vitest';
import {
	stashPendingDraftAttachment,
	consumePendingDraftAttachment,
} from '../useInstanceAiHandoff';

describe('pending draft attachment stash', () => {
	it('round-trips a multi-set draft and clears after one consume', () => {
		const sets = [{ nodes: [{ id: 'n1', name: 'A' }] }, { nodes: [{ id: 'n2', name: 'B' }] }];
		stashPendingDraftAttachment('t1', sets, 'w1');
		const first = consumePendingDraftAttachment('t1');
		expect(first).toMatchObject({ type: 'nodes', workflowId: 'w1', sets });
		expect(consumePendingDraftAttachment('t1')).toBeNull();
	});

	it('returns null when nothing was stashed', () => {
		expect(consumePendingDraftAttachment('missing')).toBeNull();
	});
});
