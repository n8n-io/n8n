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
 * Pass `preferKind: 'passkey' | 'security_key'` to force a webauthn ceremony with
 * a credential of that type (used when removing a credential — the user is asked
 * to re-verify with the same kind of authenticator they're removing). When the
 * user doesn't have any credentials of that kind, this falls back to the
 * code/recovery-code prompt.
 *
 * Resolves with `null` if the user cancels.
 */
export function useMfaReverify() {
	const usersStore = useUsersStore();
	const uiStore = useUIStore();

	const promptCode = async (): Promise<MfaProof | null> =>
		await new Promise<MfaProof | null>((resolve) => {
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

	async function reverify(preferKind?: 'passkey' | 'security_key'): Promise<MfaProof | null> {
		const user = usersStore.currentUser;
		if (!user || !user.mfaEnabled) return null;

		const methods = user.availableMfaMethods ?? [];
		const chosen: 'totp' | 'passkey' | 'security_key' =
			preferKind && methods.includes(preferKind) ? preferKind : (methods[0] ?? 'totp');

		if (chosen === 'totp') {
			return await promptCode();
		}

		if (!user.email) return null;
		try {
			const webauthnResponse = await usersStore.verifyWebAuthnAuthentication(user.email, chosen);
			return { webauthnResponse };
		} catch {
			// Authenticator unavailable (lost device, cancelled ceremony) — fall
			// back to the code/recovery-code prompt so users can still manage
			// their account with a recovery code.
			return await promptCode();
		}
	}

	return { reverify };
}
