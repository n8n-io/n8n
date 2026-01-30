import { computed, ref, onMounted } from 'vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialType } from 'n8n-workflow';

export interface AppInfo {
	name: string;
	displayName: string;
	popularity: number;
	icon?: string;
	iconDark?: string;
}

interface NodeApiResponse {
	data: {
		nodes: {
			data: Array<{
				id: string;
				attributes: AppInfo;
			}>;
		};
	};
}

export interface AppEntry {
	app: AppInfo;
	credentialType: ICredentialType;
	supportsInstantOAuth: boolean;
}

// Generic credential types that shouldn't be shown as apps
const EXCLUDED_CREDENTIAL_TYPES = new Set([
	'oAuth2Api',
	'oAuth1Api',
	'httpBasicAuth',
	'httpDigestAuth',
	'httpHeaderAuth',
	'httpQueryAuth',
	'httpCustomAuth',
	'noAuth',
]);

// Core/utility nodes that shouldn't be shown in app selection
const EXCLUDED_NODE_NAMES = new Set([
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.code',
	'n8n-nodes-base.scheduleTrigger',
	'n8n-nodes-base.emailSend',
	'n8n-nodes-base.set',
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.merge',
	'n8n-nodes-base.splitInBatches',
	'n8n-nodes-base.noOp',
	'n8n-nodes-base.start',
	'n8n-nodes-base.stickyNote',
	'n8n-nodes-base.executeWorkflow',
	'n8n-nodes-base.executeWorkflowTrigger',
	'n8n-nodes-base.respondToWebhook',
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.errorTrigger',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
]);

export function useAppCredentials() {
	const credentialsStore = useCredentialsStore();
	const apps = ref<Map<string, AppInfo>>(new Map());
	const isLoading = ref(true);
	const error = ref<Error | null>(null);

	const fetchApps = async () => {
		try {
			const response = await fetch('https://api.n8n.io/graphql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `{
						nodes(pagination: { limit: 9999 }, sort: ["popularity", "displayName"]) {
							data {
								id
								attributes {
									name
									displayName
									popularity
									icon
									iconDark
								}
							}
						}
					}`,
				}),
			});

			const data: NodeApiResponse = await response.json();
			const appsMap = new Map<string, AppInfo>();

			for (const node of data.data.nodes.data) {
				// Skip core/utility nodes
				if (EXCLUDED_NODE_NAMES.has(node.attributes.name)) continue;

				// Store by full node name (e.g., "n8n-nodes-base.slack")
				appsMap.set(node.attributes.name, node.attributes);
				// Also store by simple name for easier matching (e.g., "slack")
				const simpleName = node.attributes.name.split('.').pop()?.toLowerCase();
				if (simpleName) {
					appsMap.set(simpleName, node.attributes);
				}
			}

			apps.value = appsMap;
		} catch (e) {
			error.value = e instanceof Error ? e : new Error('Failed to fetch apps');
		} finally {
			isLoading.value = false;
		}
	};

	const isOAuthCredentialType = (credType: ICredentialType): boolean => {
		if (!credType.extends) return false;
		return (
			credType.extends.includes('oAuth2Api') ||
			credType.extends.includes('oAuth1Api') ||
			credType.extends.includes('googleOAuth2Api') ||
			credType.extends.includes('microsoftOAuth2Api')
		);
	};

	const isGoogleOAuthType = (credType: ICredentialType): boolean => {
		if (!credType.extends) return false;
		return credType.extends.includes('googleOAuth2Api');
	};

	const isMicrosoftOAuthType = (credType: ICredentialType): boolean => {
		if (!credType.extends) return false;
		return credType.extends.includes('microsoftOAuth2Api');
	};

	const hasInstantOAuth = (credType: ICredentialType): boolean => {
		if (!isOAuthCredentialType(credType)) return false;

		// Google OAuth types always support instant OAuth (Sign in with Google)
		if (isGoogleOAuthType(credType)) {
			return true;
		}

		// Microsoft OAuth types always support instant OAuth
		if (isMicrosoftOAuthType(credType)) {
			return true;
		}

		// For other OAuth types, check if clientId and clientSecret are pre-configured
		const overwrittenProperties = credType.__overwrittenProperties;
		if (!overwrittenProperties || !Array.isArray(overwrittenProperties)) {
			return false;
		}
		return (
			overwrittenProperties.includes('clientId') && overwrittenProperties.includes('clientSecret')
		);
	};

	// Get priority score for a credential type (higher = better)
	const getCredentialPriority = (credType: ICredentialType): number => {
		const isGoogle = isGoogleOAuthType(credType);
		const isMicrosoft = isMicrosoftOAuthType(credType);
		const isOAuth2 = credType.extends?.includes('oAuth2Api');
		const isOAuth1 = credType.extends?.includes('oAuth1Api');
		const hasInstant = hasInstantOAuth(credType);

		// Google/Microsoft OAuth with native sign-in buttons are highest priority
		if (isGoogle || isMicrosoft) return 6;
		if (isOAuth2 && hasInstant) return 5;
		if (isOAuth1 && hasInstant) return 4;
		if (isOAuth2) return 3;
		if (isOAuth1) return 2;
		return 1; // API key, basic auth, etc.
	};

	// Extract base name from credential name (e.g., "slackOAuth2Api" -> "slack")
	const getBaseNameFromCredential = (credName: string): string => {
		return credName
			.toLowerCase()
			.replace(/oauth2api$/i, '')
			.replace(/oauth1api$/i, '')
			.replace(/oauthapi$/i, '')
			.replace(/api$/i, '');
	};

	// Find an app matching this credential
	const findAppForCredential = (
		credType: ICredentialType,
		appsMap: Map<string, AppInfo>,
	): AppInfo | null => {
		// First try supportedNodes
		const supportedNodes = credType.supportedNodes ?? [];
		for (const nodeName of supportedNodes) {
			const app = appsMap.get(nodeName);
			if (app) return app;

			// Try simple name
			const simpleName = nodeName.split('.').pop()?.toLowerCase();
			if (simpleName) {
				const simpleApp = appsMap.get(simpleName);
				if (simpleApp) return simpleApp;
			}
		}

		// Try matching by base name from credential type
		const baseName = getBaseNameFromCredential(credType.name);
		const app = appsMap.get(baseName);
		if (app) return app;

		return null;
	};

	const appEntries = computed((): AppEntry[] => {
		const appsData = apps.value;
		const allCredentialTypes = credentialsStore.allCredentialTypes;

		// Wait for both apps and credential types to be loaded
		if (appsData.size === 0 || allCredentialTypes.length === 0) {
			return [];
		}

		// Build entries from credentials -> apps
		// Group credentials by the app they belong to
		const appToCredentials = new Map<string, { app: AppInfo; credentials: ICredentialType[] }>();

		for (const credType of allCredentialTypes) {
			if (EXCLUDED_CREDENTIAL_TYPES.has(credType.name)) continue;

			const app = findAppForCredential(credType, appsData);
			if (!app) continue;

			const simpleAppName = app.name.split('.').pop()?.toLowerCase() ?? app.name;
			const existing = appToCredentials.get(simpleAppName);

			if (existing) {
				existing.credentials.push(credType);
			} else {
				appToCredentials.set(simpleAppName, { app, credentials: [credType] });
			}
		}

		// For each app, pick the best credential and build the entry
		const entries: AppEntry[] = [];

		for (const { app, credentials } of appToCredentials.values()) {
			// Sort credentials by priority (highest first)
			credentials.sort((a, b) => getCredentialPriority(b) - getCredentialPriority(a));
			const bestCredential = credentials[0];

			entries.push({
				app,
				credentialType: bestCredential,
				supportsInstantOAuth: hasInstantOAuth(bestCredential),
			});
		}

		// Sort entries by app popularity (ascending - lower number = more popular)
		// Entries without popularity go to the end
		entries.sort((a, b) => (a.app.popularity ?? Infinity) - (b.app.popularity ?? Infinity));

		return entries;
	});

	onMounted(() => {
		void fetchApps();
	});

	return {
		appEntries,
		isLoading,
		error,
		fetchApps,
	};
}
