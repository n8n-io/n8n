'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createFolder = void 0;
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const createFolder = async (project, options = {}) => {
	const folderRepository = di_1.Container.get(db_1.FolderRepository);
	const folder = await folderRepository.save(
		folderRepository.create({
			name: options.name ?? (0, backend_test_utils_1.randomName)(),
			homeProject: project,
			parentFolder: options.parentFolder ?? null,
			tags: options.tags ?? [],
			updatedAt: options.updatedAt ?? new Date(),
			createdAt: options.updatedAt ?? new Date(),
		}),
	);
	return folder;
};
exports.createFolder = createFolder;
//# sourceMappingURL=folders.js.map
