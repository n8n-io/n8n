import type { User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Readable } from 'node:stream';

import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

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

function makeExporter(workflows: WorkflowEntity[], authorizedIds?: string[]) {
	const repo = mock<WorkflowRepository>();
	repo.find.mockResolvedValue(workflows);

	const sharing = mock<WorkflowSharingService>();
	sharing.getSharedWorkflowIds.mockResolvedValue(authorizedIds ?? workflows.map((w) => w.id));

	const exporter = new WorkflowExporter(repo, new WorkflowSerializer(), sharing);
	return { exporter, repo, sharing };
}

describe('WorkflowExporter', () => {
	it('does not query the workflow repository when any id is unauthorized', async () => {
		const authorized = makeWorkflow({ id: 'mine-1' });
		const { exporter, repo } = makeExporter([authorized], ['mine-1']);
		const writer = new CapturingWriter();

		await expect(
			exporter.export({ user, workflowIds: ['mine-1', 'someone-elses-1'], writer }),
		).rejects.toThrow();

		expect(repo.find).not.toHaveBeenCalled();
	});

	it('queries authorization with the workflow:export scope', async () => {
		const workflow = makeWorkflow();
		const { exporter, sharing } = makeExporter([workflow]);
		const writer = new CapturingWriter();

		await exporter.export({ user, workflowIds: [workflow.id], writer });

		expect(sharing.getSharedWorkflowIds).toHaveBeenCalledWith(user, {
			scopes: ['workflow:export'],
		});
	});
});
