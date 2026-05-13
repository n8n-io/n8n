import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { PROMPT_MFA_CODE_MODAL_KEY } from '@/app/constants';
import { promptMfaCodeBus } from '../auth.eventBus';

export type MfaProof =
	| { mfaCode: string; mfaRecoveryCode?: undefined; webauthnResponse?: undefined }
	| { mfaCode?: undefined; mfaRecoveryCode: string; webauthnResponse?: undefined }
	| { mfaCode?: undefined; mfaRecoveryCode?: undefined; webauthnResponse: unknown };

/**
 * Returns a function that obtains a fresh proof of the user's active 2FA method —
 * either a TOTP code (or recovery code) via the existing prompt modal, or a
 * webauthn assertion ceremony. The caller forwards the returned proof to whichever
 * endpoint requires re-verification (e.g. disable MFA, change password, change email).
 *
 * Resolves with `null` if the user cancels.
 */
export function useMfaReverify() {
	const usersStore = useUsersStore();
	const uiStore = useUIStore();

	async function reverify(): Promise<MfaProof | null> {
		const user = usersStore.currentUser;
		if (!user || !user.mfaEnabled) return null;

		const methods = user.availableMfaMethods ?? [];
		const method = methods[0] ?? 'totp';

		if (method === 'totp') {
			return await new Promise<MfaProof | null>((resolve) => {
				const handler = (payload: { mfaCode?: string; mfaRecoveryCode?: string } | undefined) => {
					promptMfaCodeBus.off('closed', handler);
					if (!payload) return resolve(null);
					if (payload.mfaCode) return resolve({ mfaCode: payload.mfaCode });
					if (payload.mfaRecoveryCode) return resolve({ mfaRecoveryCode: payload.mfaRecoveryCode });
					resolve(null);
				};
				promptMfaCodeBus.on('closed', handler);
				uiStore.openModal(PROMPT_MFA_CODE_MODAL_KEY);
			});
		}

		// webauthn — passkey or security_key
		if (!user.email) return null;
		try {
			const webauthnResponse = await usersStore.verifyWebAuthnAuthentication(user.email);
			return { webauthnResponse };
		} catch {
			return null;
		}
	}

	return { reverify };
}
