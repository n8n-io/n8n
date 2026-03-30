import type { ClientOAuth2Options, ClientOAuth2RequestObject } from '@n8n/client-oauth2';
import type { OAuth2CredentialData } from '@n8n/client-oauth2';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

export enum OAuth2ErrorType {
	INVALID_CLIENT = 'invalid_client',
	INVALID_CODE = 'invalid_grant',
	REDIRECT_URI_MISMATCH = 'redirect_uri_mismatch',
	SCOPE_MISMATCH = 'invalid_scope',
	PROVIDER_SPECIFIC = 'provider_specific',
	UNKNOWN = 'unknown',
}

export interface OAuth2ErrorClassification {
	type: OAuth2ErrorType;
	userMessage: string;
	technicalDetails?: string;
}

export interface OAuth2ProviderQuirks {
	/**
	 * Whether this provider requires redirect_uri in token exchange request
	 * even when using body authentication
	 */
	requiresRedirectUriInTokenExchange?: boolean;

	/**
	 * Whether to include redirect_uri even if authentication is 'body'
	 */
	alwaysIncludeRedirectUri?: boolean;

	/**
	 * Custom headers to add to token exchange request
	 */
	customHeaders?: Record<string, string>;

	/**
	 * Transform the token exchange request body
	 */
	transformTokenExchangeBody?: (
		body: Record<string, unknown>,
		options: ClientOAuth2Options,
	) => Record<string, unknown>;

	/**
	 * Classify OAuth errors from this provider
	 */
	classifyError?: (errorBody: unknown, statusCode?: number) => OAuth2ErrorClassification | null;
}

@Service()
export class OAuthProviderQuirksService {
	private readonly quirks: Map<string, OAuth2ProviderQuirks> = new Map();

	constructor(private readonly logger: Logger) {
		this.registerHighLevelQuirks();
	}

	private registerHighLevelQuirks(): void {
		this.quirks.set('highLevelOAuth2Api', {
			requiresRedirectUriInTokenExchange: true,
			alwaysIncludeRedirectUri: true,
			classifyError: (errorBody: unknown, statusCode?: number): OAuth2ErrorClassification | null => {
				if (typeof errorBody !== 'object' || errorBody === null) {
					return null;
				}

				const body = errorBody as Record<string, unknown>;
				const error = body.error as string | undefined;
				const errorDescription = body.error_description as string | undefined;

				if (error === 'invalid_client') {
					return {
						type: OAuth2ErrorType.INVALID_CLIENT,
						userMessage:
							'Invalid client credentials. Please verify your Client ID and Client Secret in the HighLevel app settings.',
						technicalDetails: errorDescription,
					};
				}

				if (error === 'invalid_grant') {
					// Check if it's a redirect URI mismatch
					if (
						errorDescription?.toLowerCase().includes('redirect') ||
						errorDescription?.toLowerCase().includes('uri')
					) {
						return {
							type: OAuth2ErrorType.REDIRECT_URI_MISMATCH,
							userMessage:
								'Redirect URI mismatch. The redirect URI used in the token exchange must exactly match the one used in the authorization request.',
							technicalDetails: errorDescription,
						};
					}

					return {
						type: OAuth2ErrorType.INVALID_CODE,
						userMessage:
							'Invalid or expired authorization code. Please try connecting your HighLevel credentials again.',
						technicalDetails: errorDescription,
					};
				}

				if (error === 'invalid_scope') {
					return {
						type: OAuth2ErrorType.SCOPE_MISMATCH,
						userMessage:
							'Invalid scopes. Please verify that the requested scopes are enabled in your HighLevel app settings.',
						technicalDetails: errorDescription,
					};
				}

				if (error) {
					return {
						type: OAuth2ErrorType.PROVIDER_SPECIFIC,
						userMessage: errorDescription || `HighLevel API error: ${error}`,
						technicalDetails: errorDescription || String(error),
					};
				}

				return null;
			},
		});
	}

	getQuirks(credentialType: string): OAuth2ProviderQuirks | undefined {
		return this.quirks.get(credentialType);
	}

	/**
	 * Apply provider-specific quirks to token exchange request
	 */
	applyTokenExchangeQuirks(
		credentialType: string,
		requestOptions: ClientOAuth2RequestObject,
		oAuthOptions: ClientOAuth2Options,
	): ClientOAuth2RequestObject {
		const quirks = this.getQuirks(credentialType);
		if (!quirks) {
			return requestOptions;
		}

		const modifiedOptions = { ...requestOptions };

		// Apply custom headers
		if (quirks.customHeaders) {
			modifiedOptions.headers = {
				...modifiedOptions.headers,
				...quirks.customHeaders,
			};
		}

		// Transform body if needed
		if (quirks.transformTokenExchangeBody && modifiedOptions.body) {
			modifiedOptions.body = quirks.transformTokenExchangeBody(
				modifiedOptions.body,
				oAuthOptions,
			);
		}

		// Ensure redirect_uri is included if required
		if (
			quirks.alwaysIncludeRedirectUri &&
			oAuthOptions.redirectUri &&
			modifiedOptions.body &&
			!modifiedOptions.body.redirect_uri
		) {
			modifiedOptions.body = {
				...modifiedOptions.body,
				redirect_uri: oAuthOptions.redirectUri,
			};
		}

		return modifiedOptions;
	}

	/**
	 * Classify an OAuth error based on provider-specific logic
	 */
	classifyError(
		credentialType: string,
		errorBody: unknown,
		statusCode?: number,
	): OAuth2ErrorClassification {
		const quirks = this.getQuirks(credentialType);

		if (quirks?.classifyError) {
			const classification = quirks.classifyError(errorBody, statusCode);
			if (classification) {
				return classification;
			}
		}

		// Fallback to generic classification
		return this.classifyGenericError(errorBody, statusCode);
	}

	private classifyGenericError(
		errorBody: unknown,
		statusCode?: number,
	): OAuth2ErrorClassification {
		if (typeof errorBody === 'object' && errorBody !== null) {
			const body = errorBody as Record<string, unknown>;
			const error = body.error as string | undefined;
			const errorDescription = body.error_description as string | undefined;

			if (error === 'invalid_client') {
				return {
					type: OAuth2ErrorType.INVALID_CLIENT,
					userMessage: 'Invalid client credentials.',
					technicalDetails: errorDescription,
				};
			}

			if (error === 'invalid_grant') {
				return {
					type: OAuth2ErrorType.INVALID_CODE,
					userMessage: 'Invalid or expired authorization code.',
					technicalDetails: errorDescription,
				};
			}

			if (error === 'invalid_scope') {
				return {
					type: OAuth2ErrorType.SCOPE_MISMATCH,
					userMessage: 'Invalid scopes requested.',
					technicalDetails: errorDescription,
				};
			}

			if (error) {
				return {
					type: OAuth2ErrorType.PROVIDER_SPECIFIC,
					userMessage: errorDescription || `OAuth error: ${error}`,
					technicalDetails: errorDescription || String(error),
				};
			}
		}

		return {
			type: OAuth2ErrorType.UNKNOWN,
			userMessage: statusCode === 401
				? 'Authentication failed. Please check your credentials.'
				: statusCode === 400
					? 'Invalid request. Please verify your OAuth configuration.'
					: 'An error occurred during OAuth authentication.',
			technicalDetails: typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody),
		};
	}
}
