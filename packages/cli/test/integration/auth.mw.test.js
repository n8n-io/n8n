'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const users_1 = require('./shared/db/users');
const utils = __importStar(require('./shared/utils/'));
describe('Auth Middleware', () => {
	(0, backend_test_utils_1.mockInstance)(active_workflow_manager_1.ActiveWorkflowManager);
	const testServer = utils.setupTestServer({
		endpointGroups: ['me', 'auth', 'owner', 'users', 'invitations'],
	});
	const ROUTES_REQUIRING_AUTHENTICATION = [
		['patch', '/me'],
		['patch', '/me/password'],
		['post', '/me/survey'],
	];
	const ROUTES_REQUIRING_AUTHORIZATION = [
		['post', '/invitations'],
		['delete', '/users/123'],
	];
	describe('Routes requiring Authentication', () => {
		[...ROUTES_REQUIRING_AUTHENTICATION, ...ROUTES_REQUIRING_AUTHORIZATION].forEach(
			([method, endpoint]) => {
				test(`${method} ${endpoint} should return 401 Unauthorized if no cookie`, async () => {
					const { statusCode } = await testServer.authlessAgent[method](endpoint);
					expect(statusCode).toBe(401);
				});
			},
		);
	});
	describe('Routes requiring Authorization', () => {
		let authMemberAgent;
		beforeAll(async () => {
			const member = await (0, users_1.createUser)({ role: 'global:member' });
			authMemberAgent = testServer.authAgentFor(member);
		});
		ROUTES_REQUIRING_AUTHORIZATION.forEach(async ([method, endpoint]) => {
			test(`${method} ${endpoint} should return 403 Forbidden for member`, async () => {
				const { statusCode } = await authMemberAgent[method](endpoint);
				expect(statusCode).toBe(403);
			});
		});
	});
});
//# sourceMappingURL=auth.mw.test.js.map
