import { ref } from 'vue';
import { i18n } from '@n8n/i18n';
import type { ICredentialDataDecryptedObject, ICredentialsDecrypted } from 'n8n-workflow';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useCredentialTestInBackground } from '@/features/credentials/composables/useCredentialTestInBackground';

const genericError = () => i18n.baseText('instanceAi.workflowSetup.credentialTestFailedTooltip');

export function useInstanceCredentialTest() {
	const credentialsStore = useCredentialsStore();
	const { isCredentialTypeTestable } = useCredentialTestInBackground();
	const credentialTestError = ref('');
	const isTestingCredential = ref(false);

	async function runCredentialTest(credentials: ICredentialsDecrypted): Promise<boolean> {
		const result = await credentialsStore.testCredential(credentials);
		if (result.status === 'OK') return true;

		credentialTestError.value = result.message || genericError();
		return false;
	}

	async function testCredential(credentials: ICredentialsDecrypted): Promise<boolean> {
		credentialTestError.value = '';
		if (!isCredentialTypeTestable(credentials.type)) return true;

		isTestingCredential.value = true;
		try {
			return await runCredentialTest(credentials);
		} catch {
			credentialTestError.value = genericError();
			return false;
		} finally {
			isTestingCredential.value = false;
		}
	}

	async function testSavedCredential(id: string, name: string, type: string): Promise<boolean> {
		if (!isCredentialTypeTestable(type)) return true;

		credentialTestError.value = '';
		isTestingCredential.value = true;
		try {
			const credential = await credentialsStore.getCredentialData({ id });
			const credentialData = credential && 'data' in credential ? credential.data : undefined;
			if (!credentialData || typeof credentialData === 'string') throw new Error();

			const {
				ownedBy: _ownedBy,
				sharedWithProjects: _sharedWithProjects,
				oauthTokenData,
				...data
			} = credentialData;
			if (oauthTokenData) {
				credentialsStore.credentialTestResults.set(id, 'success');
				return true;
			}

			return await runCredentialTest({
				id,
				name,
				type,
				data: data as ICredentialDataDecryptedObject,
			});
		} catch {
			credentialsStore.credentialTestResults.set(id, 'error');
			credentialTestError.value = genericError();
			return false;
		} finally {
			isTestingCredential.value = false;
		}
	}

	function restoreStoredError(id: string | null | undefined) {
		credentialTestError.value =
			id && credentialsStore.credentialTestResults.get(id) === 'error' ? genericError() : '';
	}

	return {
		credentialTestError,
		isTestingCredential,
		testCredential,
		testSavedCredential,
		restoreStoredError,
	};
}
