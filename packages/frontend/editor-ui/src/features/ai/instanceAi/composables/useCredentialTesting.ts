import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { SetupCard } from '../instanceAiWorkflowSetup.utils';

export function useCredentialTesting(getCardCredentialId: (card: SetupCard) => string | null) {
	const credentialsStore = useCredentialsStore();

	function isCredentialTypeTestable(credentialTypeName: string): boolean {
		const credType = credentialsStore.getCredentialTypeByName(credentialTypeName);
		if (credType?.test) return true;
		const nodesWithAccess = credentialsStore.getNodesWithAccess(credentialTypeName);
		return nodesWithAccess.some((node) =>
			node.credentials?.some((cred) => cred.name === credentialTypeName && cred.testedBy),
		);
	}

	async function testCredentialInBackground(
		credentialId: string,
		credentialName: string,
		credentialType: string,
	) {
		if (!isCredentialTypeTestable(credentialType)) return;
		if (
			credentialsStore.isCredentialTestedOk(credentialId) ||
			credentialsStore.isCredentialTestPending(credentialId)
		) {
			return;
		}

		try {
			const credentialResponse = await credentialsStore.getCredentialData({ id: credentialId });
			if (!credentialResponse?.data || typeof credentialResponse.data === 'string') return;

			// Re-check after the async fetch
			if (
				credentialsStore.isCredentialTestedOk(credentialId) ||
				credentialsStore.isCredentialTestPending(credentialId)
			) {
				return;
			}

			const {
				ownedBy: _ownedBy,
				sharedWithProjects: _sharedWithProjects,
				oauthTokenData,
				...data
			} = credentialResponse.data as Record<string, unknown>;

			// OAuth credentials: token presence = success
			if (oauthTokenData) {
				credentialsStore.credentialTestResults.set(credentialId, 'success');
				return;
			}

			await credentialsStore.testCredential({
				id: credentialId,
				name: credentialName,
				type: credentialType,
				data: data as ICredentialDataDecryptedObject,
			});
		} catch {
			// Ensure the credential is not stuck in a pending/unknown state —
			// write 'error' so the card shows a warning icon instead of an eternal spinner.
			credentialsStore.credentialTestResults.set(credentialId, 'error');
		}
	}

	/**
	 * Returns the credential test result for a card.
	 * - Store result (keyed by credential ID): authoritative for any credential the client has tested
	 * - Backend result (card.credentialTestResult): only valid when the selected credential
	 *   matches the original backend-assigned credential (unchanged selection)
	 * - Returns undefined when no result is available yet (triggers spinner for testable types)
	 */
	function getEffectiveCredTestResult(
		card: SetupCard,
	): { success: boolean; message?: string } | undefined {
		const selectedId = getCardCredentialId(card);
		if (!selectedId) return undefined;

		// 1. Store has a definitive result for this credential — always trust it
		if (credentialsStore.isCredentialTestedOk(selectedId)) {
			return { success: true };
		}
		if (credentialsStore.isCredentialTestPending(selectedId)) {
			return undefined; // in-progress
		}
		const storeResult = credentialsStore.credentialTestResults.get(selectedId);
		if (storeResult === 'error') {
			return { success: false };
		}

		// 2. Backend-provided result — only valid if the selection hasn't changed.
		const originalCredId = card.nodes[0]?.node.credentials?.[card.credentialType!]?.id;
		if (card.credentialTestResult && selectedId === originalCredId) {
			return card.credentialTestResult;
		}

		// 3. No result available
		return undefined;
	}

	function getCredTestIcon(card: SetupCard): 'spinner' | 'check' | 'triangle-alert' | null {
		if (!card.credentialType) return null;
		const selectedId = getCardCredentialId(card);
		if (!selectedId) return null;

		const testResult = getEffectiveCredTestResult(card);
		if (testResult === undefined) {
			return isCredentialTypeTestable(card.credentialType) ? 'spinner' : null;
		}
		if (testResult.success) return 'check';
		return 'triangle-alert';
	}

	return {
		isCredentialTypeTestable,
		testCredentialInBackground,
		getEffectiveCredTestResult,
		getCredTestIcon,
	};
}
