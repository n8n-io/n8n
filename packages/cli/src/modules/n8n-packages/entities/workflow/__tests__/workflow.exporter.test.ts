import type { User, WorkflowEntity } from '@n8n/db';
import { jsonParse } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { CapturingWriter } from '../../../io/__tests__/utils/capturing-writer';
import { CredentialRequirementsExtractor } from '../../credential/credential-requirements.extractor';
import type { WorkflowCredentialRequirement } from '../../credential/credential.types';
import { DataTableRequirementsExtractor } from '../../data-table/data-table-requirements.extractor';
import type { WorkflowDataTableRequirement } from '../../data-table/data-table.types';
import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
} from '../../package-export.errors';
import { TagRequirementsExtractor } from '../../tag/tag-requirements.extractor';
import { VariableRequirementsExtractor } from '../../variable/variable-requirements.extractor';
import type { WorkflowVariableRequirement } from '../../variable/variable.types';
import { WorkflowExporter } from '../workflow.exporter';
import { WorkflowSerializer } from '../workflow.serializer';

const user = mock<User>({ id: 'user-1' });

function makeWorkflow(overrides: Partial<WorkflowEntity> = {}): WorkflowEntity {
	return {
		id: 'wf-abc1234567',
		name: 'My Workflow',
		nodes: [],
		connections: {},
		versionId: 'v1',
		active: false,
		isArchived: false,
		settings: undefined,
		parentFolder: null,
		...overrides,
	} as unknown as WorkflowEntity;
}

function makeExporter(
	returned: WorkflowEntity[],
	credentialExtractor?: CredentialRequirementsExtractor,
	dataTableExtractor?: DataTableRequirementsExtractor,
	variableExtractor?: VariableRequirementsExtractor,
) {
	const finder = mock<WorkflowFinderService>();
	finder.findWorkflowsByIdsForUser.mockResolvedValue(returned);
	finder.findExistingWorkflowIds.mockResolvedValue(new Set());
	finder.findWorkflowNamesByIds.mockResolvedValue(
		new Map(returned.map(({ id, name }) => [id, name])),
	);
	const exporter = new WorkflowExporter(
		finder,
		new WorkflowSerializer(),
		credentialExtractor ?? new CredentialRequirementsExtractor(),
		dataTableExtractor ?? new DataTableRequirementsExtractor(),
		variableExtractor ?? new VariableRequirementsExtractor(),
		new TagRequirementsExtractor(),
	);
	return { exporter, finder };
}

describe('WorkflowExporter', () => {
	it('asks the finder for the workflows using the workflow:export scope', async () => {
		const workflow = makeWorkflow();
		const { exporter, finder } = makeExporter([workflow]);
		const writer = new CapturingWriter();

		await exporter.export({
			user,
			workflowIds: [workflow.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		expect(finder.findWorkflowsByIdsForUser).toHaveBeenCalledWith(
			[workflow.id],
			user,
			['workflow:export'],
			{ includeParentFolder: true, includeTags: true, includeActiveVersion: false },
		);
	});

	it('throws when the finder omits a requested id (unauthorized or missing)', async () => {
		const present = makeWorkflow({ id: 'present-1' });
		const { exporter } = makeExporter([present]);
		const writer = new CapturingWriter();

		await expect(
			exporter.export({
				user,
				workflowIds: ['present-1', 'missing-or-denied'],
				writer,
				includeTags: true,
				workflowVersionPolicy: 'latest',
			}),
		).rejects.toThrow('1 workflow(s) not found or not accessible. Export aborted.');
	});

	it('throws PackageEntityNotFoundError when the missing id does not exist at all', async () => {
		const present = makeWorkflow({ id: 'present-1' });
		const { exporter, finder } = makeExporter([present]);
		finder.findExistingWorkflowIds.mockResolvedValue(new Set());
		const writer = new CapturingWriter();

		await expect(
			exporter.export({
				user,
				workflowIds: ['present-1', 'missing'],
				writer,
				includeTags: true,
				workflowVersionPolicy: 'latest',
			}),
		).rejects.toBeInstanceOf(PackageEntityNotFoundError);
	});

	it('throws PackageEntityAccessDeniedError when the missing id exists but is inaccessible', async () => {
		const present = makeWorkflow({ id: 'present-1' });
		const { exporter, finder } = makeExporter([present]);
		finder.findExistingWorkflowIds.mockResolvedValue(new Set(['denied-1']));
		const writer = new CapturingWriter();

		await expect(
			exporter.export({
				user,
				workflowIds: ['present-1', 'denied-1'],
				writer,
				includeTags: true,
				workflowVersionPolicy: 'latest',
			}),
		).rejects.toBeInstanceOf(PackageEntityAccessDeniedError);
	});

	it('checks existence only for the missing ids, not the ones already found', async () => {
		const present = makeWorkflow({ id: 'present-1' });
		const { exporter, finder } = makeExporter([present]);
		const writer = new CapturingWriter();

		await expect(
			exporter.export({
				user,
				workflowIds: ['present-1', 'missing'],
				writer,
				includeTags: true,
				workflowVersionPolicy: 'latest',
			}),
		).rejects.toThrow();

		expect(finder.findExistingWorkflowIds).toHaveBeenCalledWith(['missing']);
	});

	it('writes one entry per requested workflow id after deduping repeated ids', async () => {
		const workflow = makeWorkflow({ id: 'wf-repeated', name: 'Repeated' });
		const { exporter } = makeExporter([workflow]);
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({
			user,
			workflowIds: [workflow.id, workflow.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		expect(entries).toEqual([
			{ id: workflow.id, name: workflow.name, target: 'workflows/repeated' },
		]);
		expect(writer.files.filter((f) => f.path === 'workflows/repeated/workflow.json')).toHaveLength(
			1,
		);
	});

	it('preserves the requested workflow order even when the finder returns a different order', async () => {
		const a = makeWorkflow({ id: 'wf-a', name: 'Alpha' });
		const b = makeWorkflow({ id: 'wf-b', name: 'Beta' });
		const { exporter } = makeExporter([b, a]);
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({
			user,
			workflowIds: [a.id, b.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		expect(entries.map(({ id }) => id)).toEqual([a.id, b.id]);
		expect(writer.files.map(({ path }) => path)).toEqual([
			'workflows/alpha/workflow.json',
			'workflows/beta/workflow.json',
		]);
	});

	it('exports AI Gateway-managed credentials with null ids', async () => {
		const workflow = makeWorkflow({
			nodes: [
				{
					id: 'node-1',
					name: 'AI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: {
						googlePalmApi: { id: null, name: '', __aiGatewayManaged: true },
					},
				},
			],
		});
		const { exporter } = makeExporter([workflow]);
		const writer = new CapturingWriter();

		await exporter.export({
			user,
			workflowIds: [workflow.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		const workflowFile = writer.files.find((f) => f.path === 'workflows/my-workflow/workflow.json');
		expect(workflowFile).toBeDefined();
		expect(jsonParse<unknown>(workflowFile!.content)).toMatchObject({
			nodes: [
				{
					credentials: {
						googlePalmApi: { id: null, name: '', __aiGatewayManaged: true },
					},
				},
			],
		});
	});

	it('writes node groups into workflow.json', async () => {
		const workflow = makeWorkflow({
			nodeGroups: [
				{ id: 'group-1', name: 'Ingest', nodeIds: ['node-1'], description: 'Pulls the data in' },
			],
		});
		const { exporter } = makeExporter([workflow]);
		const writer = new CapturingWriter();

		await exporter.export({
			user,
			workflowIds: [workflow.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		const workflowFile = writer.files.find((f) => f.path === 'workflows/my-workflow/workflow.json');
		expect(jsonParse<unknown>(workflowFile!.content)).toMatchObject({
			nodeGroups: [
				{ id: 'group-1', name: 'Ingest', nodeIds: ['node-1'], description: 'Pulls the data in' },
			],
		});
	});

	it('omits nodeGroups from workflow.json when the workflow has none', async () => {
		const workflow = makeWorkflow({ nodeGroups: [] });
		const { exporter } = makeExporter([workflow]);
		const writer = new CapturingWriter();

		await exporter.export({
			user,
			workflowIds: [workflow.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		const workflowFile = writer.files.find((f) => f.path === 'workflows/my-workflow/workflow.json');
		expect(jsonParse<object>(workflowFile!.content)).not.toHaveProperty('nodeGroups');
	});

	it('nests output under `<basePrefix>/workflows` when a basePrefix is given', async () => {
		// This is the seam the folder exporter uses to place contained workflows
		// under their folder's directory.
		const workflow = makeWorkflow({ id: 'wf-nested', name: 'Triage' });
		const { exporter } = makeExporter([workflow]);
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({
			user,
			workflowIds: [workflow.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
			basePrefix: 'folders/in_progress',
		});

		expect(entries[0].target).toBe('folders/in_progress/workflows/triage');
		expect(writer.files.map((f) => f.path)).toContain(
			'folders/in_progress/workflows/triage/workflow.json',
		);
	});

	it('disambiguates targets when two workflows share a name', async () => {
		const a = makeWorkflow({ id: 'wf-aaaaa', name: 'Same Name' });
		const b = makeWorkflow({ id: 'wf-bbbbb', name: 'Same Name' });
		const { exporter } = makeExporter([a, b]);
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({
			user,
			workflowIds: [a.id, b.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		const targets = entries.map((e) => e.target);
		expect(targets).toEqual(['workflows/same-name', 'workflows/same-name-2']);

		const writtenPaths = writer.files.map((f) => f.path);
		expect(writtenPaths).toContain('workflows/same-name/workflow.json');
		expect(writtenPaths).toContain('workflows/same-name-2/workflow.json');
	});

	it('writes only selectedWorkflowIds but keeps the file names of a full export', async () => {
		const a = makeWorkflow({ id: 'wf-aaaaa', name: 'Same Name' });
		const b = makeWorkflow({ id: 'wf-bbbbb', name: 'Same Name' });
		const { exporter, finder } = makeExporter([b]);
		finder.findWorkflowNamesByIds.mockResolvedValue(new Map([[a.id, a.name]]));
		const writer = new CapturingWriter();

		const { entries, requirements } = await exporter.export({
			user,
			workflowIds: [a.id, b.id],
			selectedWorkflowIds: new Set([b.id]),
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		expect(finder.findWorkflowsByIdsForUser).toHaveBeenCalledTimes(1);
		expect(finder.findWorkflowsByIdsForUser).toHaveBeenCalledWith(
			[b.id],
			user,
			['workflow:export'],
			expect.anything(),
		);
		expect(finder.findWorkflowNamesByIds).toHaveBeenCalledWith([a.id]);
		expect(entries).toEqual([{ id: b.id, name: b.name, target: 'workflows/same-name-2' }]);
		expect(writer.files.map((f) => f.path)).toEqual(['workflows/same-name-2/workflow.json']);
		expect(requirements.nodeTypes).toEqual([{ workflowId: b.id, nodes: [] }]);
	});

	it('does not authorize unselected workflows', async () => {
		const selected = makeWorkflow({ id: 'wf-selected', name: 'Selected' });
		const inaccessible = makeWorkflow({ id: 'wf-secret', name: 'Secret' });
		// The scoped finder omits the inaccessible sibling; only its name is looked up.
		const { exporter, finder } = makeExporter([selected]);
		finder.findWorkflowNamesByIds.mockResolvedValue(
			new Map([
				[selected.id, selected.name],
				[inaccessible.id, inaccessible.name],
			]),
		);
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({
			user,
			workflowIds: [inaccessible.id, selected.id],
			selectedWorkflowIds: new Set([selected.id]),
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		expect(entries).toEqual([
			{ id: selected.id, name: selected.name, target: 'workflows/selected' },
		]);
		expect(writer.files.map((f) => f.path)).toEqual(['workflows/selected/workflow.json']);
		expect(finder.findExistingWorkflowIds).not.toHaveBeenCalled();
	});

	it('still rejects a selected workflow the caller cannot access', async () => {
		const present = makeWorkflow({ id: 'present-1' });
		const { exporter, finder } = makeExporter([present]);
		finder.findExistingWorkflowIds.mockResolvedValue(new Set());
		const writer = new CapturingWriter();

		await expect(
			exporter.export({
				user,
				workflowIds: ['present-1', 'missing'],
				selectedWorkflowIds: new Set(['present-1', 'missing']),
				writer,
				includeTags: true,
				workflowVersionPolicy: 'latest',
			}),
		).rejects.toBeInstanceOf(PackageEntityNotFoundError);

		expect(finder.findExistingWorkflowIds).toHaveBeenCalledWith(['missing']);
	});

	it('runs the extractor on each workflow and concatenates the results into requirements.credentials', async () => {
		// Per-workflow extraction logic lives in CredentialRequirementsExtractor's
		// own suite; this test only proves the exporter wires the extractor in.
		const a = makeWorkflow({ id: 'wf-a' });
		const b = makeWorkflow({ id: 'wf-b' });
		const extractor = mock<CredentialRequirementsExtractor>();
		extractor.extract.mockImplementation((workflow) => [
			{
				workflowId: workflow.id,
				credentialId: `cred-from-${workflow.id}`,
				credentialName: workflow.id,
				credentialType: 'httpHeaderAuth',
			},
		]);
		const { exporter } = makeExporter([a, b], extractor);
		const writer = new CapturingWriter();

		const { requirements } = await exporter.export({
			user,
			workflowIds: [a.id, b.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		expect(extractor.extract).toHaveBeenCalledTimes(2);
		expect(requirements.credentials).toEqual<WorkflowCredentialRequirement[]>([
			{
				workflowId: 'wf-a',
				credentialId: 'cred-from-wf-a',
				credentialName: 'wf-a',
				credentialType: 'httpHeaderAuth',
			},
			{
				workflowId: 'wf-b',
				credentialId: 'cred-from-wf-b',
				credentialName: 'wf-b',
				credentialType: 'httpHeaderAuth',
			},
		]);
	});

	it('runs the data-table extractor on each workflow and concatenates the results into requirements.dataTables', async () => {
		const a = makeWorkflow({ id: 'wf-a' });
		const b = makeWorkflow({ id: 'wf-b' });
		const extractor = mock<DataTableRequirementsExtractor>();
		extractor.extract.mockImplementation((workflow) => [
			{ workflowId: workflow.id, dataTableId: `dt-from-${workflow.id}` },
		]);
		const { exporter } = makeExporter([a, b], undefined, extractor);
		const writer = new CapturingWriter();

		const { requirements } = await exporter.export({
			user,
			workflowIds: [a.id, b.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		expect(extractor.extract).toHaveBeenCalledTimes(2);
		expect(requirements.dataTables).toEqual<WorkflowDataTableRequirement[]>([
			{ workflowId: 'wf-a', dataTableId: 'dt-from-wf-a' },
			{ workflowId: 'wf-b', dataTableId: 'dt-from-wf-b' },
		]);
	});

	it('runs the variable extractor on each workflow and concatenates the results into requirements.variables', async () => {
		const a = makeWorkflow({ id: 'wf-a' });
		const b = makeWorkflow({ id: 'wf-b' });
		const extractor = mock<VariableRequirementsExtractor>();
		extractor.extract.mockImplementation((workflow) => [
			{ workflowId: workflow.id, variableName: `VAR_FROM_${workflow.id}` },
		]);
		const { exporter } = makeExporter([a, b], undefined, undefined, extractor);
		const writer = new CapturingWriter();

		const { requirements } = await exporter.export({
			user,
			workflowIds: [a.id, b.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		expect(extractor.extract).toHaveBeenCalledTimes(2);
		expect(requirements.variables).toEqual<WorkflowVariableRequirement[]>([
			{ workflowId: 'wf-a', variableName: 'VAR_FROM_wf-a' },
			{ workflowId: 'wf-b', variableName: 'VAR_FROM_wf-b' },
		]);
	});

	it('collects each workflow node list into requirements.nodeTypes', async () => {
		const nodeA: INode = {
			id: 'n1',
			name: 'HTTP',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		const a = makeWorkflow({ id: 'wf-a', nodes: [nodeA] });
		const b = makeWorkflow({ id: 'wf-b' });
		const { exporter } = makeExporter([a, b]);
		const writer = new CapturingWriter();

		const { requirements } = await exporter.export({
			user,
			workflowIds: [a.id, b.id],
			writer,
			includeTags: true,
			workflowVersionPolicy: 'latest',
		});

		expect(requirements.nodeTypes).toEqual([
			{ workflowId: 'wf-a', nodes: [nodeA] },
			{ workflowId: 'wf-b', nodes: [] },
		]);
	});
});
