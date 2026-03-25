import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { INodeProperties } from 'n8n-workflow';

import {
	BOOTSTRAP_FIELD_PATTERNS,
	KNOWN_BOOTSTRAP_FIELDS,
	TOKEN_FIELD_PATTERNS,
	SERVER_FIELD_PATTERNS,
} from '../constants';
import { RECIPE_OVERRIDES } from '../data/recipeOverrides';
import type {
	ConfidenceReason,
	CredentialSetupRecipe,
	ResolvedSetupRecipe,
	SetupConfidence,
	SetupStep,
} from '../credentialsSetup.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesBootstrapPattern(fieldName: string): boolean {
	const lower = fieldName.toLowerCase();
	return BOOTSTRAP_FIELD_PATTERNS.some((pattern) => lower.includes(pattern));
}

function isKnownBootstrapField(fieldName: string): boolean {
	return KNOWN_BOOTSTRAP_FIELDS.has(fieldName);
}

function isTokenField(prop: INodeProperties): boolean {
	if (prop.typeOptions && 'password' in prop.typeOptions && prop.typeOptions.password) {
		return true;
	}
	const lower = prop.name.toLowerCase();
	return TOKEN_FIELD_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
}

function isServerField(prop: INodeProperties): boolean {
	const lower = prop.name.toLowerCase();
	return SERVER_FIELD_PATTERNS.some((pattern) => lower === pattern.toLowerCase());
}

function downgradeConfidence(confidence: SetupConfidence): SetupConfidence {
	if (confidence === 'high') return 'medium';
	return 'low';
}

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

export function useRecipeResolver() {
	const credentialsStore = useCredentialsStore();

	function getParentTypes(name: string, visited = new Set<string>()): string[] {
		if (visited.has(name)) return [];
		visited.add(name);

		const type = credentialsStore.getCredentialTypeByName(name);
		if (!type?.extends) return [];

		const types: string[] = [];
		for (const parentName of type.extends) {
			types.push(parentName);
			types.push(...getParentTypes(parentName, visited));
		}
		return types;
	}

	function isOAuthType(name: string): boolean {
		const parents = getParentTypes(name);
		return (
			name === 'oAuth2Api' ||
			name === 'oAuth1Api' ||
			parents.includes('oAuth2Api') ||
			parents.includes('oAuth1Api')
		);
	}

	function isGoogleOAuthType(name: string): boolean {
		const parents = getParentTypes(name);
		return name === 'googleOAuth2Api' || parents.includes('googleOAuth2Api');
	}

	function isMicrosoftOAuthType(name: string): boolean {
		const parents = getParentTypes(name);
		return name === 'microsoftOAuth2Api' || parents.includes('microsoftOAuth2Api');
	}

	function getAllProperties(name: string, visited = new Set<string>()): INodeProperties[] {
		if (visited.has(name)) return [];
		visited.add(name);

		const type = credentialsStore.getCredentialTypeByName(name);
		if (!type) return [];

		// Collect parent properties first (child overrides parent)
		const parentProps: INodeProperties[] = [];
		if (type.extends) {
			for (const parentName of type.extends) {
				parentProps.push(...getAllProperties(parentName, visited));
			}
		}

		// Deduplicate: child properties override parent properties with the same name
		const propMap = new Map<string, INodeProperties>();
		for (const p of parentProps) {
			propMap.set(p.name, p);
		}
		for (const p of type.properties) {
			propMap.set(p.name, p);
		}

		return [...propMap.values()];
	}

	function getVisibleRequiredFields(name: string): INodeProperties[] {
		const type = credentialsStore.getCredentialTypeByName(name);
		const overwritten = type?.__overwrittenProperties ?? [];
		const allProps = getAllProperties(name);

		return allProps.filter((p) => {
			// Must be required
			if (!p.required) return false;
			// Exclude overwritten
			if (overwritten.includes(p.name)) return false;
			// Exclude hidden and notice
			if (p.type === 'hidden' || p.type === 'notice') return false;
			// For non-string/non-number types, exclude if they have a default value
			if (p.type !== 'string' && p.type !== 'number') {
				if (p.default !== undefined && p.default !== null && p.default !== '') return false;
			}
			return true;
		});
	}

	function resolveSetupRecipe(credentialTypeName: string): ResolvedSetupRecipe {
		// 1. Check explicit overrides
		if (RECIPE_OVERRIDES.has(credentialTypeName)) {
			const recipe = RECIPE_OVERRIDES.get(credentialTypeName)!;
			return {
				recipe,
				confidence: 'high',
				confidenceReasons: ['explicit_override'],
				resolutionSource: 'explicit_override',
				credentialType: credentialTypeName,
			};
		}

		const type = credentialsStore.getCredentialTypeByName(credentialTypeName);
		if (!type) {
			return {
				recipe: {
					setupMode: 'generic',
					friction: 'multi_step',
				},
				confidence: 'low',
				confidenceReasons: ['fallback_generic'],
				resolutionSource: 'inference',
				credentialType: credentialTypeName,
			};
		}

		// 2. __skipManagedCreation → generic immediately
		if (type.__skipManagedCreation) {
			return {
				recipe: {
					setupMode: 'generic',
					friction: 'multi_step',
				},
				confidence: 'low',
				confidenceReasons: ['fallback_generic'],
				resolutionSource: 'inference',
				credentialType: credentialTypeName,
			};
		}

		const isOAuth = isOAuthType(credentialTypeName);
		const overwritten = type.__overwrittenProperties ?? [];
		const hasClientOverwrite =
			overwritten.includes('clientId') && overwritten.includes('clientSecret');
		const visibleRequired = getVisibleRequiredFields(credentialTypeName);

		let recipe: CredentialSetupRecipe;
		let confidence: SetupConfidence;
		const confidenceReasons: ConfidenceReason[] = [];

		// Determine token/server field presence for later rules
		const tokenFields = visibleRequired.filter((p) => isTokenField(p));
		const serverFields = visibleRequired.filter((p) => isServerField(p));

		// Rule 1: Google/Microsoft OAuth parent → managedOAuth
		if (isGoogleOAuthType(credentialTypeName) || isMicrosoftOAuthType(credentialTypeName)) {
			recipe = {
				setupMode: 'managedOAuth',
				friction: 'one_click',
				preSteps: [],
				postSteps: [{ kind: 'oauth', managed: true }, { kind: 'test' }],
			};
			confidence = 'high';
			confidenceReasons.push('oauth_managed_clients');
		}
		// Rule 2: OAuth + clientId/clientSecret overwritten + no visible required fields → managedOAuth
		else if (isOAuth && hasClientOverwrite && visibleRequired.length === 0) {
			recipe = {
				setupMode: 'managedOAuth',
				friction: 'one_click',
				preSteps: [],
				postSteps: [{ kind: 'oauth', managed: true }, { kind: 'test' }],
			};
			confidence = 'high';
			confidenceReasons.push('oauth_managed_clients', 'no_visible_required_fields');
		}
		// Rule 3: OAuth + clientId/clientSecret overwritten + exactly 1 visible required field matching bootstrap pattern → tenantOAuth
		else if (isOAuth && hasClientOverwrite && visibleRequired.length === 1) {
			const field = visibleRequired[0];
			const knownBootstrap = isKnownBootstrapField(field.name);
			const patternBootstrap = matchesBootstrapPattern(field.name);

			if (knownBootstrap || patternBootstrap) {
				const preSteps: SetupStep[] = [{ kind: 'field', field: field.name }];
				recipe = {
					setupMode: 'tenantOAuth',
					friction: 'one_field_then_connect',
					preSteps,
					postSteps: [{ kind: 'oauth', managed: true }, { kind: 'test' }],
				};
				confidence = knownBootstrap ? 'high' : 'medium';
				confidenceReasons.push('single_bootstrap_field');
			} else {
				// Single field but not a bootstrap pattern — fall through to later rules
				recipe = {
					setupMode: 'generic',
					friction: 'multi_step',
				};
				confidence = 'low';
				confidenceReasons.push('unknown_field_pattern', 'fallback_generic');
			}
		}
		// Rule 4: Not OAuth + 1-2 token-like fields + no server fields → tokenManual
		else if (
			!isOAuth &&
			tokenFields.length >= 1 &&
			tokenFields.length <= 2 &&
			serverFields.length === 0
		) {
			// Check if all visible required fields are token fields
			const nonTokenFields = visibleRequired.filter((p) => !isTokenField(p));
			if (nonTokenFields.length === 0) {
				recipe = {
					setupMode: 'tokenManual',
					friction: 'paste_token',
					preSteps: [{ kind: 'info', key: 'token_acquisition_hint' }],
					postSteps: [{ kind: 'test' }],
				};
				confidence = 'high';
				confidenceReasons.push('token_like_fields');
			} else {
				// Has extra non-token fields — fall through to generic
				recipe = {
					setupMode: 'generic',
					friction: 'multi_step',
				};
				confidence = 'low';
				confidenceReasons.push('fallback_generic');
			}
		}
		// Rule 5: Has server-like + auth fields → serverManual
		else if (!isOAuth && serverFields.length > 0 && tokenFields.length > 0) {
			recipe = {
				setupMode: 'serverManual',
				friction: 'server_wizard',
				postSteps: [{ kind: 'test' }],
			};
			confidence = 'medium';
			confidenceReasons.push('server_like_fields');
		}
		// Fallback → generic
		else {
			recipe = {
				setupMode: 'generic',
				friction: 'multi_step',
			};
			confidence = 'low';
			confidenceReasons.push('fallback_generic');
		}

		// Confidence downgrades
		// >3 visible required fields → downgrade one level
		if (visibleRequired.length > 3) {
			confidence = downgradeConfidence(confidence);
			if (!confidenceReasons.includes('hybrid_extra_fields')) {
				confidenceReasons.push('hybrid_extra_fields');
			}
		}

		return {
			recipe,
			confidence,
			confidenceReasons,
			resolutionSource: 'inference',
			credentialType: credentialTypeName,
		};
	}

	return { resolveSetupRecipe };
}
