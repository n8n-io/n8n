import { PackageExportBlockedError } from '../../package-export.errors';
import { PackageWorkflowRequirementValidator } from '../package-workflow-requirement.validator';

describe('PackageWorkflowRequirementValidator', () => {
	const validator = new PackageWorkflowRequirementValidator();

	it('allows complete static sub-workflow dependency sets', async () => {
		await expect(
			validator.validateStaticSubWorkflowsIncluded(
				[{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-child' }],
				new Set(['wf-parent', 'wf-child']),
			),
		).resolves.toBeUndefined();
	});

	it('blocks missing static sub-workflow dependencies', async () => {
		await expect(
			validator.validateStaticSubWorkflowsIncluded(
				[{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-child' }],
				new Set(['wf-parent']),
			),
		).rejects.toThrow(PackageExportBlockedError);
		await expect(
			validator.validateStaticSubWorkflowsIncluded(
				[{ workflowId: 'wf-parent', referencedWorkflowId: 'wf-child' }],
				new Set(['wf-parent']),
			),
		).rejects.toThrow('1 sub-workflow dependency not included in the package. Export aborted.');
	});

	it('dedupes missing static sub-workflow dependencies', async () => {
		await expect(
			validator.validateStaticSubWorkflowsIncluded(
				[
					{ workflowId: 'wf-parent-a', referencedWorkflowId: 'wf-child' },
					{ workflowId: 'wf-parent-b', referencedWorkflowId: 'wf-child' },
				],
				new Set(['wf-parent-a', 'wf-parent-b']),
			),
		).rejects.toThrow('1 sub-workflow dependency not included in the package. Export aborted.');
	});

	it('allows circular references when all workflows are included', async () => {
		await expect(
			validator.validateStaticSubWorkflowsIncluded(
				[
					{ workflowId: 'wf-a', referencedWorkflowId: 'wf-b' },
					{ workflowId: 'wf-b', referencedWorkflowId: 'wf-a' },
				],
				new Set(['wf-a', 'wf-b']),
			),
		).resolves.toBeUndefined();
	});
});
