import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Readable } from 'node:stream';

import type { PackageWriter } from '../../../io/package-writer';
import { WorkflowExporter } from '../workflow.exporter';
import { WorkflowSerializer } from '../workflow.serializer';

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

describe('WorkflowExporter', () => {
	it('writes one workflow.json under a slugged target and returns a manifest entry', async () => {
		const workflow = makeWorkflow();
		const repo = mock<WorkflowRepository>();
		repo.find.mockResolvedValue([workflow]);

		const exporter = new WorkflowExporter(repo, new WorkflowSerializer());
		const writer = new CapturingWriter();

		const entries = await exporter.export({ workflowIds: [workflow.id], writer });

		expect(entries).toEqual([
			{ id: workflow.id, name: workflow.name, target: 'workflows/my-workflow-wf-abc' },
		]);
		expect(writer.directories).toEqual(['workflows/my-workflow-wf-abc']);
		expect(writer.files).toHaveLength(1);
		expect(writer.files[0].path).toBe('workflows/my-workflow-wf-abc/workflow.json');
	});

	it('writes the source workflow active flag into the serialized payload', async () => {
		const workflow = makeWorkflow({ active: true });
		const repo = mock<WorkflowRepository>();
		repo.find.mockResolvedValue([workflow]);

		const exporter = new WorkflowExporter(repo, new WorkflowSerializer());
		const writer = new CapturingWriter();

		await exporter.export({ workflowIds: [workflow.id], writer });

		const serialized = JSON.parse(writer.files[0].content);
		expect(serialized.active).toBe(true);
	});

	it('throws a UserError naming every workflow id that does not exist', async () => {
		const repo = mock<WorkflowRepository>();
		repo.find.mockResolvedValue([makeWorkflow({ id: 'present-1' })]);

		const exporter = new WorkflowExporter(repo, new WorkflowSerializer());
		const writer = new CapturingWriter();

		await expect(
			exporter.export({
				workflowIds: ['present-1', 'missing-1', 'missing-2'],
				writer,
			}),
		).rejects.toThrow(/missing-1.*missing-2/);
	});

	it('writes only the references in node.credentials (id/name pairs), never inlines credential values', async () => {
		// Workflow nodes only ever carry credential REFERENCES ({ id, name }), never the secret
		// `data` payload — which lives in the CredentialsEntity. This test guards against a
		// future refactor of WorkflowSerializer accidentally embedding richer credential objects.
		const workflow = makeWorkflow({
			nodes: [
				{
					id: 'node-1',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
					credentials: {
						slackApi: { id: 'cred-abc', name: 'My Slack' },
					},
				},
			],
		});
		const repo = mock<WorkflowRepository>();
		repo.find.mockResolvedValue([workflow]);

		const exporter = new WorkflowExporter(repo, new WorkflowSerializer());
		const writer = new CapturingWriter();

		await exporter.export({ workflowIds: [workflow.id], writer });

		const serialized = JSON.parse(writer.files[0].content);
		expect(serialized.nodes[0].credentials.slackApi).toEqual({
			id: 'cred-abc',
			name: 'My Slack',
		});
		// Any field outside the id/name pair would indicate a leaked secret payload.
		expect(Object.keys(serialized.nodes[0].credentials.slackApi).sort()).toEqual(['id', 'name']);
	});
});
