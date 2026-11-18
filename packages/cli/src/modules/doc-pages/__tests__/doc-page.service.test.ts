import type { DocPageSummary } from '@n8n/api-types';
import type { UrlService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { Project, ProjectRepository, User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import { headingsOf, mentionOf } from '../doc-page-ai.service';
import type { DocPageEntity } from '../doc-page.entity';
import type { DocPageRepository } from '../doc-page.repository';
import { DocPageService, isStale, topItems } from '../doc-page.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const user = mock<User>({ id: 'user1' });

const page = (overrides: Partial<DocPageEntity> = {}) =>
	({
		id: 'page1',
		projectId: 'project1',
		parentId: null,
		resourceType: 'workflow',
		resourceId: 'wf1',
		kind: 'api',
		title: 'Absence API',
		content: null,
		markdown: null,
		contentText: '',
		properties: null,
		writtenAgainstVersionId: 'v1',
		updatedAt: new Date(),
		...overrides,
	}) as DocPageEntity;

const workflow = mock<WorkflowEntity>({
	id: 'wf1',
	name: 'Absence API',
	isArchived: false,
	activeVersionId: 'v1',
	activeVersion: {
		nodes: [
			{
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				webhookId: 'hook1',
				disabled: false,
				parameters: { path: 'absence', httpMethod: 'POST' },
			},
		],
		connections: {},
	},
	shared: [{ role: 'workflow:owner', projectId: 'project1' }],
});

describe('DocPageService', () => {
	const docPageRepository = mock<DocPageRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	const projectRepository = mock<ProjectRepository>();
	const service = new DocPageService(
		docPageRepository,
		workflowRepository,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		projectRepository,
		mock(),
		mock<UrlService>({ getWebhookBaseUrl: () => 'https://n8n.example.com/' }),
		mock<GlobalConfig>({
			endpoints: { webhook: 'webhook', form: 'form' },
			chatTrigger: { disablePublicChat: false },
		}),
	);

	beforeEach(() => {
		vi.mocked(userHasScopes).mockReset();
		docPageRepository.findAncestors.mockResolvedValue([]);
		docPageRepository.findChildren.mockResolvedValue([]);
		workflowRepository.findById.mockResolvedValue(workflow);
	});

	describe('isStale', () => {
		it('is stale when the published version moved on', () => {
			expect(isStale(page(), { activeVersionId: 'v2' })).toBe(true);
			expect(isStale(page(), { activeVersionId: 'v1' })).toBe(false);
		});

		it('is not stale when the resource is unpublished or the page is a child', () => {
			expect(isStale(page(), { activeVersionId: null })).toBe(false);
			expect(isStale(page({ parentId: 'root' }), { activeVersionId: 'v2' })).toBe(false);
		});
	});

	describe('scope checks', () => {
		it('hides a page that the user cannot read', async () => {
			docPageRepository.findById.mockResolvedValue(page());
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(service.get(user, 'page1')).rejects.toThrow(NotFoundError);
			expect(userHasScopes).toHaveBeenCalledWith(user, ['workflow:read'], false, {
				workflowId: 'wf1',
			});
		});

		it('rejects an update without the update scope', async () => {
			docPageRepository.findById.mockResolvedValue(page());
			vi.mocked(userHasScopes).mockImplementation(async (_u, [scope]) => scope === 'workflow:read');

			await expect(service.update(user, 'page1', { title: 'New' })).rejects.toThrow(ForbiddenError);
			expect(docPageRepository.save).not.toHaveBeenCalled();
		});

		it('checks a child page against the resource of its root page', async () => {
			docPageRepository.findById.mockResolvedValue(
				page({ id: 'child', parentId: 'page1', resourceType: null, resourceId: null, kind: null }),
			);
			docPageRepository.findAncestors.mockResolvedValue([page()]);
			vi.mocked(userHasScopes).mockResolvedValue(true);

			const result = await service.get(user, 'child');

			expect(workflowRepository.findById).toHaveBeenCalledWith('wf1');
			expect(result.breadcrumb).toEqual([{ id: 'page1', title: 'Absence API' }]);
			expect(result.canEdit).toBe(true);
			expect(result.properties).toBeNull();
		});

		it('lets project editors write the project page and hides it in the breadcrumb', async () => {
			const projectPage = page({ resourceType: 'project', resourceId: 'project1', kind: null });
			docPageRepository.findById.mockResolvedValue(
				page({ id: 'child', parentId: 'page1', resourceType: null, resourceId: null, kind: null }),
			);
			docPageRepository.findAncestors.mockResolvedValue([projectPage]);
			projectRepository.findOneBy.mockResolvedValue(mock<Project>({ id: 'project1', name: 'HR' }));
			vi.mocked(userHasScopes).mockImplementation(
				async (_u, [scope]) => scope === 'project:read' || scope === 'workflow:update',
			);

			const result = await service.get(user, 'child');

			expect(userHasScopes).toHaveBeenCalledWith(user, ['workflow:update'], false, {
				projectId: 'project1',
			});
			expect(result.canEdit).toBe(true);
			expect(result.breadcrumb).toEqual([]);
		});

		it('does not delete a root page', async () => {
			docPageRepository.findById.mockResolvedValue(page());
			vi.mocked(userHasScopes).mockResolvedValue(true);

			await expect(service.deleteChild(user, 'page1')).rejects.toThrow(BadRequestError);
			expect(docPageRepository.deleteById).not.toHaveBeenCalled();
		});
	});

	it('returns the live properties of the published workflow on a root page', async () => {
		docPageRepository.findById.mockResolvedValue(page());
		vi.mocked(userHasScopes).mockResolvedValue(true);

		const result = await service.get(user, 'page1');

		expect(result.properties).toEqual({
			triggers: [
				expect.objectContaining({
					type: 'webhook',
					methods: ['POST'],
					url: 'https://n8n.example.com/webhook/absence',
				}),
			],
			agent: null,
		});
	});

	it('stores the properties when it creates a page', async () => {
		docPageRepository.findByResource.mockResolvedValue(null);
		docPageRepository.insert.mockImplementation(async (row) => page(row));
		const resource = await service.loadResource('workflow', 'wf1');

		await service.ensureForResource(resource!, 'user1');

		expect(docPageRepository.insert.mock.calls[0][0].properties).toEqual(resource!.properties);
		expect(resource!.properties?.triggers).toHaveLength(1);
	});

	it('saving content clears the markdown and stores the plain text', async () => {
		docPageRepository.findById.mockResolvedValue(page({ markdown: '## Overview' }));
		docPageRepository.save.mockImplementation(async (p) => p);
		vi.mocked(userHasScopes).mockResolvedValue(true);

		const content = { type: 'doc', content: [{ type: 'text', text: 'Hello' }] };
		const result = await service.update(user, 'page1', { content });

		expect(result.markdown).toBeNull();
		expect(result.content).toEqual(content);
		expect(docPageRepository.save.mock.calls[0][0].contentText).toBe('Hello');
	});
});

describe('topItems', () => {
	const summary = (resourceType: 'workflow' | 'agent', resourceId: string) =>
		({ resourceType, resourceId }) as DocPageSummary;

	it('sorts each type by rank and takes from both in turn', () => {
		const ranks = new Map([
			['w1', 5],
			['w2', 50],
			['w3', 1],
			['a1', 1000],
			['a2', 2000],
		]);
		const items = [
			summary('workflow', 'w1'),
			summary('workflow', 'w2'),
			summary('workflow', 'w3'),
			summary('agent', 'a1'),
			summary('agent', 'a2'),
		];

		expect(topItems(items, ranks, 4).map((s) => s.resourceId)).toEqual(['w2', 'a2', 'w1', 'a1']);
	});
});

describe('headingsOf', () => {
	it('reads the heading texts of a markdown page', () => {
		expect([...headingsOf('## Overview\ntext\n### Endpoint ##\n#nope')]).toEqual([
			'Overview',
			'Endpoint',
		]);
	});
});

describe('mentionOf', () => {
	it('writes the mention link that the editor shows as a badge', () => {
		expect(
			mentionOf({ name: 'Absence [v2]', resourceType: 'workflow', resourceId: 'wf1', kind: 'api' }),
		).toBe('[Absence \\[v2\\]](doc:workflow/wf1/api)');
	});
});
