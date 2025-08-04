'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createRawProjectData = void 0;
const minifaker_1 = require('minifaker');
require('minifaker/locales/en');
const projectName = `${(0, minifaker_1.firstName)()} ${(0, minifaker_1.lastName)()} <${minifaker_1.email}>`;
const createRawProjectData = (payload) => {
	return {
		createdAt: (0, minifaker_1.date)(),
		updatedAt: (0, minifaker_1.date)(),
		id: minifaker_1.nanoId.nanoid(),
		name: projectName,
		type: 'personal',
		...payload,
	};
};
exports.createRawProjectData = createRawProjectData;
//# sourceMappingURL=project.test-data.js.map
