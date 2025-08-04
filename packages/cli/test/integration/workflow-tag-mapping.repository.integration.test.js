'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
describe('WorkflowTagMappingRepository', () => {
	let taggingRepository;
	let tagRepository;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		taggingRepository = di_1.Container.get(db_1.WorkflowTagMappingRepository);
		tagRepository = di_1.Container.get(db_1.TagRepository);
	});
	afterEach(async () => {
		await backend_test_utils_1.testDb.truncate([
			'WorkflowTagMapping',
			'WorkflowEntity',
			'TagEntity',
		]);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('overwriteTaggings', () => {
		test('should overwrite taggings in a workflow', async () => {
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
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
			const workflow = await (0, backend_test_utils_1.createWorkflow)();
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
//# sourceMappingURL=workflow-tag-mapping.repository.integration.test.js.map
