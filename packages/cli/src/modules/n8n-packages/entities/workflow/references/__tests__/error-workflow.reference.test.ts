import type { WorkflowEntity } from '@n8n/db';

import type { PackageImportBindings } from '../../../../n8n-packages.types';
import { errorWorkflowReference } from '../error-workflow.reference';

const workflow = (errorWorkflow: unknown, id = 'parent'): WorkflowEntity =>
	({ id, settings: { errorWorkflow } }) as WorkflowEntity;
const bindings = (workflows: Map<string, string>): PackageImportBindings => ({
	workflows,
	credentials: new Map(),
});

describe('errorWorkflowReference', () => {
	describe('extract', () => {
		it('returns the static errorWorkflow id as a requirement', () => {
			expect(errorWorkflowReference.extract(workflow('child'))).toEqual([
				{ workflowId: 'parent', referencedWorkflowId: 'child' },
			]);
		});

		it('ignores DEFAULT and expressions', () => {
			expect(errorWorkflowReference.extract(workflow('DEFAULT'))).toEqual([]);
			expect(errorWorkflowReference.extract(workflow('={{ $vars.ERROR_WF }}'))).toEqual([]);
		});

		it('ignores a missing or non-string errorWorkflow', () => {
			expect(
				errorWorkflowReference.extract({ id: 'parent', settings: {} } as WorkflowEntity),
			).toEqual([]);
			expect(errorWorkflowReference.extract(workflow(42))).toEqual([]);
		});
	});

	describe('apply', () => {
		it('remaps a known errorWorkflow id and keeps an unknown one', () => {
			const known = workflow('child');
			errorWorkflowReference.apply(known, bindings(new Map([['child', 'C']])));
			expect(known.settings?.errorWorkflow).toBe('C');

			const unknown = workflow('external');
			errorWorkflowReference.apply(unknown, bindings(new Map([['child', 'C']])));
			expect(unknown.settings?.errorWorkflow).toBe('external');
		});

		it('leaves the DEFAULT sentinel untouched', () => {
			const wf = workflow('DEFAULT');
			errorWorkflowReference.apply(wf, bindings(new Map([['DEFAULT', 'X']])));
			expect(wf.settings?.errorWorkflow).toBe('DEFAULT');
		});
	});
});
