import type { GlobalConfig } from '@n8n/config';
import type { TagEntity, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { TagService } from '@/services/tag.service';

import { TagImporter } from '../tag-importer';
import type { TagImportPlan, TagImportRequest } from '../tag.types';
import type { ImportContext } from '../../../n8n-packages.types';

const globalConfig = mock<GlobalConfig>({ tags: { disabled: false } });

function contextFor(scopes: Array<'tag:create' | 'tag:update'>): ImportContext {
	return {
		user: mock<User>({ id: 'user-1', role: { scopes: scopes.map((slug) => ({ slug })) } }),
		projectId: 'project-1',
		folderId: null,
	};
}

function makeImporter() {
	const tagService = mock<TagService>();
	tagService.getByIds.mockResolvedValue([]);
	tagService.getByNames.mockResolvedValue([]);
	return { importer: new TagImporter(tagService, globalConfig), tagService };
}

const request: TagImportRequest = {
	requirements: [{ id: 'tag-1', name: 'prod', usedByWorkflows: ['wf-1'] }],
	missingMode: 'create',
	conflictPolicy: 'skip',
};
const appliedWorkflows = [{ sourceWorkflowId: 'wf-1', tagIds: ['tag-1'] }];

describe('TagImporter.plan', () => {
	it('fails with permission-denied when the user lacks tag:create for a planned creation', async () => {
		const { importer } = makeImporter();

		const plan = await importer.plan(contextFor([]), request, appliedWorkflows);

		expect(plan.creations).toEqual([{ id: 'tag-1', name: 'prod' }]);
		expect(plan.failures).toEqual([
			{ kind: 'permission-denied', missingScope: 'tag:create', usedByWorkflows: ['wf-1'] },
		]);
	});

	it('fails with permission-denied when the user lacks tag:update for a planned rename', async () => {
		const { importer, tagService } = makeImporter();
		tagService.getByIds.mockResolvedValue([mock<TagEntity>({ id: 'tag-1', name: 'production' })]);

		const plan = await importer.plan(
			contextFor(['tag:create']),
			{ ...request, conflictPolicy: 'rename' },
			appliedWorkflows,
		);

		expect(plan.renames).toEqual([{ id: 'tag-1', from: 'production', to: 'prod' }]);
		expect(plan.failures).toEqual([
			{ kind: 'permission-denied', missingScope: 'tag:update', usedByWorkflows: ['wf-1'] },
		]);
	});
});

describe('TagImporter.apply', () => {
	it('re-checks the scope and throws before writing anything', async () => {
		const { importer, tagService } = makeImporter();
		const plan: TagImportPlan = {
			matched: [],
			creations: [{ id: 'tag-1', name: 'prod' }],
			renames: [],
			dropped: [],
			failures: [],
		};

		await expect(importer.apply(contextFor([]), plan)).rejects.toThrow(ForbiddenError);
		expect(tagService.save).not.toHaveBeenCalled();
	});
});
