import { LicenseState } from '@n8n/backend-common';
import { mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { WorkflowRepository } from '@n8n/db';
import type { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { isResourceLocatorValue } from 'n8n-workflow';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import { N8nPackagesService } from '../n8n-packages.service';
import {
	DataTableMatchingMode,
	DataTableMissingMode,
	DataTableSchemaConflictPolicy,
	FolderConflictPolicy,
	VariableMissingPolicy,
	WorkflowConflictPolicy,
	WorkflowIdPolicy,
	WorkflowPublishingPolicy,
	type ImportPackageRequest,
} from '../n8n-packages.types';
import {
	buildImportPackageBuffer,
	serializedWorkflow,
	serializedWorkflowWithSubWorkflow,
	workflowRequirementsFromWorkflows,
} from './fixtures/package-fixtures';
import type { SerializedWorkflow } from '../spec/serialized/workflow.schema';

type ImportPackageParams = Pick<ImportPackageRequest, 'user' | 'packageBuffer'> &
	Partial<Pick<ImportPackageRequest, 'workflowIdPolicy'>>;

async function importPackage(params: ImportPackageParams) {
	return await Container.get(N8nPackagesService).importPackage({
		credentialMatchingMode: 'id-only',
		credentialMissingMode: 'must-preexist',
		workflowConflictPolicy: WorkflowConflictPolicy.Fail,
		workflowPublishingPolicy: WorkflowPublishingPolicy.PreservePublishedState,
		workflowIdPolicy: WorkflowIdPolicy.New,
		folderConflictPolicy: FolderConflictPolicy.Merge,
		dataTableMatchingMode: DataTableMatchingMode.ById,
		dataTableMissingMode: DataTableMissingMode.Create,
		dataTableSchemaConflictPolicy: DataTableSchemaConflictPolicy.KeepExisting,
		variableMissingPolicy: VariableMissingPolicy.DoNothing,
		...params,
	});
}

/** Builds a package where `workflows` carry Execute Sub-workflow refs + the derived requirements. */
async function buildSubWorkflowPackage(workflows: SerializedWorkflow[]) {
	return await buildImportPackageBuffer(workflows, {
		manifestExtras: {
			requirements: { workflows: workflowRequirementsFromWorkflows(workflows) },
		},
	});
}

/** Returns the id the workflow's Execute Sub-workflow node points at. */
function subWorkflowRefOf(workflow: WorkflowEntity): string | undefined {
	for (const node of workflow.nodes) {
		const workflowId = node.parameters.workflowId;
		if (isResourceLocatorValue(workflowId) && typeof workflowId.value === 'string') {
			return workflowId.value;
		}
	}
	return undefined;
}

const licenseMocker = new LicenseMocker();

// Import never activates these workflows (they are unpublished), but the publisher
// path touches the active workflow manager — mock it so no real infra is needed.
mockInstance(ActiveWorkflowManager);

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	await initNodeTypes();
	licenseMocker.mockLicenseState(Container.get(LicenseState));
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'WorkflowHistory', 'SharedWorkflow', 'Project']);
});

describe('Package import of workflows with sub-workflows', () => {
	async function findImported(
		result: Awaited<ReturnType<typeof importPackage>>,
		sourceWorkflowId: string,
	) {
		const summary = result.workflows.find((w) => w.sourceWorkflowId === sourceWorkflowId);
		if (!summary) throw new Error(`No imported workflow for source id ${sourceWorkflowId}`);
		return await Container.get(WorkflowRepository).findOneByOrFail({ id: summary.localId });
	}

	it('rewrites the sub-workflow reference to the imported id under the `new` policy', async () => {
		const owner = await createOwner();

		// Parent listed before its sub-workflow to prove ordering does not matter.
		const parent = serializedWorkflowWithSubWorkflow({
			id: 'CHEDDAR',
			name: 'Parent',
			subWorkflowId: 'BRIE',
		});
		const subWorkflow = serializedWorkflow({ id: 'BRIE', name: 'Sub-workflow' });

		const result = await importPackage({
			user: owner,
			packageBuffer: await buildSubWorkflowPackage([parent, subWorkflow]),
			workflowIdPolicy: WorkflowIdPolicy.New,
		});

		const importedParent = await findImported(result, 'CHEDDAR');
		const importedSub = await findImported(result, 'BRIE');

		// New ids were minted (not the source ids)...
		expect(importedSub.id).not.toBe('BRIE');
		// ...and the parent's reference now points at the sub-workflow's imported id.
		expect(subWorkflowRefOf(importedParent)).toBe(importedSub.id);
		expect(result.bindings.workflows).toMatchObject({
			CHEDDAR: importedParent.id,
			BRIE: importedSub.id,
		});
	});

	it('keeps the reference pointing at the imported sub-workflow under the `source` policy', async () => {
		const owner = await createOwner();

		const parent = serializedWorkflowWithSubWorkflow({
			id: 'CHEDDAR',
			name: 'Parent',
			subWorkflowId: 'BRIE',
		});
		const subWorkflow = serializedWorkflow({ id: 'BRIE', name: 'Sub-workflow' });

		const result = await importPackage({
			user: owner,
			packageBuffer: await buildSubWorkflowPackage([parent, subWorkflow]),
			workflowIdPolicy: WorkflowIdPolicy.Source,
		});

		const importedParent = await findImported(result, 'CHEDDAR');
		const importedSub = await findImported(result, 'BRIE');

		expect(importedSub.id).toBe('BRIE');
		expect(subWorkflowRefOf(importedParent)).toBe('BRIE');
	});

	it('remaps `settings.callerIds` to the imported caller ids under the `new` policy', async () => {
		const owner = await createOwner();

		const parent = serializedWorkflowWithSubWorkflow({
			id: 'CHEDDAR',
			name: 'Parent',
			subWorkflowId: 'BRIE',
		});
		// The sub-workflow allows only CHEDDAR (a source id) to call it, plus an id
		// for a workflow that is not part of this package.
		const subWorkflow = serializedWorkflow({
			id: 'BRIE',
			name: 'Sub-workflow',
			settings: { callerPolicy: 'workflowsFromAList', callerIds: 'CHEDDAR,EDAM' },
		});

		const result = await importPackage({
			user: owner,
			packageBuffer: await buildSubWorkflowPackage([parent, subWorkflow]),
			workflowIdPolicy: WorkflowIdPolicy.New,
		});

		const importedParent = await findImported(result, 'CHEDDAR');
		const importedSub = await findImported(result, 'BRIE');

		// In-package caller id is remapped; the unknown id (EDAM) is left as-is.
		expect(importedSub.settings?.callerIds).toBe(`${importedParent.id},EDAM`);
		// Caller policy is preserved so the allowlist intent survives the import.
		expect(importedSub.settings?.callerPolicy).toBe('workflowsFromAList');
	});

	it('does not crash when a package carries a non-string settings.callerIds', async () => {
		const owner = await createOwner();

		// A malformed package could carry a non-string callerIds (settings is validated
		// only as an opaque object); the import must degrade gracefully, not throw.
		const malformed = serializedWorkflow({
			id: 'GORGONZOLA',
			name: 'Malformed caller ids',
			settings: { callerPolicy: 'workflowsFromAList', callerIds: 42 },
		});

		const result = await importPackage({
			user: owner,
			packageBuffer: await buildSubWorkflowPackage([malformed]),
		});

		const imported = await findImported(result, 'GORGONZOLA');
		expect(imported.name).toBe('Malformed caller ids');
	});
});
