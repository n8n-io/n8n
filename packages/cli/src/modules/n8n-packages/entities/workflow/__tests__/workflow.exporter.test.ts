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
		).rejects.toThrow(/missing-or-denied/);
	});

	it('writes one entry per finder-returned workflow, even if the request repeats an id', async () => {
		// The finder is responsible for deduping; the exporter must iterate the
		// finder's output (not the input ids) so a repeated id can't double-write.
		const workflow = makeWorkflow({ id: 'wf-repeated', name: 'Repeated' });
		const { exporter } = makeExporter([workflow]);
		const writer = new CapturingWriter();

		const entries = await exporter.export({
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

		const entries = await exporter.export({ user, workflowIds: [a.id, b.id], writer });

		const targets = entries.map((e) => e.target);
		expect(targets).toEqual(['workflows/same-name', 'workflows/same-name-2']);

		const writtenPaths = writer.files.map((f) => f.path);
		expect(writtenPaths).toContain('workflows/same-name/workflow.json');
		expect(writtenPaths).toContain('workflows/same-name-2/workflow.json');
	});
});
