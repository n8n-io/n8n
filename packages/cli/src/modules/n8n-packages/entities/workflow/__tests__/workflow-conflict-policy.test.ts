import type { WorkflowEntity } from '@n8n/db';

import { decideWorkflowConflictAction } from '../workflow-conflict-policy';

const existing = { id: 'local-1', name: 'Existing' } as WorkflowEntity;

describe('decideWorkflowConflict', () => {
	describe('fail', () => {
		it('blocks when a workflow already exists', () => {
			expect(decideWorkflowConflictAction('fail', existing)).toEqual({
				action: 'create',
				blocked: true,
			});
		});

		it('creates without blocking when none exists', () => {
			expect(decideWorkflowConflictAction('fail', null)).toEqual({
				action: 'create',
				blocked: false,
			});
		});
	});

	describe('skip', () => {
		it('skips an existing workflow, never blocking', () => {
			expect(decideWorkflowConflictAction('skip', existing)).toEqual({
				action: 'skip',
				blocked: false,
			});
		});

		it('creates when none exists', () => {
			expect(decideWorkflowConflictAction('skip', null)).toEqual({
				action: 'create',
				blocked: false,
			});
		});
	});

	describe('new-version', () => {
		it('updates an existing workflow, never blocking', () => {
			expect(decideWorkflowConflictAction('new-version', existing)).toEqual({
				action: 'update',
				blocked: false,
			});
		});

		it('creates when none exists', () => {
			expect(decideWorkflowConflictAction('new-version', null)).toEqual({
				action: 'create',
				blocked: false,
			});
		});
	});
});
