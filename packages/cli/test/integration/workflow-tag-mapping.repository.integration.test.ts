import { Container } from '@n8n/di';

import { TagRepository } from '@/databases/repositories/tag.repository';
import { WorkflowTagMappingRepository } from '@/databases/repositories/workflow-tag-mapping.repository';

import { createWorkflow } from './shared/db/workflows';
import * as testDb from './shared/test-db';

describe('WorkflowTagMappingRepository', () => {
	let taggingRepository: WorkflowTagMappingRepository;
	let tagRepository: TagRepository;

	beforeAll(async () => {
		await testDb.init();

		taggingRepository = Container.get(WorkflowTagMappingRepository);
		tagRepository = Container.get(TagRepository);
	});

	afterEach(async () => {
		await testDb.truncate(['WorkflowTagMapping', 'Workflow', 'Tag']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('overwriteTaggings', () => {
		test('should overwrite taggings in a workflow', async () => {
			const workflow = await createWorkflow();

			const oldTags = await tagRepository.save(
				['tag1', 'tag2'].map((name) => tagRepository.create({ name })),
			);

			const oldTaggings = oldTags.map((tag) =>
				taggingRepository.create({
					tagId: tag.id,
					workflowId: workflow.id,
				}),
			);

			await taggingRepository.save(oldTaggings);

			const newTags = await tagRepository.save(
				['tag3', 'tag4'].map((name) => tagRepository.create({ name })),
			);

			await taggingRepository.overwriteTaggings(
				workflow.id,
				newTags.map((t) => t.id),
			);

			const taggings = await taggingRepository.findBy({ workflowId: workflow.id });

			expect(taggings).toHaveLength(2);

			const [firstNewTag, secondNewTag] = newTags;

			expect(taggings).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ tagId: firstNewTag.id, workflowId: workflow.id }),
					expect.objectContaining({ tagId: secondNewTag.id, workflowId: workflow.id }),
				]),
			);
		});

		test('should delete taggings if no tags are provided', async () => {
			const workflow = await createWorkflow();

			const oldTags = await tagRepository.save(
				['tag1', 'tag2'].map((name) => tagRepository.create({ name })),
			);

			const oldTaggings = oldTags.map((tag) =>
				taggingRepository.create({
					tagId: tag.id,
					workflowId: workflow.id,
				}),
			);

			await taggingRepository.save(oldTaggings);

			await taggingRepository.overwriteTaggings(workflow.id, []);

			const taggings = await taggingRepository.findBy({ workflowId: workflow.id });

			expect(taggings).toHaveLength(0);
		});
	});
});
