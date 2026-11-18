import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { Agent } from '@/modules/agents/entities/agent.entity';

import { DocPageRepository, type NewDocPageRow } from '../doc-page.repository';
import { DocPageService } from '../doc-page.service';

// The queries join other modules' tables, so they run against the real driver.

let repository: DocPageRepository;

const row = (overrides: Partial<NewDocPageRow>): NewDocPageRow => ({
	projectId: '',
	parentId: null,
	resourceType: 'workflow',
	resourceId: null,
	kind: 'schedule',
	title: 'Page',
	content: null,
	markdown: null,
	contentText: '',
	properties: null,
	writtenAgainstVersionId: null,
	updatedById: null,
	...overrides,
});

beforeAll(async () => {
	await testModules.loadModules(['agents', 'doc-pages']);
	await testDb.init();
	repository = Container.get(DocPageRepository);
});

beforeEach(async () => {
	// Pages go with their project through the FK cascade.
	await testDb.truncate(['WorkflowEntity', 'Project']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('DocPageRepository', () => {
	it('stores pages, searches root pages, and cascades to child pages', async () => {
		const project = await createTeamProject();
		const root = await repository.insert(
			row({ projectId: project.id, resourceId: 'wf1', title: 'Absence API' }),
		);
		const child = await repository.insert(
			row({
				projectId: project.id,
				parentId: root.id,
				resourceType: null,
				kind: null,
				title: 'Runbook absence',
			}),
		);

		expect((await repository.findByResource('workflow', 'wf1'))?.id).toBe(root.id);
		expect((await repository.search('ABSENCE', 20)).map((p) => p.id)).toEqual([root.id]);
		expect(await repository.findAncestors(child)).toEqual([
			expect.objectContaining({ id: root.id }),
		]);
		expect(await repository.findChildren(root.id)).toEqual([
			expect.objectContaining({ id: child.id, title: 'Runbook absence' }),
		]);

		await repository.deleteByResource('workflow', 'wf1');
		expect(await repository.findById(child.id)).toBeNull();
	});

	it('creates one page per resource when two callers race', async () => {
		const project = await createTeamProject();
		const workflow = await createActiveWorkflow({}, project);
		const service = Container.get(DocPageService);
		const resource = await service.loadResource('workflow', workflow.id);
		expect(resource?.kind).toBe('schedule');

		const [first, second] = await Promise.all([
			service.ensureForResource(resource!, null),
			service.ensureForResource(resource!, null),
		]);

		expect(first?.id).toBe(second?.id);
		expect(first?.writtenAgainstVersionId).toBe(workflow.activeVersionId);
		expect(first?.properties?.triggers).toEqual([
			expect.objectContaining({ type: 'schedule', rules: [] }),
		]);

		const properties = { triggers: [], agent: null };
		await repository.updatePropertiesByResource('workflow', workflow.id, properties);
		expect((await repository.findById(first!.id))?.properties).toEqual(properties);
	});

	it('reads published workflows and agents of a project', async () => {
		const project = await createTeamProject();
		const published = await createActiveWorkflow({}, project);
		await createWorkflow({}, project);
		const agent = await Container.get(DataSource)
			.getRepository(Agent)
			.save(Object.assign(new Agent(), { name: 'Helper', projectId: project.id }));

		const workflows = await repository.findPublishedWorkflowsInProject(project.id);
		expect(workflows).toEqual([
			expect.objectContaining({
				id: published.id,
				activeVersionId: published.activeVersionId,
				nodes: expect.arrayContaining([expect.objectContaining({ type: 'n8n-nodes-base.cron' })]),
			}),
		]);
		expect(await repository.findAgentHeads({ projectId: project.id })).toEqual([
			{ id: agent.id, name: 'Helper', projectId: project.id, activeVersionId: null },
		]);
		expect(await repository.findAgentHeads({ ids: [agent.id] })).toHaveLength(1);
	});
});
