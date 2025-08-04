'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const api_types_1 = require('@n8n/api-types');
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const jsonwebtoken_1 = __importDefault(require('jsonwebtoken'));
const constants_1 = require('@/constants');
const me_controller_1 = require('@/controllers/me.controller');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const invalid_mfa_code_error_1 = require('@/errors/response-errors/invalid-mfa-code.error');
const event_service_1 = require('@/events/event.service');
const external_hooks_1 = require('@/external-hooks');
const license_1 = require('@/license');
const mfa_service_1 = require('@/mfa/mfa.service');
const user_service_1 = require('@/services/user.service');
const test_data_1 = require('@test/test-data');
const browserId = 'test-browser-id';
describe('MeController', () => {
	const externalHooks = (0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
	const eventService = (0, backend_test_utils_1.mockInstance)(event_service_1.EventService);
	const userService = (0, backend_test_utils_1.mockInstance)(user_service_1.UserService);
	const userRepository = (0, backend_test_utils_1.mockInstance)(db_1.UserRepository);
	const mockMfaService = (0, backend_test_utils_1.mockInstance)(mfa_service_1.MfaService);
	(0, backend_test_utils_1.mockInstance)(db_1.InvalidAuthTokenRepository);
	(0, backend_test_utils_1.mockInstance)(license_1.License).isWithinUsersLimit.mockReturnValue(
		true,
	);
	const controller = di_1.Container.get(me_controller_1.MeController);
	describe('updateCurrentUser', () => {
		it('should update the user in the DB, and issue a new cookie', async () => {
			const user = (0, jest_mock_extended_1.mock)({
				id: '123',
				email: 'valid@email.com',
				password: 'password',
				authIdentities: [],
				role: 'global:owner',
				mfaEnabled: false,
			});
			const payload = new api_types_1.UserUpdateRequestDto({
				email: 'valid@email.com',
				firstName: 'John',
				lastName: 'Potato',
			});
			const req = (0, jest_mock_extended_1.mock)({ user, browserId });
			const res = (0, jest_mock_extended_1.mock)();
			userRepository.findOneByOrFail.mockResolvedValue(user);
			userRepository.findOneOrFail.mockResolvedValue(user);
			jest.spyOn(jsonwebtoken_1.default, 'sign').mockImplementation(() => 'signed-token');
			userService.toPublic.mockResolvedValue({});
			await controller.updateCurrentUser(req, res, payload);
			expect(externalHooks.run).toHaveBeenCalledWith('user.profile.beforeUpdate', [
				user.id,
				user.email,
				payload,
			]);
			expect(userService.update).toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith('user-updated', {
				user,
				fieldsChanged: ['firstName', 'lastName'],
			});
			expect(res.cookie).toHaveBeenCalledWith(
				constants_1.AUTH_COOKIE_NAME,
				'signed-token',
				expect.objectContaining({
					maxAge: expect.any(Number),
					httpOnly: true,
					sameSite: 'lax',
					secure: false,
				}),
			);
			expect(externalHooks.run).toHaveBeenCalledWith('user.profile.update', [
				user.email,
				(0, jest_mock_extended_1.anyObject)(),
			]);
		});
		it('should throw BadRequestError if beforeUpdate hook throws BadRequestError', async () => {
			const user = (0, jest_mock_extended_1.mock)({
				id: '123',
				password: 'password',
				authIdentities: [],
				role: 'global:owner',
				mfaEnabled: false,
			});
			const req = (0, jest_mock_extended_1.mock)({ user });
			externalHooks.run.mockImplementationOnce(async (hookName) => {
				if (hookName === 'user.profile.beforeUpdate') {
					throw new bad_request_error_1.BadRequestError('Invalid email address');
				}
			});
			await expect(
				controller.updateCurrentUser(
					req,
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)({
						email: 'valid@email.com',
						firstName: 'John',
						lastName: 'Potato',
					}),
				),
			).rejects.toThrowError(new bad_request_error_1.BadRequestError('Invalid email address'));
		});
		describe('when mfa is enabled', () => {
			it('should throw BadRequestError if mfa code is missing', async () => {
				const user = (0, jest_mock_extended_1.mock)({
					id: '123',
					email: 'valid@email.com',
					password: 'password',
					authIdentities: [],
					role: 'global:owner',
					mfaEnabled: true,
				});
				const req = (0, jest_mock_extended_1.mock)({ user, browserId });
				await expect(
					controller.updateCurrentUser(
						req,
						(0, jest_mock_extended_1.mock)(),
						new api_types_1.UserUpdateRequestDto({
							email: 'new@email.com',
							firstName: 'John',
							lastName: 'Potato',
						}),
					),
				).rejects.toThrowError(
					new bad_request_error_1.BadRequestError('Two-factor code is required to change email'),
				);
			});
			it('should throw InvalidMfaCodeError if mfa code is invalid', async () => {
				const user = (0, jest_mock_extended_1.mock)({
					id: '123',
					email: 'valid@email.com',
					password: 'password',
					authIdentities: [],
					role: 'global:owner',
					mfaEnabled: true,
				});
				const req = (0, jest_mock_extended_1.mock)({ user, browserId });
				mockMfaService.validateMfa.mockResolvedValue(false);
				await expect(
					controller.updateCurrentUser(
						req,
						(0, jest_mock_extended_1.mock)(),
						(0, jest_mock_extended_1.mock)({
							email: 'new@email.com',
							firstName: 'John',
							lastName: 'Potato',
							mfaCode: 'invalid',
						}),
					),
				).rejects.toThrow(invalid_mfa_code_error_1.InvalidMfaCodeError);
			});
			it("should update the user's email if mfa code is valid", async () => {
				const user = (0, jest_mock_extended_1.mock)({
					id: '123',
					email: 'valid@email.com',
					password: 'password',
					authIdentities: [],
					role: 'global:owner',
					mfaEnabled: true,
					mfaSecret: 'secret',
				});
				const req = (0, jest_mock_extended_1.mock)({ user, browserId });
				const res = (0, jest_mock_extended_1.mock)();
				userRepository.findOneByOrFail.mockResolvedValue(user);
				userRepository.findOneOrFail.mockResolvedValue(user);
				jest.spyOn(jsonwebtoken_1.default, 'sign').mockImplementation(() => 'signed-token');
				userService.toPublic.mockResolvedValue({});
				mockMfaService.validateMfa.mockResolvedValue(true);
				const result = await controller.updateCurrentUser(
					req,
					res,
					(0, jest_mock_extended_1.mock)({
						email: 'new@email.com',
						firstName: 'John',
						lastName: 'Potato',
						mfaCode: '123456',
					}),
				);
				expect(result).toEqual({});
			});
		});
	});
	describe('updatePassword', () => {
		const passwordHash = '$2a$10$ffitcKrHT.Ls.m9FfWrMrOod76aaI0ogKbc3S96Q320impWpCbgj6';
		it('should throw if the user does not have a password set', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: (0, jest_mock_extended_1.mock)({ password: undefined }),
			});
			await expect(
				controller.updatePassword(
					req,
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)({ currentPassword: '', newPassword: '' }),
				),
			).rejects.toThrowError(
				new bad_request_error_1.BadRequestError('Requesting user not set up.'),
			);
		});
		it("should throw if currentPassword does not match the user's password", async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: (0, jest_mock_extended_1.mock)({ password: passwordHash }),
			});
			await expect(
				controller.updatePassword(
					req,
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)({ currentPassword: 'not_old_password', newPassword: '' }),
				),
			).rejects.toThrowError(
				new bad_request_error_1.BadRequestError('Provided current password is incorrect.'),
			);
		});
		describe('should throw if newPassword is not valid', () => {
			Object.entries(test_data_1.badPasswords).forEach(([newPassword, errorMessage]) => {
				it(newPassword, async () => {
					const req = (0, jest_mock_extended_1.mock)({
						user: (0, jest_mock_extended_1.mock)({ password: passwordHash }),
						browserId,
					});
					await expect(
						controller.updatePassword(
							req,
							(0, jest_mock_extended_1.mock)(),
							(0, jest_mock_extended_1.mock)({ currentPassword: 'old_password', newPassword }),
						),
					).rejects.toThrowError(new bad_request_error_1.BadRequestError(errorMessage));
				});
			});
		});
		it('should update the password in the DB, and issue a new cookie', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				user: (0, jest_mock_extended_1.mock)({ password: passwordHash, mfaEnabled: false }),
				browserId,
			});
			const res = (0, jest_mock_extended_1.mock)();
			userRepository.save.calledWith(req.user).mockResolvedValue(req.user);
			jest.spyOn(jsonwebtoken_1.default, 'sign').mockImplementation(() => 'new-signed-token');
			await controller.updatePassword(
				req,
				res,
				(0, jest_mock_extended_1.mock)({
					currentPassword: 'old_password',
					newPassword: 'NewPassword123',
				}),
			);
			expect(req.user.password).not.toBe(passwordHash);
			expect(res.cookie).toHaveBeenCalledWith(
				constants_1.AUTH_COOKIE_NAME,
				'new-signed-token',
				expect.objectContaining({
					maxAge: expect.any(Number),
					httpOnly: true,
					sameSite: 'lax',
					secure: false,
				}),
			);
			expect(externalHooks.run).toHaveBeenCalledWith('user.password.update', [
				req.user.email,
				req.user.password,
			]);
			expect(eventService.emit).toHaveBeenCalledWith('user-updated', {
				user: req.user,
				fieldsChanged: ['password'],
			});
		});
		describe('mfa enabled', () => {
			it('should throw BadRequestError if mfa code is missing', async () => {
				const req = (0, jest_mock_extended_1.mock)({
					user: (0, jest_mock_extended_1.mock)({ password: passwordHash, mfaEnabled: true }),
				});
				await expect(
					controller.updatePassword(
						req,
						(0, jest_mock_extended_1.mock)(),
						(0, jest_mock_extended_1.mock)({
							currentPassword: 'old_password',
							newPassword: 'NewPassword123',
						}),
					),
				).rejects.toThrowError(
					new bad_request_error_1.BadRequestError(
						'Two-factor code is required to change password.',
					),
				);
			});
			it('should throw InvalidMfaCodeError if invalid mfa code is given', async () => {
				const req = (0, jest_mock_extended_1.mock)({
					user: (0, jest_mock_extended_1.mock)({ password: passwordHash, mfaEnabled: true }),
				});
				mockMfaService.validateMfa.mockResolvedValue(false);
				await expect(
					controller.updatePassword(
						req,
						(0, jest_mock_extended_1.mock)(),
						(0, jest_mock_extended_1.mock)({
							currentPassword: 'old_password',
							newPassword: 'NewPassword123',
							mfaCode: '123',
						}),
					),
				).rejects.toThrow(invalid_mfa_code_error_1.InvalidMfaCodeError);
			});
			it('should succeed when mfa code is correct', async () => {
				const req = (0, jest_mock_extended_1.mock)({
					user: (0, jest_mock_extended_1.mock)({
						password: passwordHash,
						mfaEnabled: true,
						mfaSecret: 'secret',
					}),
					browserId,
				});
				const res = (0, jest_mock_extended_1.mock)();
				userRepository.save.calledWith(req.user).mockResolvedValue(req.user);
				jest.spyOn(jsonwebtoken_1.default, 'sign').mockImplementation(() => 'new-signed-token');
				mockMfaService.validateMfa.mockResolvedValue(true);
				const result = await controller.updatePassword(
					req,
					res,
					(0, jest_mock_extended_1.mock)({
						currentPassword: 'old_password',
						newPassword: 'NewPassword123',
						mfaCode: 'valid',
					}),
				);
				expect(result).toEqual({ success: true });
				expect(req.user.password).not.toBe(passwordHash);
			});
		});
	});
	describe('storeSurveyAnswers', () => {
		it('should throw BadRequestError if answers are missing in the payload', async () => {
			const req = (0, jest_mock_extended_1.mock)({
				body: undefined,
			});
			await expect(controller.storeSurveyAnswers(req)).rejects.toThrowError(
				new bad_request_error_1.BadRequestError('Personalization answers are mandatory'),
			);
		});
		it('should not flag XSS attempt for `<` sign in company size', async () => {
			const req = (0, jest_mock_extended_1.mock)();
			req.body = {
				version: 'v4',
				personalization_survey_submitted_at: '2024-08-06T12:19:51.268Z',
				personalization_survey_n8n_version: '1.0.0',
				companySize: '<20',
				otherCompanyIndustryExtended: ['test'],
				automationGoalSm: ['test'],
				usageModes: ['test'],
				email: 'test@email.com',
				role: 'test',
				roleOther: 'test',
				reportedSource: 'test',
				reportedSourceOther: 'test',
			};
			await expect(controller.storeSurveyAnswers(req)).resolves.toEqual({ success: true });
		});
		test.each([
			'automationGoalDevops',
			'companyIndustryExtended',
			'otherCompanyIndustryExtended',
			'automationGoalSm',
			'usageModes',
		])('should throw BadRequestError on XSS attempt for an array field %s', async (fieldName) => {
			const req = (0, jest_mock_extended_1.mock)();
			req.body = {
				version: 'v4',
				personalization_survey_n8n_version: '1.0.0',
				personalization_survey_submitted_at: new Date().toISOString(),
				[fieldName]: ['<script>alert("XSS")</script>'],
			};
			await expect(controller.storeSurveyAnswers(req)).rejects.toThrowError(
				bad_request_error_1.BadRequestError,
			);
		});
		test.each([
			'automationGoalDevopsOther',
			'companySize',
			'companyType',
			'automationGoalSmOther',
			'roleOther',
			'reportedSource',
			'reportedSourceOther',
		])('should throw BadRequestError on XSS attempt for a string field %s', async (fieldName) => {
			const req = (0, jest_mock_extended_1.mock)();
			req.body = {
				version: 'v4',
				personalization_survey_n8n_version: '1.0.0',
				personalization_survey_submitted_at: new Date().toISOString(),
				[fieldName]: '<script>alert("XSS")</script>',
			};
			await expect(controller.storeSurveyAnswers(req)).rejects.toThrowError(
				bad_request_error_1.BadRequestError,
			);
		});
	});
});
//# sourceMappingURL=me.controller.test.js.map
