import type { Folder, Project, WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { CapturingWriter } from '../../../io/__tests__/utils/capturing-writer';
import type { ManifestEntry } from '../../../spec/manifest.schema';
import { CredentialRequirementsExtractor } from '../../credential/credential-requirements.extractor';
import { DataTableRequirementsExtractor } from '../../data-table/data-table-requirements.extractor';
import { FolderSerializer } from '../../folder/folder.serializer';
import { ProjectSerializer } from '../../project/project.serializer';
import { VariableRequirementsExtractor } from '../../variable/variable-requirements.extractor';
import type { AutoIncludedWorkflow } from '../auto-included-workflow-resolver';
import { AutoIncludedWorkflowExporter } from '../auto-included-workflow.exporter';
import { WorkflowSerializer } from '../workflow.serializer';

function makeWorkflow(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
	return {
		id: 'wf-1',
		name: 'My Workflow',
		nodes: [],
		connections: {},
		versionId: 'v1',
		activeVersionId: null,
		isArchived: false,
		settings: undefined,
		parentFolder: null,
		...overrides,
	} as unknown as WorkflowEntity;
}

function makeFolder(id: string, name: string): Folder {
	return { id, name } as Folder;
}

function makeProject(id: string, name: string): Project {
	return { id, name, description: null, icon: null } as Project;
}

function includedWorkflow(overrides: Partial<AutoIncludedWorkflow> = {}): AutoIncludedWorkflow {
	return {
		workflow: makeWorkflow(),
		placement: 'top-level',
		ownerProject: makeProject('proj-1', 'Owner Project'),
		folderChain: [],
		...overrides,
	};
}

function makeExporter(
	credentialExtractor?: CredentialRequirementsExtractor,
	dataTableExtractor?: DataTableRequirementsExtractor,
	variableExtractor?: VariableRequirementsExtractor,
) {
	return new AutoIncludedWorkflowExporter(
		new WorkflowSerializer(),
		new FolderSerializer(),
		new ProjectSerializer(),
		credentialExtractor ?? new CredentialRequirementsExtractor(),
		dataTableExtractor ?? new DataTableRequirementsExtractor(),
		variableExtractor ?? new VariableRequirementsExtractor(),
	);
}

function emptyRequest(writer: CapturingWriter, workflows: AutoIncludedWorkflow[]) {
	return {
		writer,
		workflows,
		existingWorkflowEntries: [] as ManifestEntry[],
		existingFolderEntries: [] as ManifestEntry[],
		existingProjectEntries: [] as ManifestEntry[],
	};
}

describe('AutoIncludedWorkflowExporter', () => {
	it('writes a top-level workflow under workflows/', () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf-triage', name: 'Triage' });

		const result = exporter.export(
			emptyRequest(writer, [includedWorkflow({ workflow, placement: 'top-level' })]),
		);

		expect(result.workflowEntries).toEqual([
			{ id: 'wf-triage', name: 'Triage', target: 'workflows/triage' },
		]);
		expect(writer.files.map((f) => f.path)).toContain('workflows/triage/workflow.json');
	});

	it('skips a workflow already present in the existing workflow entries', () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf-dup', name: 'Already Here' });

		const result = exporter.export({
			...emptyRequest(writer, [includedWorkflow({ workflow })]),
			existingWorkflowEntries: [
				{ id: 'wf-dup', name: 'Already Here', target: 'workflows/already-here' },
			],
		});

		expect(result.workflowEntries).toEqual([]);
		expect(writer.files).toEqual([]);
	});

	it('disambiguates a workflow target that collides with an existing entry', () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf-new', name: 'Same Name' });

		const result = exporter.export({
			...emptyRequest(writer, [includedWorkflow({ workflow })]),
			// a different workflow already occupies workflows/same-name
			existingWorkflowEntries: [
				{ id: 'wf-existing', name: 'Same Name', target: 'workflows/same-name' },
			],
		});

		expect(result.workflowEntries[0].target).toBe('workflows/same-name-2');
	});

	it('places a folder workflow under its serialized folder chain', () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf-nested', name: 'Nested' });
		const chain = [makeFolder('f-root', 'Root'), makeFolder('f-child', 'Child')];

		const result = exporter.export(
			emptyRequest(writer, [
				includedWorkflow({ workflow, placement: 'folder', folderChain: chain }),
			]),
		);

		expect(result.workflowEntries[0].target).toBe('folders/root/child/workflows/nested');
		expect(result.folderEntries).toEqual([
			{ id: 'f-root', name: 'Root', target: 'folders/root' },
			{ id: 'f-child', name: 'Child', target: 'folders/root/child' },
		]);

		const childFolder = jsonParse<{ parentFolderId: string | null }>(
			writer.files.find((f) => f.path === 'folders/root/child/folder.json')!.content,
		);
		expect(childFolder.parentFolderId).toBe('f-root');
	});

	it('reuses an existing folder entry instead of recreating it', () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf-nested', name: 'Nested' });
		const chain = [makeFolder('f-root', 'Root')];

		const result = exporter.export({
			...emptyRequest(writer, [
				includedWorkflow({ workflow, placement: 'folder', folderChain: chain }),
			]),
			existingFolderEntries: [{ id: 'f-root', name: 'Root', target: 'folders/root' }],
		});

		expect(result.folderEntries).toEqual([]);
		expect(result.workflowEntries[0].target).toBe('folders/root/workflows/nested');
		expect(writer.files.some((f) => f.path === 'folders/root/folder.json')).toBe(false);
	});

	it('creates a project shell for a project workflow and reports its target', () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf-p', name: 'In Project' });
		const project = makeProject('proj-9', 'Marketing');

		const result = exporter.export(
			emptyRequest(writer, [
				includedWorkflow({
					workflow,
					placement: 'project',
					ownerProject: project,
					folderChain: [],
				}),
			]),
		);

		expect(result.projectEntries).toEqual([
			{ id: 'proj-9', name: 'Marketing', target: 'projects/marketing' },
		]);
		expect(result.workflowEntries[0].target).toBe('projects/marketing/workflows/in-project');
		expect(result.projectTargetsById.get('proj-9')).toBe('projects/marketing');
		expect(writer.files.some((f) => f.path === 'projects/marketing/project.json')).toBe(true);
	});

	it('nests a project workflow with a folder chain under the project folders/', () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf-pf', name: 'Deep' });
		const project = makeProject('proj-9', 'Marketing');
		const chain = [makeFolder('f-a', 'Campaigns')];

		const result = exporter.export(
			emptyRequest(writer, [
				includedWorkflow({
					workflow,
					placement: 'project',
					ownerProject: project,
					folderChain: chain,
				}),
			]),
		);

		expect(result.workflowEntries[0].target).toBe(
			'projects/marketing/folders/campaigns/workflows/deep',
		);
	});

	it('reuses an existing project entry and preserves its target', () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf-p', name: 'In Project' });
		const project = makeProject('proj-9', 'Marketing');

		const result = exporter.export({
			...emptyRequest(writer, [
				includedWorkflow({
					workflow,
					placement: 'project',
					ownerProject: project,
					folderChain: [],
				}),
			]),
			existingProjectEntries: [{ id: 'proj-9', name: 'Marketing', target: 'projects/marketing' }],
		});

		expect(result.projectEntries).toEqual([]);
		expect(result.projectTargetsById.get('proj-9')).toBe('projects/marketing');
		expect(result.workflowEntries[0].target).toBe('projects/marketing/workflows/in-project');
		expect(writer.files.some((f) => f.path === 'projects/marketing/project.json')).toBe(false);
	});

	it('extracts credential, data-table, and variable requirements from each workflow', () => {
		const credentialExtractor = mock<CredentialRequirementsExtractor>();
		credentialExtractor.extract.mockReturnValue([
			{
				workflowId: 'wf-1',
				credentialId: 'cred-1',
				credentialName: 'My Cred',
				credentialType: 'httpHeaderAuth',
			},
		]);
		const dataTableExtractor = mock<DataTableRequirementsExtractor>();
		dataTableExtractor.extract.mockReturnValue([{ workflowId: 'wf-1', dataTableId: 'dt-1' }]);
		const variableExtractor = mock<VariableRequirementsExtractor>();
		variableExtractor.extract.mockReturnValue([{ workflowId: 'wf-1', variableName: 'API_KEY' }]);

		const exporter = makeExporter(credentialExtractor, dataTableExtractor, variableExtractor);
		const writer = new CapturingWriter();

		const result = exporter.export(emptyRequest(writer, [includedWorkflow()]));

		expect(result.requirements.credentials).toEqual([
			{
				workflowId: 'wf-1',
				credentialId: 'cred-1',
				credentialName: 'My Cred',
				credentialType: 'httpHeaderAuth',
			},
		]);
		expect(result.requirements.dataTables).toEqual([{ workflowId: 'wf-1', dataTableId: 'dt-1' }]);
		expect(result.requirements.variables).toEqual([
			{ workflowId: 'wf-1', variableName: 'API_KEY' },
		]);
	});

	it('collects each workflow node list into requirements.nodeTypes', () => {
		const nodeA = {
			id: 'n1',
			name: 'HTTP',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		} as INode;
		const a = makeWorkflow({ id: 'wf-a', name: 'Alpha', nodes: [nodeA] });
		const b = makeWorkflow({ id: 'wf-b', name: 'Beta' });
		const exporter = makeExporter();
		const writer = new CapturingWriter();

		const result = exporter.export(
			emptyRequest(writer, [includedWorkflow({ workflow: a }), includedWorkflow({ workflow: b })]),
		);

		expect(result.requirements.nodeTypes).toEqual([
			{ workflowId: 'wf-a', nodes: [nodeA] },
			{ workflowId: 'wf-b', nodes: [] },
		]);
	});

	it('does not extract requirements from a skipped (already-exported) workflow', () => {
		const credentialExtractor = mock<CredentialRequirementsExtractor>();
		credentialExtractor.extract.mockReturnValue([]);
		const exporter = makeExporter(credentialExtractor);
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf-dup', name: 'Already Here' });

		const result = exporter.export({
			...emptyRequest(writer, [includedWorkflow({ workflow })]),
			existingWorkflowEntries: [
				{ id: 'wf-dup', name: 'Already Here', target: 'workflows/already-here' },
			],
		});

		expect(credentialExtractor.extract).not.toHaveBeenCalled();
		expect(result.requirements.nodeTypes).toEqual([]);
	});

	it('reserves the workflows/ segment so a child folder named "workflows" does not collide with its parent workflow directory', () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const root = makeFolder('f-root', 'Root');
		const wfFolder = makeFolder('f-wf', 'Workflows');

		const result = exporter.export(
			emptyRequest(writer, [
				// A workflow placed directly in Root → folders/root/workflows/alpha
				includedWorkflow({
					workflow: makeWorkflow({ id: 'wf-a', name: 'Alpha' }),
					placement: 'folder',
					folderChain: [root],
				}),
				// A workflow nested under Root's child folder literally named "Workflows"
				includedWorkflow({
					workflow: makeWorkflow({ id: 'wf-b', name: 'Beta' }),
					placement: 'folder',
					folderChain: [root, wfFolder],
				}),
			]),
		);

		const rootWorkflow = result.workflowEntries.find((e) => e.id === 'wf-a');
		const nestedWorkflow = result.workflowEntries.find((e) => e.id === 'wf-b');
		const nestedFolder = result.folderEntries.find((e) => e.id === 'f-wf');

		expect(rootWorkflow?.target).toBe('folders/root/workflows/alpha');
		// The "Workflows" folder is suffixed so it never occupies Root's workflow directory.
		expect(nestedFolder?.target).toBe('folders/root/workflows-2');
		expect(nestedWorkflow?.target).toBe('folders/root/workflows-2/workflows/beta');
	});

	it('shares one folder shell between two workflows in the same folder', () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const chain = [makeFolder('f-root', 'Root')];

		const result = exporter.export(
			emptyRequest(writer, [
				includedWorkflow({
					workflow: makeWorkflow({ id: 'wf-a', name: 'Alpha' }),
					placement: 'folder',
					folderChain: chain,
				}),
				includedWorkflow({
					workflow: makeWorkflow({ id: 'wf-b', name: 'Beta' }),
					placement: 'folder',
					folderChain: chain,
				}),
			]),
		);

		// The folder is serialized once, both workflows land inside it.
		expect(result.folderEntries).toEqual([{ id: 'f-root', name: 'Root', target: 'folders/root' }]);
		expect(result.workflowEntries.map((e) => e.target)).toEqual([
			'folders/root/workflows/alpha',
			'folders/root/workflows/beta',
		]);
	});
});
