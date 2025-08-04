'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createTag = createTag;
exports.updateTag = updateTag;
exports.assignTagToWorkflow = assignTagToWorkflow;
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
async function createTag(attributes = {}, workflow) {
	const { name } = attributes;
	const tag = await di_1.Container.get(db_1.TagRepository).save({
		id: (0, db_1.generateNanoId)(),
		name: name ?? (0, backend_test_utils_1.randomName)(),
		...attributes,
	});
	if (workflow) {
		const mappingRepository = di_1.Container.get(db_1.WorkflowTagMappingRepository);
		const mapping = mappingRepository.create({ tagId: tag.id, workflowId: workflow.id });
		await mappingRepository.save(mapping);
	}
	return tag;
}
async function updateTag(tag, attributes) {
	const tagRepository = di_1.Container.get(db_1.TagRepository);
	const updatedTag = tagRepository.merge(tag, attributes);
	return await tagRepository.save(updatedTag);
}
async function assignTagToWorkflow(tag, workflow) {
	const mappingRepository = di_1.Container.get(db_1.WorkflowTagMappingRepository);
	const existingMapping = await mappingRepository.findOne({
		where: {
			tagId: tag.id,
			workflowId: workflow.id,
		},
	});
	if (existingMapping) {
		return existingMapping;
	}
	const mapping = mappingRepository.create({
		tagId: tag.id,
		workflowId: workflow.id,
	});
	return await mappingRepository.save(mapping);
}
//# sourceMappingURL=tags.js.map
