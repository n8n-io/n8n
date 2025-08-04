'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.mockCipher = exports.mockEntityManager = void 0;
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const typeorm_1 = require('@n8n/typeorm');
const jest_mock_extended_1 = require('jest-mock-extended');
const mockEntityManager = (entityClass) => {
	const entityManager = (0, backend_test_utils_1.mockInstance)(typeorm_1.EntityManager);
	const dataSource = (0, backend_test_utils_1.mockInstance)(typeorm_1.DataSource, {
		manager: entityManager,
		getMetadata: () => (0, jest_mock_extended_1.mock)({ target: entityClass }),
	});
	Object.assign(entityManager, { connection: dataSource });
	return entityManager;
};
exports.mockEntityManager = mockEntityManager;
const mockCipher = () =>
	(0, jest_mock_extended_1.mock)({
		encrypt: (data) => (typeof data === 'string' ? data : JSON.stringify(data)),
		decrypt: (data) => data,
	});
exports.mockCipher = mockCipher;
//# sourceMappingURL=mocking.js.map
