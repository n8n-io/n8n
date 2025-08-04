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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const auth = __importStar(require('@/auth'));
const auth_service_1 = require('@/auth/auth.service');
const config_1 = __importDefault(require('@/config'));
const event_service_1 = require('@/events/event.service');
const ldap_service_ee_1 = require('@/ldap.ee/ldap.service.ee');
const license_1 = require('@/license');
const mfa_service_1 = require('@/mfa/mfa.service');
const posthog_1 = require('@/posthog');
const user_service_1 = require('@/services/user.service');
const auth_controller_1 = require('../auth.controller');
jest.mock('@/auth');
const mockedAuth = auth;
describe('AuthController', () => {
	(0, backend_test_utils_1.mockInstance)(backend_common_1.Logger);
	(0, backend_test_utils_1.mockInstance)(event_service_1.EventService);
	(0, backend_test_utils_1.mockInstance)(auth_service_1.AuthService);
	(0, backend_test_utils_1.mockInstance)(mfa_service_1.MfaService);
	(0, backend_test_utils_1.mockInstance)(user_service_1.UserService);
	(0, backend_test_utils_1.mockInstance)(db_1.UserRepository);
	(0, backend_test_utils_1.mockInstance)(posthog_1.PostHogClient);
	(0, backend_test_utils_1.mockInstance)(license_1.License);
	const ldapService = (0, backend_test_utils_1.mockInstance)(ldap_service_ee_1.LdapService);
	const controller = di_1.Container.get(auth_controller_1.AuthController);
	const userService = di_1.Container.get(user_service_1.UserService);
	const authService = di_1.Container.get(auth_service_1.AuthService);
	const eventsService = di_1.Container.get(event_service_1.EventService);
	const postHog = di_1.Container.get(posthog_1.PostHogClient);
	describe('login', () => {
		it('should not validate email in "emailOrLdapLoginId" if LDAP is enabled', async () => {
			const browserId = '1';
			const member = (0, jest_mock_extended_1.mock)({
				id: '123',
				role: 'global:member',
				mfaEnabled: false,
			});
			const body = (0, jest_mock_extended_1.mock)({
				emailOrLdapLoginId: 'non email',
				password: 'password',
			});
			const req = (0, jest_mock_extended_1.mock)({
				user: member,
				body,
				browserId,
			});
			const res = (0, jest_mock_extended_1.mock)();
			mockedAuth.handleEmailLogin.mockResolvedValue(member);
			ldapService.handleLdapLogin.mockResolvedValue(member);
			config_1.default.set('userManagement.authenticationMethod', 'ldap');
			await controller.login(req, res, body);
			expect(mockedAuth.handleEmailLogin).toHaveBeenCalledWith(
				body.emailOrLdapLoginId,
				body.password,
			);
			expect(ldapService.handleLdapLogin).toHaveBeenCalledWith(
				body.emailOrLdapLoginId,
				body.password,
			);
			expect(authService.issueCookie).toHaveBeenCalledWith(res, member, false, browserId);
			expect(eventsService.emit).toHaveBeenCalledWith('user-logged-in', {
				user: member,
				authenticationMethod: 'ldap',
			});
			expect(userService.toPublic).toHaveBeenCalledWith(member, {
				mfaAuthenticated: false,
				posthog: postHog,
				withScopes: true,
			});
		});
	});
});
//# sourceMappingURL=auth.controller.test.js.map
