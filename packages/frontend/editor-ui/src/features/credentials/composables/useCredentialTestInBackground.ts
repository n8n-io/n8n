import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { until } from '@vueuse/core';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

export function useCredentialTestInBackground() {
	const credentialsStore = useCredentialsStore();

	/**
	 * Checks whether a credential type has a test mechanism defined.
	 * Kept as part of this composable's surface — several callers consume it from here.
	 */
	const isCredentialTypeTestable = (credentialTypeName: string): boolean =>
		credentialsStore.isCredentialTypeTestable(credentialTypeName);

	/**
	 * Tests a saved credential in the background.
	 * Fetches the credential's redacted data first so the backend can unredact and test.
	 * Reuses a successful result or waits for a test in flight.
	 * The result is tracked automatically in the credentials store as a side effect of testCredential.
	 */
	async function testCredentialInBackground(
		credentialId: string,
		credentialName: string,
		credentialType: string,
	): Promise<boolean | undefined> {
		if (!isCredentialTypeTestable(credentialType)) {
			return;
		}

		if (
			credentialsStore.isCredentialTestedOk(credentialId) ||
			credentialsStore.isCredentialTestPending(credentialId)
		) {
			await until(() => credentialsStore.isCredentialTestPending(credentialId)).toBe(false);
			return credentialsStore.isCredentialTestedOk(credentialId);
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
			await until(() => credentialsStore.isCredentialTestPending(credentialId)).toBe(false);
			return credentialsStore.isCredentialTestedOk(credentialId);
		}

		if (!credentialData || typeof credentialData === 'string') {
			// Without readable data there is nothing to test (e.g. a shared credential
			// the user can't read, or the fetch failed). Record a pass so consumers
			// gating on a result don't stay blocked on a usable credential — unless a
			// real test already failed it.
			if (!credentialsStore.credentialTestResults.has(credentialId)) {
				credentialsStore.credentialTestResults.set(credentialId, 'success');
			}
			return credentialsStore.isCredentialTestedOk(credentialId);
		}

		const { ownedBy, sharedWithProjects, oauthTokenData, ...data } = credentialData;

		// OAuth credentials can't be tested via the API — the presence of token data
		// means the OAuth flow completed successfully, which is the equivalent of a passing test.
		if (oauthTokenData) {
			credentialsStore.credentialTestResults.set(credentialId, 'success');
			return true;
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
		return credentialsStore.isCredentialTestedOk(credentialId);
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
