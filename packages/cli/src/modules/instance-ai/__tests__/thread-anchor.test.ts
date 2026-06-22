import type { ThreadAnchor } from '@n8n/instance-ai';

import {
	deriveThreadAnchor,
	isSubstantiveGoal,
	parseThreadAnchor,
	threadAnchorsEqual,
} from '../thread-anchor';

describe('thread-anchor', () => {
	describe('isSubstantiveGoal', () => {
		it('accepts real user intent', () => {
			expect(isSubstantiveGoal('Send an SMS on missed calls')).toBe(true);
		});

		it.each([
			['empty', ''],
			['whitespace', '   '],
			['undefined', undefined],
			['system follow-up tag', '<workflow-setup-required>\n{}\n'],
			['bare continue', '(continue)'],
		])('rejects %s', (_label, message) => {
			expect(isSubstantiveGoal(message)).toBe(false);
		});
	});

	describe('deriveThreadAnchor', () => {
		it('captures the first substantive message as the original goal', () => {
			const anchor = deriveThreadAnchor(undefined, { userMessage: 'Build a missed-call SMS flow' });
			expect(anchor.originalGoal).toBe('Build a missed-call SMS flow');
		});

		it('keeps the original goal once set, ignoring later messages', () => {
			const prev: ThreadAnchor = { originalGoal: 'Original goal' };
			const next = deriveThreadAnchor(prev, { userMessage: 'something else entirely' });
			expect(next.originalGoal).toBe('Original goal');
		});

		it('does not set a goal from a system follow-up turn', () => {
			const anchor = deriveThreadAnchor(undefined, {
				userMessage: '<planned-task-follow-up type="build-workflow">',
			});
			expect(anchor.originalGoal).toBeUndefined();
		});

		it('truncates an over-long goal', () => {
			const long = 'x'.repeat(5000);
			const anchor = deriveThreadAnchor(undefined, { userMessage: long });
			expect(anchor.originalGoal).toHaveLength(2000);
			expect(anchor.originalGoal?.endsWith('…')).toBe(true);
		});

		it('merges built workflow ids, de-duplicated and order-stable', () => {
			const first = deriveThreadAnchor(undefined, { builtWorkflowIds: ['wf-1', 'wf-2'] });
			const second = deriveThreadAnchor(first, { builtWorkflowIds: ['wf-2', 'wf-3'] });
			expect(second.builtWorkflows).toEqual([{ id: 'wf-1' }, { id: 'wf-2' }, { id: 'wf-3' }]);
		});

		it('captures goal and workflows in the same turn', () => {
			const anchor = deriveThreadAnchor(undefined, {
				userMessage: 'Build it',
				builtWorkflowIds: ['wf-1'],
			});
			expect(anchor).toEqual({ originalGoal: 'Build it', builtWorkflows: [{ id: 'wf-1' }] });
		});
	});

	describe('parseThreadAnchor', () => {
		it('round-trips a derived anchor', () => {
			const anchor = deriveThreadAnchor(undefined, {
				userMessage: 'Goal',
				builtWorkflowIds: ['wf-1'],
			});
			expect(parseThreadAnchor(anchor)).toEqual(anchor);
		});

		it.each([
			['null', null],
			['string', 'nope'],
			['empty object', {}],
			['unrelated keys', { foo: 'bar' }],
		])('returns undefined for %s', (_label, value) => {
			expect(parseThreadAnchor(value)).toBeUndefined();
		});

		it('drops malformed workflow entries', () => {
			const parsed = parseThreadAnchor({
				originalGoal: 'Goal',
				builtWorkflows: [{ id: 'wf-1', name: 'Flow' }, { id: 42 }, 'bad', { name: 'no-id' }],
			});
			expect(parsed).toEqual({
				originalGoal: 'Goal',
				builtWorkflows: [{ id: 'wf-1', name: 'Flow' }],
			});
		});
	});

	describe('threadAnchorsEqual', () => {
		it('treats undefined prev and empty derived anchor as equal (no write)', () => {
			const next = deriveThreadAnchor(undefined, { userMessage: '<system>' });
			expect(threadAnchorsEqual(undefined, next)).toBe(true);
		});

		it('detects a changed anchor', () => {
			const prev: ThreadAnchor = { originalGoal: 'a' };
			const next = deriveThreadAnchor(prev, { builtWorkflowIds: ['wf-1'] });
			expect(threadAnchorsEqual(prev, next)).toBe(false);
		});
	});
});
