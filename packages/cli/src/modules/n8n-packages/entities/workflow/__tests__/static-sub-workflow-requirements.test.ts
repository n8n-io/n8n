import { PackageExportBlockedError } from '../../package-export.errors';
import { assertStaticSubWorkflowsIncluded } from '../static-sub-workflow-requirements';

describe('assertStaticSubWorkflowsIncluded', () => {
	it('allows complete static sub-workflow dependency sets', () => {
		expect(() =>
			assertStaticSubWorkflowsIncluded(
				[{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-child' }],
				new Set(['wf-parent', 'wf-child']),
			),
		).not.toThrow();
	});

	it('blocks missing static sub-workflow dependencies', () => {
		expect(() =>
			assertStaticSubWorkflowsIncluded(
				[{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-child' }],
				new Set(['wf-parent']),
			),
		).toThrow(PackageExportBlockedError);
		expect(() =>
			assertStaticSubWorkflowsIncluded(
				[{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-child' }],
				new Set(['wf-parent']),
			),
		).toThrow('1 sub-workflow dependency not included in the package. Export aborted.');
	});

	it('dedupes missing static sub-workflow dependencies', () => {
		expect(() =>
			assertStaticSubWorkflowsIncluded(
				[
					{ workflowId: 'wf-parent-a', referencedWorkflowId: 'wf-child' },
					{ workflowId: 'wf-parent-b', referencedWorkflowId: 'wf-child' },
				],
				new Set(['wf-parent-a', 'wf-parent-b']),
			),
		).toThrow('1 sub-workflow dependency not included in the package. Export aborted.');
	});

	it('allows circular references when all workflows are included', () => {
		expect(() =>
			assertStaticSubWorkflowsIncluded(
				[
					{ workflowId: 'wf-a', referencedWorkflowId: 'wf-b' },
					{ workflowId: 'wf-b', referencedWorkflowId: 'wf-a' },
				],
				new Set(['wf-a', 'wf-b']),
			),
		).not.toThrow();
	});
});
