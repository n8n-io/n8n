import { mockInstance } from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { MfaService } from '@/mfa/mfa.service';
import { WebAuthnService } from '@/mfa/webauthn.service';

import { MFAController } from '../mfa.controller';

type DeleteCredentialReq = AuthenticatedRequest<
	{ id: string },
	{},
	{ mfaCode?: string; mfaRecoveryCode?: string; webauthnResponse?: unknown }
>;

describe('MFAController', () => {
	mockInstance(ExternalHooks);
	mockInstance(EventService);
	mockInstance(InstanceSettingsLoaderConfig);
	const mfaService = mockInstance(MfaService);
	const webauthnService = mockInstance(WebAuthnService);
	const authService = mockInstance(AuthService);
	const userRepository = mockInstance(UserRepository);
	const controller = Container.get(MFAController);

	beforeEach(() => {
		jest.resetAllMocks();
		// MfaService exposes `webauthn` as a public field, not a class-level mock —
		// re-wire it after each reset so the controller's `this.mfaService.webauthn`
		// hits our spy.
		(mfaService as unknown as { webauthn: WebAuthnService }).webauthn = webauthnService;
	});

	describe('deleteWebAuthnCredential', () => {
		const userId = 'user-1';
		const credId = 'cred-1';
		const mkReq = (body: DeleteCredentialReq['body']) =>
			({
				user: { id: userId },
				params: { id: credId },
				body,
				browserId: 'browser-1',
			}) as unknown as DeleteCredentialReq;

		it('rejects when no proof is supplied', async () => {
			await expect(
				controller.deleteWebAuthnCredential(mkReq({}), mock<Response>()),
			).rejects.toThrow(BadRequestError);
			expect(webauthnService.deleteCredential).not.toHaveBeenCalled();
		});

		it('rejects when multiple proofs are supplied', async () => {
			await expect(
				controller.deleteWebAuthnCredential(
					mkReq({ mfaCode: '123456', webauthnResponse: { id: 'x' } }),
					mock<Response>(),
				),
			).rejects.toThrow(BadRequestError);
			expect(webauthnService.deleteCredential).not.toHaveBeenCalled();
		});

		it('rejects when the proof fails validation', async () => {
			mfaService.validateProof.mockResolvedValue(false);

			await expect(
				controller.deleteWebAuthnCredential(mkReq({ mfaCode: '123456' }), mock<Response>()),
			).rejects.toThrow(BadRequestError);
			expect(webauthnService.deleteCredential).not.toHaveBeenCalled();
		});

		it('refuses to remove the last MFA credential while MFA is enforced', async () => {
			mfaService.validateProof.mockResolvedValue(true);
			webauthnService.getUserCredentials.mockResolvedValue([{ id: credId } as never]);
			mfaService.isMFAEnforced.mockResolvedValue(true);
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: '',
				decryptedRecoveryCodes: [],
			});

			await expect(
				controller.deleteWebAuthnCredential(mkReq({ mfaCode: '123456' }), mock<Response>()),
			).rejects.toThrow(BadRequestError);
			expect(webauthnService.deleteCredential).not.toHaveBeenCalled();
		});

		it('allows removing the last webauthn credential when TOTP is still set up', async () => {
			mfaService.validateProof.mockResolvedValue(true);
			webauthnService.getUserCredentials.mockResolvedValue([{ id: credId } as never]);
			mfaService.isMFAEnforced.mockResolvedValue(true);
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: 'totp-secret',
				decryptedRecoveryCodes: ['rc'],
			});
			webauthnService.deleteCredential.mockResolvedValue(true);

			const res = mock<Response>();
			const result = await controller.deleteWebAuthnCredential(mkReq({ mfaCode: '123456' }), res);

			expect(result).toEqual({ success: true });
			expect(webauthnService.deleteCredential).toHaveBeenCalledWith(credId, userId);
			// TOTP is still set up, so we don't clear MFA state or rotate the session.
			expect(authService.rotateSession).not.toHaveBeenCalled();
		});

		it('clears MFA state and rotates the session when removing the last credential without TOTP', async () => {
			mfaService.validateProof.mockResolvedValue(true);
			webauthnService.getUserCredentials.mockResolvedValue([{ id: credId } as never]);
			mfaService.isMFAEnforced.mockResolvedValue(false);
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: '',
				decryptedRecoveryCodes: [],
			});
			webauthnService.deleteCredential.mockResolvedValue(true);

			const res = mock<Response>();
			await controller.deleteWebAuthnCredential(mkReq({ mfaCode: '123456' }), res);

			expect(userRepository.update).toHaveBeenCalledWith(
				userId,
				expect.objectContaining({ mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: [] }),
			);
			expect(authService.rotateSession).toHaveBeenCalledWith(
				res,
				expect.objectContaining({ id: userId }),
				false,
				expect.objectContaining({ browserId: 'browser-1' }),
			);
		});

		it('does not rotate the session when other credentials remain', async () => {
			mfaService.validateProof.mockResolvedValue(true);
			webauthnService.getUserCredentials.mockResolvedValue([
				{ id: credId },
				{ id: 'cred-2' },
			] as never);
			mfaService.isMFAEnforced.mockResolvedValue(false);
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: '',
				decryptedRecoveryCodes: [],
			});
			webauthnService.deleteCredential.mockResolvedValue(true);

			const res = mock<Response>();
			await controller.deleteWebAuthnCredential(mkReq({ mfaCode: '123456' }), res);

			expect(authService.rotateSession).not.toHaveBeenCalled();
			expect(userRepository.update).not.toHaveBeenCalled();
		});

		it('throws when the credential row was not found', async () => {
			mfaService.validateProof.mockResolvedValue(true);
			webauthnService.getUserCredentials.mockResolvedValue([{ id: credId } as never]);
			mfaService.isMFAEnforced.mockResolvedValue(false);
			mfaService.getSecretAndRecoveryCodes.mockResolvedValue({
				decryptedSecret: 'totp-secret',
				decryptedRecoveryCodes: ['rc'],
			});
			webauthnService.deleteCredential.mockResolvedValue(false);

			await expect(
				controller.deleteWebAuthnCredential(mkReq({ mfaCode: '123456' }), mock<Response>()),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('getWebAuthnRegistrationOptions', () => {
		const mkReq = (attachment: unknown) =>
			({
				user: { id: 'user-1', email: 'u@example.com', firstName: 'A', lastName: 'B' },
				query: { attachment },
			}) as never;

		it('rejects when attachment query param is missing', async () => {
			await expect(controller.getWebAuthnRegistrationOptions(mkReq(undefined))).rejects.toThrow(
				BadRequestError,
			);
			expect(webauthnService.generateRegistrationOptions).not.toHaveBeenCalled();
		});

		it('rejects when attachment is not "platform" or "cross-platform"', async () => {
			await expect(controller.getWebAuthnRegistrationOptions(mkReq('hybrid'))).rejects.toThrow(
				BadRequestError,
			);
		});

		it('passes a valid attachment through to the service', async () => {
			webauthnService.generateRegistrationOptions.mockResolvedValue({ challenge: 'c' } as never);
			await controller.getWebAuthnRegistrationOptions(mkReq('platform'));
			expect(webauthnService.generateRegistrationOptions).toHaveBeenCalledWith(
				'user-1',
				'u@example.com',
				'A B',
				'platform',
			);
		});
	});

	describe('verifyWebAuthnRegistration', () => {
		const mkReq = (body: Partial<{ label: string; response: unknown; attachment: string }>) =>
			({
				user: { id: 'user-1' },
				body,
				browserId: 'browser-1',
			}) as never;

		it('rejects when label is missing', async () => {
			await expect(
				controller.verifyWebAuthnRegistration(
					mkReq({ response: {}, attachment: 'platform' }),
					mock<Response>(),
				),
			).rejects.toThrow(BadRequestError);
			expect(webauthnService.verifyRegistrationResponse).not.toHaveBeenCalled();
		});

		it('rejects when attachment is invalid', async () => {
			await expect(
				controller.verifyWebAuthnRegistration(
					mkReq({ label: 'x', response: {}, attachment: 'hybrid' }),
					mock<Response>(),
				),
			).rejects.toThrow(BadRequestError);
		});

		it('throws when the library reports verified: false', async () => {
			webauthnService.verifyRegistrationResponse.mockResolvedValue({ verified: false } as never);
			await expect(
				controller.verifyWebAuthnRegistration(
					mkReq({ label: 'x', response: {}, attachment: 'platform' }),
					mock<Response>(),
				),
			).rejects.toThrow(BadRequestError);
		});

		it('throws when registrationInfo is missing despite verified: true', async () => {
			// Defensive branch — should never happen if the library is well-formed,
			// but the controller treats it the same as a failed verify.
			webauthnService.verifyRegistrationResponse.mockResolvedValue({
				verified: true,
				registrationInfo: null,
			} as never);
			await expect(
				controller.verifyWebAuthnRegistration(
					mkReq({ label: 'x', response: {}, attachment: 'platform' }),
					mock<Response>(),
				),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('getWebAuthnAuthenticationOptions', () => {
		const mkReq = (body: { email?: string; kind?: string }) => ({ body }) as never;

		it('rejects when email is missing', async () => {
			await expect(controller.getWebAuthnAuthenticationOptions(mkReq({}))).rejects.toThrow(
				BadRequestError,
			);
		});

		it('throws an MFA 998 error when the user has no MFA enabled', async () => {
			userRepository.findOne.mockResolvedValue({ mfaEnabled: false } as never);
			await expect(
				controller.getWebAuthnAuthenticationOptions(mkReq({ email: 'u@example.com' })),
			).rejects.toMatchObject({ errorCode: 998 });
		});

		it('throws an MFA 998 error when the user does not exist (no enumeration)', async () => {
			userRepository.findOne.mockResolvedValue(null);
			await expect(
				controller.getWebAuthnAuthenticationOptions(mkReq({ email: 'missing@example.com' })),
			).rejects.toMatchObject({ errorCode: 998 });
		});

		it('ignores an unknown kind value and treats it as undefined', async () => {
			userRepository.findOne.mockResolvedValue({ id: 'user-1', mfaEnabled: true } as never);
			webauthnService.generateAuthenticationOptions.mockResolvedValue({ challenge: 'c' } as never);
			await controller.getWebAuthnAuthenticationOptions(
				mkReq({ email: 'u@example.com', kind: 'totp' }),
			);
			expect(webauthnService.generateAuthenticationOptions).toHaveBeenCalledWith(
				'user-1',
				undefined,
			);
		});

		it('forwards a valid kind to the service', async () => {
			userRepository.findOne.mockResolvedValue({ id: 'user-1', mfaEnabled: true } as never);
			webauthnService.generateAuthenticationOptions.mockResolvedValue({ challenge: 'c' } as never);
			await controller.getWebAuthnAuthenticationOptions(
				mkReq({ email: 'u@example.com', kind: 'passkey' }),
			);
			expect(webauthnService.generateAuthenticationOptions).toHaveBeenCalledWith(
				'user-1',
				'passkey',
			);
		});
	});

	describe('updateWebAuthnCredential', () => {
		it('rejects when label is missing', async () => {
			const req = { user: { id: 'user-1' }, params: { id: 'c1' }, body: {} } as never;
			await expect(controller.updateWebAuthnCredential(req)).rejects.toThrow(BadRequestError);
			expect(webauthnService.updateCredentialLabel).not.toHaveBeenCalled();
		});

		it('trims the label before persisting', async () => {
			const req = {
				user: { id: 'user-1' },
				params: { id: 'c1' },
				body: { label: '  new label  ' },
			} as never;
			await controller.updateWebAuthnCredential(req);
			expect(webauthnService.updateCredentialLabel).toHaveBeenCalledWith(
				'c1',
				'user-1',
				'new label',
			);
		});
	});
});
