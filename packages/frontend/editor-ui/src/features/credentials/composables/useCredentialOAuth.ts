import { useToast } from '@/app/composables/useToast';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';
import { createResultError, createResultOk, type GenericValue, type Result } from 'n8n-workflow';

import { useCredentialsStore } from '../credentials.store';
import type { ICredentialsResponse } from '../credentials.types';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

/**
 * Composable for OAuth credential type detection and authorization.
 * Used by NodeCredentials for the quick connect OAuth flow.
 */
export function useCredentialOAuth() {
	const credentialsStore = useCredentialsStore();
	const projectsStore = useProjectsStore();
	const workflowsStore = useWorkflowsStore();

	const toast = useToast();
	const i18n = useI18n();
	const telemetry = useTelemetry();

	const oauthAbortController = ref<AbortController | null>(null);
	const pendingCredentialId = ref<string | null>(null);

	/**
	 * Get parent types for a credential type (e.g., googleSheetsOAuth2Api extends googleOAuth2Api extends oAuth2Api).
	 */
	function getParentTypes(credentialTypeName: string, visited = new Set<string>()): string[] {
		if (visited.has(credentialTypeName)) return [];
		visited.add(credentialTypeName);

		const type = credentialsStore.getCredentialTypeByName(credentialTypeName);
		if (type?.extends === undefined) return [];

		const types: string[] = [];
		for (const typeName of type.extends) {
			types.push(typeName);
			types.push(...getParentTypes(typeName, visited));
		}
		return types;
	}

	/**
	 * Check if a credential type is an OAuth type (extends oAuth2Api or oAuth1Api).
	 */
	function isOAuthCredentialType(credentialTypeName: string): boolean {
		const parentTypes = getParentTypes(credentialTypeName);
		return (
			credentialTypeName === 'oAuth2Api' ||
			credentialTypeName === 'oAuth1Api' ||
			parentTypes.includes('oAuth2Api') ||
			parentTypes.includes('oAuth1Api')
		);
	}

	/**
	 * Check if a credential type is Google OAuth (extends googleOAuth2Api).
	 */
	function isGoogleOAuthType(credentialTypeName: string): boolean {
		const parentTypes = getParentTypes(credentialTypeName);
		return credentialTypeName === 'googleOAuth2Api' || parentTypes.includes('googleOAuth2Api');
	}

	/**
	 * Check if an OAuth credential type has all required fields managed/overwritten.
	 * This indicates the credential can be used with quick connect (just OAuth flow, no manual config).
	 * Reuses logic patterns from CredentialEdit.vue (credentialProperties + requiredPropertiesFilled).
	 */
	function hasManagedOAuthCredentials(credentialTypeName: string): boolean {
		if (!isOAuthCredentialType(credentialTypeName)) {
			return false;
		}

		const credentialType = credentialsStore.getCredentialTypeByName(credentialTypeName);
		if (!credentialType) {
			return false;
		}

		const overwrittenProperties = credentialType.__overwrittenProperties ?? [];
		if (overwrittenProperties.length === 0) {
			return false;
		}

		const visibleProperties = credentialType.properties.filter(
			(prop) =>
				prop.type !== 'hidden' &&
				prop.type !== 'notice' &&
				!overwrittenProperties.includes(prop.name),
		);

		return visibleProperties.every(
			(prop) => prop.required !== true || (prop.type !== 'string' && prop.type !== 'number'),
		);
	}

	async function getOAuthAuthorizationUrl(
		credential: ICredentialsResponse,
	): Promise<Result<string, 'api-error' | 'no-url'>> {
		const parentTypes = getParentTypes(credential.type);

		try {
			if (credential.type === 'oAuth2Api' || parentTypes.includes('oAuth2Api')) {
				return createResultOk(await credentialsStore.oAuth2Authorize(credential));
			}
			if (credential.type === 'oAuth1Api' || parentTypes.includes('oAuth1Api')) {
				return createResultOk(await credentialsStore.oAuth1Authorize(credential));
			}
		} catch (error) {
			toast.showError(
				error,
				i18n.baseText('credentialEdit.credentialEdit.showError.generateAuthorizationUrl.title'),
			);
			return createResultError('api-error');
		}

		return createResultError('no-url');
	}

	function isValidHttpUrl(url: string): boolean {
		try {
			const parsed = new URL(url);
			return ['http:', 'https:'].includes(parsed.protocol);
		} catch {
			return false;
		}
	}

	function showOAuthUrlError(): void {
		toast.showError(
			new Error(i18n.baseText('credentialEdit.credentialEdit.showError.invalidOAuthUrl.message')),
			i18n.baseText('credentialEdit.credentialEdit.showError.invalidOAuthUrl.title'),
		);
	}

	function openOAuthPopup(url: string, signal?: AbortSignal): Window | null {
		const params =
			'scrollbars=no,resizable=yes,status=no,titlebar=no,location=no,toolbar=no,menubar=no,width=500,height=700';
		const popup = window.open(url, 'OAuth Authorization', params);

		signal?.addEventListener('abort', () => {
			popup?.close();
		});

		return popup;
	}

	async function waitForOAuthCallback(popup: Window, signal?: AbortSignal): Promise<boolean> {
		return await new Promise((resolve) => {
			const oauthChannel = new BroadcastChannel('oauth-callback');
			let settled = false;

			const settle = (result: boolean) => {
				if (settled) return;
				settled = true;
				oauthChannel.close();
				resolve(result);
			};

			signal?.addEventListener('abort', () => {
				settle(false);
			});

			oauthChannel.addEventListener('message', (event: MessageEvent) => {
				popup.close();

				if (event.data === 'success') {
					toast.showMessage({
						title: i18n.baseText('nodeCredentials.oauth.accountConnected'),
						type: 'success',
					});
					settle(true);
				} else {
					toast.showMessage({
						title: i18n.baseText('nodeCredentials.oauth.accountConnectionFailed'),
						type: 'error',
					});
					settle(false);
				}
			});
		});
	}

	/**
	 * Authorize OAuth credentials by opening a popup and listening for callback.
	 * Returns true if OAuth was successful, false if cancelled or failed.
	 */
	async function authorize(
		credential: ICredentialsResponse,
		signal?: AbortSignal,
	): Promise<boolean> {
		const urlResult = await getOAuthAuthorizationUrl(credential);
		if (!urlResult.ok) {
			if (urlResult.error === 'no-url') showOAuthUrlError();
			return false;
		}

		if (!isValidHttpUrl(urlResult.result)) {
			showOAuthUrlError();
			return false;
		}

		const popup = openOAuthPopup(urlResult.result, signal);
		if (!popup) {
			showOAuthUrlError();
			return false;
		}

		return await waitForOAuthCallback(popup, signal);
	}

	/**
	 * Create a new OAuth credential and run the full authorization flow.
	 * Returns the credential on success, null on failure (cleans up automatically).
	 */
	async function createAndAuthorize(
		credentialTypeName: string,
		nodeType?: string,
	): Promise<ICredentialsResponse | null> {
		const credentialType = credentialsStore.getCredentialTypeByName(credentialTypeName);
		if (!credentialType) {
			return null;
		}

		let credential: ICredentialsResponse;
		try {
			credential = await credentialsStore.createNewCredential(
				{
					id: '',
					name: credentialType.displayName,
					type: credentialTypeName,
					data: { allowedHttpRequestDomains: 'none' },
				},
				projectsStore.currentProject?.id,
				undefined,
				{ skipStoreUpdate: true },
			);

			telemetry.track('User created credentials', {
				credential_type: credential.type,
				credential_id: credential.id,
				workflow_id: workflowsStore.workflowId,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('nodeCredentials.showMessage.title'));
			return null;
		}

		const controller = new AbortController();
		oauthAbortController.value = controller;
		pendingCredentialId.value = credential.id;

		const success = await authorize(credential, controller.signal);

		oauthAbortController.value = null;
		pendingCredentialId.value = null;

		const trackProperties: Record<string, GenericValue> = {
			credential_type: credentialTypeName,
			workflow_id: workflowsStore.workflowId ?? null,
			credential_id: credential.id,
			is_complete: true,
			is_new: true,
			is_valid: success,
			uses_external_secrets: false,
		};

		if (nodeType) {
			trackProperties.node_type = nodeType;
		}

		telemetry.track('User saved credentials', trackProperties);

		if (success) {
			credentialsStore.upsertCredential(credential);

			return credential;
		}

		void credentialsStore.deleteCredential({ id: credential.id });
		return null;
	}

	/**
	 * Cancel any in-progress OAuth authorization and clean up the pending credential.
	 */
	function cancelAuthorize() {
		if (oauthAbortController.value) {
			oauthAbortController.value.abort();
		}
		if (pendingCredentialId.value) {
			void credentialsStore.deleteCredential({ id: pendingCredentialId.value });
		}
	}

	return {
		getParentTypes,
		isOAuthCredentialType,
		isGoogleOAuthType,
		hasManagedOAuthCredentials,
		authorize,
		createAndAuthorize,
		cancelAuthorize,
	};
}
