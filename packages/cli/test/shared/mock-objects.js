'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.mockProject = exports.mockUser = exports.mockCredential = void 0;
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const n8n_workflow_1 = require('n8n-workflow');
const mockCredential = () =>
	Object.assign(new db_1.CredentialsEntity(), (0, backend_test_utils_1.randomCredentialPayload)());
exports.mockCredential = mockCredential;
const mockUser = () =>
	Object.assign(new db_1.User(), {
		id: (0, n8n_workflow_1.randomInt)(1000),
		email: (0, backend_test_utils_1.randomEmail)(),
		firstName: (0, backend_test_utils_1.randomName)(),
		lastName: (0, backend_test_utils_1.randomName)(),
	});
exports.mockUser = mockUser;
const mockProject = () =>
	Object.assign(new db_1.Project(), {
		id: (0, backend_test_utils_1.uniqueId)(),
		type: 'personal',
		name: 'Nathan Fillion <nathan.fillion@n8n.io>',
	});
exports.mockProject = mockProject;
//# sourceMappingURL=mock-objects.js.map
