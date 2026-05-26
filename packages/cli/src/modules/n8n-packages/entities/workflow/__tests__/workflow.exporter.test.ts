import type { User, WorkflowEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Readable } from 'node:stream';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { PackageWriter } from '../../../io/package-writer';
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

class CapturingWriter implements PackageWriter {
	readonly files: Array<{ path: string; content: string }> = [];

	readonly directories: string[] = [];

	writeFile(path: string, content: string | Buffer): void {
		this.files.push({ path, content: content.toString() });
	}

	writeDirectory(path: string): void {
		this.directories.push(path);
	}

	finalize(): Readable {
		throw new Error('not used in this test');
	}
}

function makeExporter(returned: WorkflowEntity[]) {
	const finder = mock<WorkflowFinderService>();
	finder.findWorkflowsByIdsForUser.mockResolvedValue(returned);
	const exporter = new WorkflowExporter(finder, new WorkflowSerializer());
	return { exporter, finder };
}

describe('WorkflowExporter', () => {
	it('asks the finder for the workflows using the workflow:export scope', async () => {
		const workflow = makeWorkflow();
		const { exporter, finder } = makeExporter([workflow]);
		const writer = new CapturingWriter();

		await exporter.export({ user, workflowIds: [workflow.id], writer });

		expect(finder.findWorkflowsByIdsForUser).toHaveBeenCalledWith(
			[workflow.id],
			user,
			['workflow:export'],
			{ includeParentFolder: true },
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
			}),
		).rejects.toThrow('1 workflow(s) not found or not accessible. Export aborted.');
	});

	it('writes one entry per finder-returned workflow, even if the request repeats an id', async () => {
		// The finder is responsible for deduping; the exporter must iterate the
		// finder's output (not the input ids) so a repeated id can't double-write.
		const workflow = makeWorkflow({ id: 'wf-repeated', name: 'Repeated' });
		const { exporter } = makeExporter([workflow]);
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({
			user,
			workflowIds: [workflow.id, workflow.id],
			writer,
		});

		expect(entries).toEqual([
			{ id: workflow.id, name: workflow.name, target: 'workflows/repeated' },
		]);
		expect(writer.files.filter((f) => f.path === 'workflows/repeated/workflow.json')).toHaveLength(
			1,
		);
	});

	it('disambiguates targets when two workflows share a name', async () => {
		const a = makeWorkflow({ id: 'wf-aaaaa', name: 'Same Name' });
		const b = makeWorkflow({ id: 'wf-bbbbb', name: 'Same Name' });
		const { exporter } = makeExporter([a, b]);
		const writer = new CapturingWriter();

		const { entries } = await exporter.export({ user, workflowIds: [a.id, b.id], writer });

		const targets = entries.map((e) => e.target);
		expect(targets).toEqual(['workflows/same-name', 'workflows/same-name-2']);

		const writtenPaths = writer.files.map((f) => f.path);
		expect(writtenPaths).toContain('workflows/same-name/workflow.json');
		expect(writtenPaths).toContain('workflows/same-name-2/workflow.json');
	});

	describe('credential references', () => {
		it('emits no references for workflows whose nodes have no credentials', async () => {
			const workflow = makeWorkflow({
				id: 'wf-no-creds',
				nodes: [
					{
						id: 'n1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
			});
			const { exporter } = makeExporter([workflow]);
			const writer = new CapturingWriter();

			const { credentialReferences } = await exporter.export({
				user,
				workflowIds: [workflow.id],
				writer,
			});

			expect(credentialReferences).toEqual([]);
		});

		it('emits one reference per node credential slot, keyed by credential type', async () => {
			// node.credentials is { [credentialTypeKey]: { id, name } } — the
			// type comes from the map key, not the value.
			const workflow = makeWorkflow({
				id: 'wf-creds',
				nodes: [
					{
						id: 'n1',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
						credentials: {
							httpHeaderAuth: { id: 'cred-1', name: 'Header credential' },
							httpBasicAuth: { id: 'cred-2', name: 'Basic credential' },
						},
					},
				],
			});
			const { exporter } = makeExporter([workflow]);
			const writer = new CapturingWriter();

			const { credentialReferences } = await exporter.export({
				user,
				workflowIds: [workflow.id],
				writer,
			});

			expect(credentialReferences).toEqual(
				expect.arrayContaining([
					{
						workflowId: 'wf-creds',
						credentialId: 'cred-1',
						credentialName: 'Header credential',
						credentialType: 'httpHeaderAuth',
					},
					{
						workflowId: 'wf-creds',
						credentialId: 'cred-2',
						credentialName: 'Basic credential',
						credentialType: 'httpBasicAuth',
					},
				]),
			);
			expect(credentialReferences).toHaveLength(2);
		});

		it('dedupes references when the same credential id appears in two nodes of one workflow', async () => {
			const workflow = makeWorkflow({
				id: 'wf-dup',
				nodes: [
					{
						id: 'n1',
						name: 'HTTP A',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
						credentials: {
							httpHeaderAuth: { id: 'cred-shared', name: 'Shared' },
						},
					},
					{
						id: 'n2',
						name: 'HTTP B',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
						credentials: {
							httpHeaderAuth: { id: 'cred-shared', name: 'Shared' },
						},
					},
				],
			});
			const { exporter } = makeExporter([workflow]);
			const writer = new CapturingWriter();

			const { credentialReferences } = await exporter.export({
				user,
				workflowIds: [workflow.id],
				writer,
			});

			expect(credentialReferences).toEqual([
				{
					workflowId: 'wf-dup',
					credentialId: 'cred-shared',
					credentialName: 'Shared',
					credentialType: 'httpHeaderAuth',
				},
			]);
		});

		it('emits separate references for the same credential id used by two distinct workflows', async () => {
			const a = makeWorkflow({
				id: 'wf-a',
				name: 'A',
				nodes: [
					{
						id: 'n1',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
						credentials: { httpHeaderAuth: { id: 'cred-x', name: 'X' } },
					},
				],
			});
			const b = makeWorkflow({
				id: 'wf-b',
				name: 'B',
				nodes: [
					{
						id: 'n1',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
						credentials: { httpHeaderAuth: { id: 'cred-x', name: 'X' } },
					},
				],
			});
			const { exporter } = makeExporter([a, b]);
			const writer = new CapturingWriter();

			const { credentialReferences } = await exporter.export({
				user,
				workflowIds: [a.id, b.id],
				writer,
			});

			expect(credentialReferences).toEqual([
				{
					workflowId: 'wf-a',
					credentialId: 'cred-x',
					credentialName: 'X',
					credentialType: 'httpHeaderAuth',
				},
				{
					workflowId: 'wf-b',
					credentialId: 'cred-x',
					credentialName: 'X',
					credentialType: 'httpHeaderAuth',
				},
			]);
		});
	});
});
