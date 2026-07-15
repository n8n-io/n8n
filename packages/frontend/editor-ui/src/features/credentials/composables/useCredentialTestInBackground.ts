import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

export function useCredentialTestInBackground() {
	const credentialsStore = useCredentialsStore();

	/**
	 * Checks whether a credential type has a test mechanism defined.
	 * Returns true if either the credential type itself defines a `test` block
	 * or any node with access declares `testedBy` for it.
	 */
	const isCredentialTypeTestable = (credentialTypeName: string): boolean => {
		const credType = credentialsStore.getCredentialTypeByName(credentialTypeName);
		if (credType?.test) return true;

		const nodesWithAccess = credentialsStore.getNodesWithAccess(credentialTypeName);
		return nodesWithAccess.some((node) =>
			node.credentials?.some((cred) => cred.name === credentialTypeName && cred.testedBy),
		);
	};

	/**
	 * Tests a saved credential in the background.
	 * Fetches the credential's redacted data first so the backend can unredact and test.
	 * Skips if the credential is already tested OK or has a test in flight.
	 * The result is tracked automatically in the credentials store as a side effect of testCredential.
	 */
	async function testCredentialInBackground(
		credentialId: string,
		credentialName: string,
		credentialType: string,
	) {
		if (!isCredentialTypeTestable(credentialType)) {
			return;
		}

		if (
			credentialsStore.isCredentialTestedOk(credentialId) ||
			credentialsStore.isCredentialTestPending(credentialId)
		) {
			return;
		}

		let credentialData: ICredentialDataDecryptedObject | string | undefined;
		try {
			credentialData = (await credentialsStore.getCredentialData({ id: credentialId }))?.data;
		} catch {
			credentialData = undefined;
		}

		// Re-check after the async fetch — another caller (e.g. CredentialEdit) may have
		// started or completed a test while we were fetching credential data.
		if (
			credentialsStore.isCredentialTestedOk(credentialId) ||
			credentialsStore.isCredentialTestPending(credentialId)
		) {
			return;
		}

		if (!credentialData || typeof credentialData === 'string') {
			// Without readable data there is nothing to test (e.g. a shared credential
			// the user can't read, or the fetch failed). Record a pass so consumers
			// gating on a result don't stay blocked on a usable credential — unless a
			// real test already failed it.
			if (!credentialsStore.credentialTestResults.has(credentialId)) {
				credentialsStore.credentialTestResults.set(credentialId, 'success');
			}
			return;
		}

		const { ownedBy, sharedWithProjects, oauthTokenData, ...data } = credentialData;

		// OAuth credentials can't be tested via the API — the presence of token data
		// means the OAuth flow completed successfully, which is the equivalent of a passing test.
		if (oauthTokenData) {
			credentialsStore.credentialTestResults.set(credentialId, 'success');
			return;
		}

		try {
			await credentialsStore.testCredential({
				id: credentialId,
				name: credentialName,
				type: credentialType,
				data: data as ICredentialDataDecryptedObject,
			});
		} catch {
			// The store records the failed result as a side effect
		}
	}

	function hydrateCredentialTestResults(results: Array<{ id: string; success: boolean }>) {
		for (const { id, success } of results) {
			credentialsStore.credentialTestResults.set(id, success ? 'success' : 'error');
		}
	}

	return {
		isCredentialTypeTestable,
		testCredentialInBackground,
		hydrateCredentialTestResults,
	};
}
