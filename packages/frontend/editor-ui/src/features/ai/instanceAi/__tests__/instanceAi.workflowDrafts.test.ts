import type { InstanceAiWorkflowDraftPayload } from '@n8n/api-types';
import { describe, expect, it } from 'vitest';

import {
	applyWorkflowDraft,
	applyWorkflowDraftIssues,
	dismissWorkflowDrafts,
	draftTabId,
	settleWorkflowDraft,
	type WorkflowDraftsByFilePath,
} from '../instanceAi.workflowDrafts';

const FILE = 'src/workflows/demo.workflow.ts';

function payload(overrides: Partial<InstanceAiWorkflowDraftPayload> = {}) {
	return {
		filePath: FILE,
		revision: 1,
		workflow: { name: 'Demo', nodes: [], connections: {} },
		...overrides,
	} satisfies InstanceAiWorkflowDraftPayload;
}

describe('workflow drafts', () => {
	describe('applyWorkflowDraftIssues', () => {
		const issues = [{ code: 'SET_INVALID_ASSIGNMENT', message: 'Bad', nodeName: 'Set' }];

		it('sets the issues on the draft revision they belong to', () => {
			const drafts = applyWorkflowDraft({}, payload({ revision: 2 }));

			const next = applyWorkflowDraftIssues(drafts, { filePath: FILE, revision: 2, issues });

			expect(next[FILE].issues).toEqual(issues);
		});

		it('drops issues of another revision or file', () => {
			const drafts = applyWorkflowDraft({}, payload({ revision: 2 }));

			expect(applyWorkflowDraftIssues(drafts, { filePath: FILE, revision: 1, issues })).toBe(
				drafts,
			);
			expect(applyWorkflowDraftIssues(drafts, { filePath: 'other.ts', revision: 2, issues })).toBe(
				drafts,
			);
		});

		it('clears the issues with the next revision', () => {
			const withIssues = applyWorkflowDraftIssues(applyWorkflowDraft({}, payload()), {
				filePath: FILE,
				revision: 1,
				issues,
			});

			expect(applyWorkflowDraft(withIssues, payload({ revision: 2 }))[FILE].issues).toBeUndefined();
		});
	});

	describe('applyWorkflowDraft', () => {
		it('keeps the run that made the draft', () => {
			expect(applyWorkflowDraft({}, payload(), 'run-7')[FILE].runId).toBe('run-7');
		});

		it('stores a draft by its file path', () => {
			const drafts = applyWorkflowDraft({}, payload());

			expect(drafts[FILE]).toMatchObject({ filePath: FILE, revision: 1 });
		});

		it('drops a draft older than the one it has', () => {
			const drafts = applyWorkflowDraft({}, payload({ revision: 3 }));

			expect(applyWorkflowDraft(drafts, payload({ revision: 2 }))).toBe(drafts);
		});

		it('treats a new draft after a save as unsaved again', () => {
			const saved = settleWorkflowDraft(applyWorkflowDraft({}, payload()), {
				success: true,
				filePath: FILE,
				workflowId: 'wf-1',
			});

			const drafts = applyWorkflowDraft(saved, payload({ revision: 2 }));

			expect(drafts[FILE].savedWorkflowId).toBeUndefined();
		});

		it('ignores an unsafe file path key', () => {
			expect(applyWorkflowDraft({}, payload({ filePath: '__proto__' }))).toEqual({});
		});
	});

	describe('settleWorkflowDraft', () => {
		const drafts = applyWorkflowDraft({}, payload());

		it('marks the draft of a file the build saved', () => {
			const settled = settleWorkflowDraft(drafts, {
				success: true,
				filePath: FILE,
				workflowId: 'wf-1',
			});

			expect(settled[FILE].savedWorkflowId).toBe('wf-1');
		});

		it.each([
			{ success: false, filePath: FILE, workflowId: 'wf-1' },
			{ success: true, filePath: 'src/workflows/other.workflow.ts', workflowId: 'wf-1' },
			{ success: true, filePath: FILE },
			'not a result',
		])('leaves the drafts as they are for %j', (result) => {
			expect(settleWorkflowDraft(drafts, result)).toBe(drafts);
		});
	});

	describe('dismissWorkflowDrafts', () => {
		it('removes the drafts that the given saved workflow replaced', () => {
			const other = 'src/workflows/other.workflow.ts';
			let drafts: WorkflowDraftsByFilePath = applyWorkflowDraft({}, payload());
			drafts = applyWorkflowDraft(drafts, payload({ filePath: other }));
			drafts = settleWorkflowDraft(drafts, { success: true, filePath: FILE, workflowId: 'wf-1' });

			const remaining = dismissWorkflowDrafts(drafts, 'wf-1');

			expect(Object.keys(remaining)).toEqual([other]);
		});

		it('keeps an unsaved draft of the same workflow', () => {
			const drafts = applyWorkflowDraft({}, payload({ workflowId: 'wf-1' }));

			expect(dismissWorkflowDrafts(drafts, 'wf-1')).toBe(drafts);
		});
	});

	it('gives each draft file its own tab id', () => {
		expect(draftTabId(FILE)).not.toBe(draftTabId('src/workflows/other.workflow.ts'));
	});
});
