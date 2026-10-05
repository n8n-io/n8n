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
import { TagRequirementsExtractor } from '../../tag/tag-requirements.extractor';
import { VariableRequirementsExtractor } from '../../variable/variable-requirements.extractor';
import type { AutoIncludedWorkflow } from '../auto-included-workflow-resolver';
import { AutoIncludedWorkflowExporter } from '../auto-included-workflow.exporter';
import { WorkflowSerializer } from '../workflow.serializer';

function makeWorkflow(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
	return {
		id: 'wf_1',
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
		ownerProject: makeProject('proj_1', 'Owner Project'),
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
		new TagRequirementsExtractor(),
	);
}

function emptyRequest(writer: CapturingWriter, workflows: AutoIncludedWorkflow[]) {
	return {
		writer,
		workflows,
		existingWorkflowEntries: [] as ManifestEntry[],
		existingFolderEntries: [] as ManifestEntry[],
		existingProjectEntries: [] as ManifestEntry[],
		includeTags: true,
	};
}

describe('AutoIncludedWorkflowExporter', () => {
	it('writes a top-level workflow under workflows/', async () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf_triage', name: 'Triage' });

		const result = await exporter.export(
			emptyRequest(writer, [includedWorkflow({ workflow, placement: 'top-level' })]),
		);

		expect(result.workflowEntries).toEqual([
			{ id: 'wf_triage', name: 'Triage', target: 'workflows/triage-wf_triage' },
		]);
		expect(writer.files.map((f) => f.path)).toContain('workflows/triage-wf_triage/workflow.json');
	});

	it('skips a workflow already present in the existing workflow entries', async () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf_dup', name: 'Already Here' });

		const result = await exporter.export({
			...emptyRequest(writer, [includedWorkflow({ workflow })]),
			existingWorkflowEntries: [
				{ id: 'wf_dup', name: 'Already Here', target: 'workflows/already-here-wf_dup' },
			],
		});

		expect(result.workflowEntries).toEqual([]);
		expect(writer.files).toEqual([]);
	});

	it('gives a workflow its own target when another entry already shares its name', async () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf_new', name: 'Same Name' });

		const result = await exporter.export({
			...emptyRequest(writer, [includedWorkflow({ workflow })]),
			existingWorkflowEntries: [
				{ id: 'wf_existing', name: 'Same Name', target: 'workflows/same-name-wf_existing' },
			],
		});

		expect(result.workflowEntries[0].target).toBe('workflows/same-name-wf_new');
	});

	it('places a folder workflow under its serialized folder chain', async () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf_nested', name: 'Nested' });
		const chain = [makeFolder('f_root', 'Root'), makeFolder('f_child', 'Child')];

		const result = await exporter.export(
			emptyRequest(writer, [
				includedWorkflow({ workflow, placement: 'folder', folderChain: chain }),
			]),
		);

		expect(result.workflowEntries[0].target).toBe(
			'folders/root-f_root/child-f_child/workflows/nested-wf_nested',
		);
		expect(result.folderEntries).toEqual([
			{ id: 'f_root', name: 'Root', target: 'folders/root-f_root' },
			{ id: 'f_child', name: 'Child', target: 'folders/root-f_root/child-f_child' },
		]);

		const childFolder = jsonParse<{ parentFolderId: string | null }>(
			writer.files.find((f) => f.path === 'folders/root-f_root/child-f_child/folder.json')!.content,
		);
		expect(childFolder.parentFolderId).toBe('f_root');
	});

	it('reuses an existing folder entry instead of recreating it', async () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf_nested', name: 'Nested' });
		const chain = [makeFolder('f_root', 'Root')];

		const result = await exporter.export({
			...emptyRequest(writer, [
				includedWorkflow({ workflow, placement: 'folder', folderChain: chain }),
			]),
			existingFolderEntries: [{ id: 'f_root', name: 'Root', target: 'folders/root-f_root' }],
		});

		expect(result.folderEntries).toEqual([]);
		expect(result.workflowEntries[0].target).toBe('folders/root-f_root/workflows/nested-wf_nested');
		expect(writer.files.some((f) => f.path === 'folders/root-f_root/folder.json')).toBe(false);
	});

	it('creates a project shell for a project workflow and reports its target', async () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf_p', name: 'In Project' });
		const project = makeProject('proj_9', 'Marketing');

		const result = await exporter.export(
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
			{ id: 'proj_9', name: 'Marketing', target: 'projects/marketing-proj_9' },
		]);
		expect(result.workflowEntries[0].target).toBe(
			'projects/marketing-proj_9/workflows/in-project-wf_p',
		);
		expect(result.projectTargetsById.get('proj_9')).toBe('projects/marketing-proj_9');
		expect(writer.files.some((f) => f.path === 'projects/marketing-proj_9/project.json')).toBe(
			true,
		);
	});

	it('nests a project workflow with a folder chain under the project folders/', async () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf_pf', name: 'Deep' });
		const project = makeProject('proj_9', 'Marketing');
		const chain = [makeFolder('f_a', 'Campaigns')];

		const result = await exporter.export(
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
			'projects/marketing-proj_9/folders/campaigns-f_a/workflows/deep-wf_pf',
		);
	});

	it('reuses an existing project entry and preserves its target', async () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf_p', name: 'In Project' });
		const project = makeProject('proj_9', 'Marketing');

		const result = await exporter.export({
			...emptyRequest(writer, [
				includedWorkflow({
					workflow,
					placement: 'project',
					ownerProject: project,
					folderChain: [],
				}),
			]),
			existingProjectEntries: [
				{ id: 'proj_9', name: 'Marketing', target: 'projects/marketing-proj_9' },
			],
		});

		expect(result.projectEntries).toEqual([]);
		expect(result.projectTargetsById.get('proj_9')).toBe('projects/marketing-proj_9');
		expect(result.workflowEntries[0].target).toBe(
			'projects/marketing-proj_9/workflows/in-project-wf_p',
		);
		expect(writer.files.some((f) => f.path === 'projects/marketing-proj_9/project.json')).toBe(
			false,
		);
	});

	it('extracts credential, data-table, and variable requirements from each workflow', async () => {
		const credentialExtractor = mock<CredentialRequirementsExtractor>();
		credentialExtractor.extract.mockReturnValue([
			{
				workflowId: 'wf_1',
				credentialId: 'cred-1',
				credentialName: 'My Cred',
				credentialType: 'httpHeaderAuth',
			},
		]);
		const dataTableExtractor = mock<DataTableRequirementsExtractor>();
		dataTableExtractor.extract.mockReturnValue([{ workflowId: 'wf_1', dataTableId: 'dt-1' }]);
		const variableExtractor = mock<VariableRequirementsExtractor>();
		variableExtractor.extract.mockReturnValue([{ workflowId: 'wf_1', variableName: 'API_KEY' }]);

		const exporter = makeExporter(credentialExtractor, dataTableExtractor, variableExtractor);
		const writer = new CapturingWriter();

		const result = await exporter.export(emptyRequest(writer, [includedWorkflow()]));

		expect(result.requirements.credentials).toEqual([
			{
				workflowId: 'wf_1',
				credentialId: 'cred-1',
				credentialName: 'My Cred',
				credentialType: 'httpHeaderAuth',
			},
		]);
		expect(result.requirements.dataTables).toEqual([{ workflowId: 'wf_1', dataTableId: 'dt-1' }]);
		expect(result.requirements.variables).toEqual([
			{ workflowId: 'wf_1', variableName: 'API_KEY' },
		]);
	});

	it('collects each workflow node list into requirements.nodeTypes', async () => {
		const nodeA = {
			id: 'n1',
			name: 'HTTP',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		} as INode;
		const a = makeWorkflow({ id: 'wf_a', name: 'Alpha', nodes: [nodeA] });
		const b = makeWorkflow({ id: 'wf_b', name: 'Beta' });
		const exporter = makeExporter();
		const writer = new CapturingWriter();

		const result = await exporter.export(
			emptyRequest(writer, [includedWorkflow({ workflow: a }), includedWorkflow({ workflow: b })]),
		);

		expect(result.requirements.nodeTypes).toEqual([
			{ workflowId: 'wf_a', nodes: [nodeA] },
			{ workflowId: 'wf_b', nodes: [] },
		]);
	});

	it('does not extract requirements from a skipped (already-exported) workflow', async () => {
		const credentialExtractor = mock<CredentialRequirementsExtractor>();
		credentialExtractor.extract.mockReturnValue([]);
		const exporter = makeExporter(credentialExtractor);
		const writer = new CapturingWriter();
		const workflow = makeWorkflow({ id: 'wf_dup', name: 'Already Here' });

		const result = await exporter.export({
			...emptyRequest(writer, [includedWorkflow({ workflow })]),
			existingWorkflowEntries: [
				{ id: 'wf_dup', name: 'Already Here', target: 'workflows/already-here-wf_dup' },
			],
		});

		expect(credentialExtractor.extract).not.toHaveBeenCalled();
		expect(result.requirements.nodeTypes).toEqual([]);
	});

	it('keeps a child folder named "workflows" clear of its parent workflow directory', async () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const root = makeFolder('f_root', 'Root');
		const wfFolder = makeFolder('f_wf', 'Workflows');

		const result = await exporter.export(
			emptyRequest(writer, [
				// A workflow placed directly in Root, so Root gets a workflows/ directory
				includedWorkflow({
					workflow: makeWorkflow({ id: 'wf_a', name: 'Alpha' }),
					placement: 'folder',
					folderChain: [root],
				}),
				// A workflow nested under Root's child folder literally named "Workflows"
				includedWorkflow({
					workflow: makeWorkflow({ id: 'wf_b', name: 'Beta' }),
					placement: 'folder',
					folderChain: [root, wfFolder],
				}),
			]),
		);

		const rootWorkflow = result.workflowEntries.find((e) => e.id === 'wf_a');
		const nestedWorkflow = result.workflowEntries.find((e) => e.id === 'wf_b');
		const nestedFolder = result.folderEntries.find((e) => e.id === 'f_wf');

		expect(rootWorkflow?.target).toBe('folders/root-f_root/workflows/alpha-wf_a');
		// The id suffix is what keeps the folder out of Root's own workflows/ directory.
		expect(nestedFolder?.target).toBe('folders/root-f_root/workflows-f_wf');
		expect(nestedWorkflow?.target).toBe('folders/root-f_root/workflows-f_wf/workflows/beta-wf_b');
	});

	it('shares one folder shell between two workflows in the same folder', async () => {
		const exporter = makeExporter();
		const writer = new CapturingWriter();
		const chain = [makeFolder('f_root', 'Root')];

		const result = await exporter.export(
			emptyRequest(writer, [
				includedWorkflow({
					workflow: makeWorkflow({ id: 'wf_a', name: 'Alpha' }),
					placement: 'folder',
					folderChain: chain,
				}),
				includedWorkflow({
					workflow: makeWorkflow({ id: 'wf_b', name: 'Beta' }),
					placement: 'folder',
					folderChain: chain,
				}),
			]),
		);

		// The folder is serialized once, both workflows land inside it.
		expect(result.folderEntries).toEqual([
			{ id: 'f_root', name: 'Root', target: 'folders/root-f_root' },
		]);
		expect(result.workflowEntries.map((e) => e.target)).toEqual([
			'folders/root-f_root/workflows/alpha-wf_a',
			'folders/root-f_root/workflows/beta-wf_b',
		]);
	});
});
