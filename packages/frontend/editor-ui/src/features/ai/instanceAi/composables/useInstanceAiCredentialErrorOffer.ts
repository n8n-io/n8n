import { watch, type MaybeRefOrGetter, toValue } from 'vue';
import { useI18n } from '@n8n/i18n';

import { useInstanceAiProactiveOffer } from './useInstanceAiProactiveOffer';
import { buildCredentialErrorSeedMessage, credentialErrorOfferKey } from '../instanceAiProactive';

/**
 * What the offer needs to know about a failed credential test. Deliberately a
 * plain shape rather than the credential form's props — reading the form is the
 * credentials feature's job, phrasing the offer is this one's.
 *
 * Carries no credential data: the type, the name shown in the UI, the node it's
 * configured for and the auth error string only.
 */
export interface CredentialTestFailure {
	credentialType: string;
	displayName: string;
	errorMessage: string;
	/** Node the credential is configured for; absent outside the editor. */
	nodeName?: string;
	/** Lets the agent read the credential itself instead of guessing which failed. */
	credentialId?: string;
}

/**
 * Offers to explain a failed credential test, which is otherwise a dead end —
 * the danger banner's only action is Retry.
 *
 * Restraint comes from `useInstanceAiProactiveOffer`: the dwell delay means the
 * offer never lands mid-typing, and `credentialErrorOfferKey` means one offer per
 * credential-and-error, so retrying the same failure doesn't re-offer while a
 * credential that starts failing differently does.
 *
 * Pass `null` once the test passes — unlike a failed execution, a failed
 * credential test can resolve, and an offer still sitting in its dwell would
 * otherwise surface seconds later to explain an error already fixed.
 */
export function useInstanceAiCredentialErrorOffer(
	failure: MaybeRefOrGetter<CredentialTestFailure | null>,
) {
	const i18n = useI18n();
	const { raise, retract } = useInstanceAiProactiveOffer();

	let raisedKey: string | null = null;

	watch(
		() => toValue(failure),
		(credential) => {
			if (!credential) {
				if (raisedKey) retract(raisedKey);
				raisedKey = null;
				return;
			}

			const key = credentialErrorOfferKey(
				credential.credentialType,
				credential.credentialId || credential.displayName,
				credential.errorMessage,
			);

			raisedKey = key;
			raise({
				key,
				title: i18n.baseText('instanceAi.proactiveOffer.credentialError.title'),
				message: buildCredentialErrorSeedMessage(credential),
				source: 'proactive_offer',
			});
		},
		{ immediate: true },
	);
}
