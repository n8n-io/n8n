import { PackageExportBlockedError } from '../../package-export.errors';
import { assertWorkflowDependenciesIncluded } from '../workflow-dependencies';

describe('assertWorkflowDependenciesIncluded', () => {
	it('allows complete workflow dependency sets', () => {
		expect(() =>
			assertWorkflowDependenciesIncluded(
				[{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-child' }],
				new Set(['wf-parent', 'wf-child']),
			),
		).not.toThrow();
	});

	it('blocks missing workflow dependencies', () => {
		expect(() =>
			assertWorkflowDependenciesIncluded(
				[{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-child' }],
				new Set(['wf-parent']),
			),
		).toThrow(PackageExportBlockedError);
		expect(() =>
			assertWorkflowDependenciesIncluded(
				[{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-child' }],
				new Set(['wf-parent']),
			),
		).toThrow('1 workflow dependency not included in the package. Export aborted.');
	});

	it('dedupes missing workflow dependencies', () => {
		expect(() =>
			assertWorkflowDependenciesIncluded(
				[
					{ workflowId: 'wf-parent-a', referencedWorkflowId: 'wf-child' },
					{ workflowId: 'wf-parent-b', referencedWorkflowId: 'wf-child' },
				],
				new Set(['wf-parent-a', 'wf-parent-b']),
			),
		).toThrow('1 workflow dependency not included in the package. Export aborted.');
	});

	it('allows circular references when all workflows are included', () => {
		expect(() =>
			assertWorkflowDependenciesIncluded(
				[
					{ workflowId: 'wf-a', referencedWorkflowId: 'wf-b' },
					{ workflowId: 'wf-b', referencedWorkflowId: 'wf-a' },
				],
				new Set(['wf-a', 'wf-b']),
			),
		).not.toThrow();
	});
});
