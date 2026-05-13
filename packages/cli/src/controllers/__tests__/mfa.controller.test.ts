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
});
