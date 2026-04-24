import type { SamlPreferences, SamlPreferencesAttributeMapping } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { Settings, User } from '@n8n/db';
import { isValidEmail, SettingsRepository, UserRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import axios from 'axios';
import { createPublicKey, randomBytes, X509Certificate } from 'crypto';
import type express from 'express';
import { Cipher, createHttpProxyAgent, createHttpsProxyAgent, InstanceSettings } from 'n8n-core';
import { CREDENTIAL_BLANKING_VALUE, jsonParse, UnexpectedError } from 'n8n-workflow';
import { type IdentityProviderInstance, type ServiceProviderInstance } from 'samlify';
import type { BindingContext, PostBindingContext } from 'samlify/types/src/entity';

import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { buildSamlClaimsContext } from '@/modules/provisioning.ee/claims-context.builder';
import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import { CacheService } from '@/services/cache/cache.service';
import { UrlService } from '@/services/url.service';
import {
	getSamlLoginLabel,
	isSamlLicensedAndEnabled,
	isSamlLoginEnabled,
	isSsoJustInTimeProvisioningEnabled,
	reloadAuthenticationMethod,
} from '@/sso.ee/sso-helpers';

import { SAML_PREFERENCES_DB_KEY } from './constants';
import { InvalidSamlMetadataUrlError } from './errors/invalid-saml-metadata-url.error';
import { InvalidSamlMetadataError } from './errors/invalid-saml-metadata.error';
import {
	createUserFromSamlAttributes,
	getMappedSamlAttributesFromFlowResult,
	setSamlLoginEnabled,
	setSamlLoginLabel,
	updateUserFromSamlAttributes,
} from './saml-helpers';
import { SamlValidator } from './saml-validator';
import { getServiceProviderInstance } from './service-provider.ee';
import type { SamlLoginBinding, SamlUserAttributes } from './types';

const TEST_CONFIG_TTL_MS = 10 * 60 * 1000;
const TEST_CONFIG_CACHE_PREFIX = 'saml:pending-test-config:';

@Service()
export class SamlService {
	private identityProviderInstance: IdentityProviderInstance | undefined;

	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	private samlify: typeof import('samlify') | undefined;

	private _samlPreferences: SamlPreferences = {
		mapping: {
			email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
			firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname',
			lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname',
			userPrincipalName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
		},
		metadata: '',
		metadataUrl: '',
		ignoreSSL: false,
		loginBinding: 'redirect',
		acsBinding: 'post',
		authnRequestsSigned: false,
		signingPrivateKey: undefined,
		signingCertificate: undefined,
		loginEnabled: false,
		loginLabel: 'SAML',
		wantAssertionsSigned: true,
		wantMessageSigned: true,
		relayState: this.urlService.getInstanceBaseUrl(),
		signatureConfig: {
			prefix: 'ds',
			location: {
				reference: '/samlp:Response/saml:Issuer',
				action: 'after',
			},
		},
	};

	get samlPreferences(): SamlPreferences {
		return {
			...this._samlPreferences,
			loginEnabled: isSamlLoginEnabled(),
			loginLabel: getSamlLoginLabel(),
		};
	}

	constructor(
		private readonly logger: Logger,
		private readonly urlService: UrlService,
		private readonly validator: SamlValidator,
		private readonly userRepository: UserRepository,
		private readonly settingsRepository: SettingsRepository,
		private readonly instanceSettings: InstanceSettings,
		private readonly provisioningService: ProvisioningService,
		private readonly cipher: Cipher,
		private readonly cacheService: CacheService,
	) {}

	/**
	 * Checks if SAML request signing is enabled via feature flag.
	 * @returns true if N8N_ENV_FEAT_SIGNED_SAML_REQUESTS is set to 'true', false otherwise
	 */
	isSignedSamlRequestsEnabled(): boolean {
		return process.env.N8N_ENV_FEAT_SIGNED_SAML_REQUESTS === 'true';
	}

	/**
	 * Returns the decrypted signing private key for internal use (e.g., signing SAML requests).
	 * @throws BadRequestError if decryption fails
	 */
	private getDecryptedSigningPrivateKey(): string | undefined {
		if (!this.isSignedSamlRequestsEnabled()) return undefined;
		if (!this._samlPreferences.signingPrivateKey) return undefined;
		try {
			return this.cipher.decrypt(this._samlPreferences.signingPrivateKey);
		} catch {
			throw new BadRequestError(
				'Failed to decrypt SAML signing private key. The key may be corrupted.',
			);
		}
	}

	private isValidPemPrivateKey(pem: string): boolean {
		return /^-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\s\S]+-----END (?:RSA |EC )?PRIVATE KEY-----/.test(
			pem.trim(),
		);
	}

	private isValidPemCertificate(pem: string): boolean {
		return /^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/.test(pem.trim());
	}

	private validateKeyPairMatch(privateKeyPem: string, certificatePem: string): boolean {
		try {
			const pubKeyFromPrivate = createPublicKey(privateKeyPem);
			const cert = new X509Certificate(certificatePem);
			const pubKeyFromCert = cert.publicKey;

			return pubKeyFromPrivate
				.export({ type: 'spki', format: 'der' })
				.equals(pubKeyFromCert.export({ type: 'spki', format: 'der' }));
		} catch {
			return false;
		}
	}

	private validateSigningKeyConfiguration(prefs: Partial<SamlPreferences>): void {
		// Treat the blanking value as "keep existing" — the UI sends it back for redacted fields
		// Treat empty string as "clear this field"
		const isClearingKey = prefs.signingPrivateKey === '';
		const isClearingCert = prefs.signingCertificate === '';
		const isNewKey =
			!!prefs.signingPrivateKey && prefs.signingPrivateKey !== CREDENTIAL_BLANKING_VALUE;
		const isNewCert = !!prefs.signingCertificate;
		const hasNewSigningFields = isNewKey || isNewCert;

		if (hasNewSigningFields && !this.isSignedSamlRequestsEnabled()) {
			throw new BadRequestError(
				'SAML request signing is not enabled. Set N8N_ENV_FEAT_SIGNED_SAML_REQUESTS=true to enable this feature.',
			);
		}

		if (!this.isSignedSamlRequestsEnabled()) return;

		if (isNewKey && !this.isValidPemPrivateKey(prefs.signingPrivateKey!)) {
			throw new BadRequestError(
				'Invalid signing private key format. Must be a PEM-encoded private key.',
			);
		}

		if (isNewCert && !this.isValidPemCertificate(prefs.signingCertificate!)) {
			throw new BadRequestError(
				'Invalid signing certificate format. Must be a PEM-encoded certificate.',
			);
		}

		const willHaveAuthnRequestsSigned =
			prefs.authnRequestsSigned ?? this._samlPreferences.authnRequestsSigned;

		if (willHaveAuthnRequestsSigned) {
			// Determine the effective key/cert after this update would be applied
			const effectiveKey = isClearingKey
				? undefined
				: isNewKey
					? prefs.signingPrivateKey!
					: this.getDecryptedSigningPrivateKey();
			const effectiveCert = isClearingCert
				? undefined
				: isNewCert
					? prefs.signingCertificate!
					: this._samlPreferences.signingCertificate;

			if (!effectiveKey || !effectiveCert) {
				throw new BadRequestError(
					'Both signingPrivateKey and signingCertificate are required when authnRequestsSigned is enabled.',
				);
			}

			if (!this.validateKeyPairMatch(effectiveKey, effectiveCert)) {
				throw new BadRequestError(
					'The signing private key and certificate do not match. Please provide a matching key/certificate pair.',
				);
			}
		}
	}

	async init(): Promise<void> {
		try {
			// load preferences first but do not apply so as to not load samlify unnecessarily
			await this.loadFromDbAndApplySamlPreferences(false);
			if (isSamlLicensedAndEnabled()) {
				await this.validator.init();
				await this.loadSamlify();
				await this.loadFromDbAndApplySamlPreferences(true);
			}
		} catch (error) {
			// If the SAML configuration has been corrupted in the database we'll
			// delete the corrupted configuration and enable email logins again.
			if (
				error instanceof InvalidSamlMetadataUrlError ||
				error instanceof InvalidSamlMetadataError ||
				error instanceof SyntaxError
			) {
				this.logger.warn(
					`SAML initialization failed because of invalid metadata in database: ${error.message}. IMPORTANT: Disabling SAML and switching to email-based login for all users. Please review your configuration and re-enable SAML.`,
				);
				await this.reset();
			} else {
				throw error;
			}
		}
	}

	async loadSamlify() {
		if (this.samlify === undefined) {
			this.logger.debug('Loading samlify library into memory');
			await this.validator.init();
			this.samlify = await import('samlify');
		}

		this.samlify.setSchemaValidator({
			validate: async (response: string) => {
				const valid = await this.validator.validateResponse(response);
				if (!valid) {
					throw new InvalidSamlMetadataError();
				}
			},
		});
	}

	getIdentityProviderInstance(forceRecreate = false): IdentityProviderInstance {
		if (this.samlify === undefined) {
			throw new UnexpectedError('Samlify is not initialized');
		}
		if (!this._samlPreferences.metadata) {
			throw new InvalidSamlMetadataError(
				'No IdP metadata configured. Please provide valid identity provider metadata.',
			);
		}
		if (this.identityProviderInstance === undefined || forceRecreate) {
			this.identityProviderInstance = this.samlify.IdentityProvider({
				metadata: this._samlPreferences.metadata,
			});
		}

		this.validator.validateIdentityProvider(this.identityProviderInstance);

		return this.identityProviderInstance;
	}

	getServiceProviderInstance(): ServiceProviderInstance {
		if (this.samlify === undefined) {
			throw new UnexpectedError('Samlify is not initialized');
		}
		return getServiceProviderInstance(this._samlPreferences, this.samlify);
	}

	/**
	 * Generate a login request URL.
	 * When `metadata` is provided, creates a temporary IdP from it (for testing without saving).
	 * Otherwise uses the cached IdP from persisted preferences.
	 */
	async getLoginRequestUrl(
		relayState?: string,
		binding?: SamlLoginBinding,
		metadata?: string,
	): Promise<{
		binding: SamlLoginBinding;
		context: BindingContext | PostBindingContext;
	}> {
		await this.loadSamlify();
		if (this.samlify === undefined) {
			throw new UnexpectedError('Samlify is not initialized');
		}

		const idp = metadata
			? await this.createIdentityProviderFromMetadata(metadata)
			: this.getIdentityProviderInstance();

		binding ??= this._samlPreferences.loginBinding ?? 'redirect';
		const sp = this.getServiceProviderInstance();
		sp.entitySetting.relayState = relayState ?? this.urlService.getInstanceBaseUrl();
		const loginRequest = sp.createLoginRequest(idp, binding);
		return {
			binding,
			context: binding === 'post' ? (loginRequest as PostBindingContext) : loginRequest,
		};
	}

	/**
	 * Temporarily stores IdP metadata for a pending connection test so it can be
	 * retrieved when the IdP posts back to the ACS endpoint. Uses the shared
	 * cache service so it works across instances in a multi-main setup. Returns
	 * an opaque token to be embedded in the RelayState.
	 */
	async storePendingTestConfig(metadata: string): Promise<string> {
		const testId = randomBytes(6).toString('hex');
		await this.cacheService.set(
			`${TEST_CONFIG_CACHE_PREFIX}${testId}`,
			metadata,
			TEST_CONFIG_TTL_MS,
		);
		return testId;
	}

	/**
	 * Retrieves and removes the pending test metadata associated with the given
	 * token. Returns undefined if the token is unknown or expired.
	 */
	async consumePendingTestConfig(testId: string): Promise<string | undefined> {
		const key = `${TEST_CONFIG_CACHE_PREFIX}${testId}`;
		const metadata = await this.cacheService.get<string>(key);
		if (metadata === undefined) return undefined;
		await this.cacheService.delete(key);
		return metadata;
	}

	private async createIdentityProviderFromMetadata(
		metadata: string,
	): Promise<IdentityProviderInstance> {
		await this.loadSamlify();
		if (this.samlify === undefined) {
			throw new UnexpectedError('Samlify is not initialized');
		}
		const validationResult = await this.validator.validateMetadata(metadata);
		if (!validationResult) {
			throw new InvalidSamlMetadataError();
		}
		const idp = this.samlify.IdentityProvider({ metadata });
		this.validator.validateIdentityProvider(idp);
		return idp;
	}

	async handleSamlLogin(
		req: express.Request,
		binding: SamlLoginBinding,
		metadataOverride?: string,
	): Promise<{
		authenticatedUser: User | undefined;
		attributes: SamlUserAttributes;
		onboardingRequired: boolean;
	}> {
		const { mapped: attributes, raw: rawAttributes } = await this.getAttributesFromLoginResponse(
			req,
			binding,
			metadataOverride,
		);

		if (attributes.email) {
			const lowerCasedEmail = attributes.email.toLowerCase();

			if (!isValidEmail(lowerCasedEmail)) {
				throw new BadRequestError('Invalid email format');
			}

			const user = await this.userRepository.findOne({
				where: { email: lowerCasedEmail },
				relations: ['authIdentities', 'role'],
			});
			if (user) {
				// Login path for existing users that are fully set up and that have a SAML authIdentity set up
				if (
					user.authIdentities.find(
						(e) => e.providerType === 'saml' && e.providerId === attributes.userPrincipalName,
					)
				) {
					await this.applySsoProvisioning(user, attributes, rawAttributes);
					return {
						authenticatedUser: user,
						attributes,
						onboardingRequired: false,
					};
				} else {
					// Login path for existing users that are NOT fully set up for SAML
					const updatedUser = await updateUserFromSamlAttributes(user, attributes);
					const onboardingRequired = !updatedUser.firstName || !updatedUser.lastName;
					await this.applySsoProvisioning(updatedUser, attributes, rawAttributes);
					return {
						authenticatedUser: updatedUser,
						attributes,
						onboardingRequired,
					};
				}
			} else {
				// New users to be created JIT based on SAML attributes
				if (isSsoJustInTimeProvisioningEnabled()) {
					const newUser = await createUserFromSamlAttributes(attributes);
					await this.applySsoProvisioning(newUser, attributes, rawAttributes);
					return {
						authenticatedUser: newUser,
						attributes,
						onboardingRequired: !newUser.firstName || !newUser.lastName,
					};
				}
			}
		}

		return {
			authenticatedUser: undefined,
			attributes,
			onboardingRequired: false,
		};
	}

	private async applySsoProvisioning(
		user: User,
		attributes: SamlPreferencesAttributeMapping,
		rawAttributes: Record<string, unknown>,
	): Promise<void> {
		if (await this.provisioningService.isExpressionMappingEnabled()) {
			const context = buildSamlClaimsContext(rawAttributes);
			await this.provisioningService.provisionExpressionMappedRolesForUser(user, context);
			return;
		}
		if (attributes?.n8nInstanceRole) {
			await this.provisioningService.provisionInstanceRoleForUser(user, attributes.n8nInstanceRole);
		}
		if (attributes?.n8nProjectRoles) {
			await this.provisioningService.provisionProjectRolesForUser(
				user.id,
				attributes.n8nProjectRoles,
			);
		}
	}

	private async broadcastReloadSAMLConfigurationCommand(): Promise<void> {
		if (this.instanceSettings.isMultiMain) {
			const { Publisher } = await import('@/scaling/pubsub/publisher.service');
			await Container.get(Publisher).publishCommand({ command: 'reload-saml-config' });
		}
	}

	private isReloading = false;

	@OnPubSubEvent('reload-saml-config')
	async reload(): Promise<void> {
		if (this.isReloading) {
			this.logger.warn('SAML configuration reload already in progress');
			return;
		}
		this.isReloading = true;
		try {
			this.logger.debug('SAML configuration changed, starting to load it from the database');
			await this.loadFromDbAndApplySamlPreferences(true, false);

			await reloadAuthenticationMethod();

			const samlLoginEnabled = isSamlLoginEnabled();

			this.logger.debug(`SAML login is now ${samlLoginEnabled ? 'enabled' : 'disabled'}.`);

			Container.get(GlobalConfig).sso.saml.loginEnabled = samlLoginEnabled;
		} catch (error) {
			this.logger.error('SAML configuration changed, failed to reload SAML configuration', {
				error,
			});
		} finally {
			this.isReloading = false;
		}
	}

	async setSamlPreferences(
		prefs: Partial<SamlPreferences>,
		tryFallback: boolean = false,
		broadcastReload: boolean = true,
	): Promise<SamlPreferences | undefined> {
		await this.loadSamlify();
		this.validateSigningKeyConfiguration(prefs);
		const previousMetadataUrl = this._samlPreferences.metadataUrl;
		await this.loadPreferencesWithoutValidation(prefs);
		await this.applyLoadedPreferences(prefs, previousMetadataUrl, tryFallback);
		const result = await this.saveSamlPreferencesToDb();

		if (broadcastReload) {
			await this.broadcastReloadSAMLConfigurationCommand();
		}
		return result;
	}

	private async applyLoadedPreferences(
		prefs: Partial<SamlPreferences>,
		previousMetadataUrl: string | undefined,
		tryFallback: boolean = true,
	): Promise<void> {
		if (prefs.metadataUrl) {
			try {
				const fetchedMetadata = await this.fetchMetadataFromUrl();
				if (fetchedMetadata) {
					this._samlPreferences.metadata = fetchedMetadata;
				} else {
					// in this case the metadata url didn't produce a valid metadata for SAML
					// therefore we are rejecting the change to it
					throw new InvalidSamlMetadataUrlError(prefs.metadataUrl);
				}
			} catch (error) {
				this._samlPreferences.metadataUrl = previousMetadataUrl;
				if (!tryFallback) {
					throw error;
				}
				// we were not able to produce correct metadata from the URL, but
				// in this case we don't care and try to fallback on the saved metadata in the
				// database.
				this.logger.error(
					'SAML initialization detected an invalid metadata URL in database. Trying to initialize from metadata in database if available.',

					{ error },
				);
			}
		} else if (prefs.metadata) {
			const validationResult = await this.validator.validateMetadata(prefs.metadata);
			if (!validationResult) {
				throw new InvalidSamlMetadataError();
			}
		}
		// If SAML login is enabled, we need to ensure that we have valid metadata available
		// if the metadata url is provided and it was possible to fetch and validate that metadata
		// it is now stored in this._samlPreferences.metadata.
		// if no metadata url was provided but metadata directly as XML, it is also already stored
		// in this._samlPreferences.metadata.
		if (isSamlLoginEnabled()) {
			if (this._samlPreferences.metadata) {
				const validationResult = await this.validator.validateMetadata(
					this._samlPreferences.metadata,
				);
				if (!validationResult) {
					throw new InvalidSamlMetadataError();
				}
			} else {
				// in this case SAML login is enabled but no valid metadata is available
				throw new InvalidSamlMetadataError();
			}
		}
		this.getIdentityProviderInstance(true);
	}

	async loadPreferencesWithoutValidation(prefs: Partial<SamlPreferences>) {
		this._samlPreferences.loginBinding = prefs.loginBinding ?? this._samlPreferences.loginBinding;
		this._samlPreferences.metadata = prefs.metadata ?? this._samlPreferences.metadata;
		this._samlPreferences.mapping = prefs.mapping ?? this._samlPreferences.mapping;
		this._samlPreferences.ignoreSSL = prefs.ignoreSSL ?? this._samlPreferences.ignoreSSL;
		this._samlPreferences.acsBinding = prefs.acsBinding ?? this._samlPreferences.acsBinding;
		this._samlPreferences.signatureConfig =
			prefs.signatureConfig ?? this._samlPreferences.signatureConfig;
		this._samlPreferences.authnRequestsSigned =
			prefs.authnRequestsSigned ?? this._samlPreferences.authnRequestsSigned;
		this._samlPreferences.wantAssertionsSigned =
			prefs.wantAssertionsSigned ?? this._samlPreferences.wantAssertionsSigned;
		this._samlPreferences.wantMessageSigned =
			prefs.wantMessageSigned ?? this._samlPreferences.wantMessageSigned;
		if (prefs.signingCertificate === '') {
			this._samlPreferences.signingCertificate = undefined;
		} else {
			this._samlPreferences.signingCertificate =
				prefs.signingCertificate ?? this._samlPreferences.signingCertificate;
		}
		if (
			prefs.signingPrivateKey !== undefined &&
			prefs.signingPrivateKey !== CREDENTIAL_BLANKING_VALUE
		) {
			if (prefs.signingPrivateKey === '') {
				// Empty string clears the stored key
				this._samlPreferences.signingPrivateKey = undefined;
			} else if (this.isValidPemPrivateKey(prefs.signingPrivateKey)) {
				// Plaintext PEM from API → encrypt
				this._samlPreferences.signingPrivateKey = this.cipher.encrypt(prefs.signingPrivateKey);
			} else {
				// Already-encrypted from DB → store as-is
				this._samlPreferences.signingPrivateKey = prefs.signingPrivateKey;
			}
		}
		if (prefs.metadataUrl) {
			this._samlPreferences.metadataUrl = prefs.metadataUrl;
		} else if (prefs.metadata) {
			// remove metadataUrl if metadata is set directly
			this._samlPreferences.metadataUrl = undefined;
			this._samlPreferences.metadata = prefs.metadata;
		}
		await setSamlLoginEnabled(prefs.loginEnabled ?? isSamlLoginEnabled());
		setSamlLoginLabel(prefs.loginLabel ?? getSamlLoginLabel());
	}

	async loadFromDbAndApplySamlPreferences(
		apply = true,
		broadcastReload: boolean = true,
	): Promise<SamlPreferences | undefined> {
		const samlPreferences = await this.settingsRepository.findOne({
			where: { key: SAML_PREFERENCES_DB_KEY },
		});
		if (samlPreferences) {
			const prefs = jsonParse<SamlPreferences>(samlPreferences.value);

			if (prefs) {
				if (apply) {
					// DB data was already validated when originally saved via setSamlPreferences().
					// We must NOT re-validate here because signing keys are stored encrypted
					// and would fail PEM validation. Instead, load preferences directly and
					// apply the SAML configuration (metadata, identity provider, etc.).
					await this.loadSamlify();
					const previousMetadataUrl = this._samlPreferences.metadataUrl;
					await this.loadPreferencesWithoutValidation(prefs);
					await this.applyLoadedPreferences(prefs, previousMetadataUrl);

					if (broadcastReload) {
						await this.broadcastReloadSAMLConfigurationCommand();
					}
				} else {
					await this.loadPreferencesWithoutValidation(prefs);
				}
				return prefs;
			}
		}
		return;
	}

	async saveSamlPreferencesToDb(): Promise<SamlPreferences | undefined> {
		const samlPreferences = await this.settingsRepository.findOne({
			where: { key: SAML_PREFERENCES_DB_KEY },
		});
		const settingsValue = JSON.stringify(this.samlPreferences);
		let result: Settings;
		if (samlPreferences) {
			samlPreferences.value = settingsValue;
			result = await this.settingsRepository.save(samlPreferences, {
				transaction: false,
			});
		} else {
			result = await this.settingsRepository.save(
				{
					key: SAML_PREFERENCES_DB_KEY,
					value: settingsValue,
					loadOnStartup: true,
				},
				{ transaction: false },
			);
		}
		if (result) return jsonParse<SamlPreferences>(result.value);
		return;
	}

	async fetchMetadataFromUrl(
		metadataUrl?: string,
		ignoreSSL?: boolean,
	): Promise<string | undefined> {
		await this.loadSamlify();
		const url = metadataUrl ?? this._samlPreferences.metadataUrl;
		const shouldIgnoreSSL = ignoreSSL ?? this._samlPreferences.ignoreSSL;
		if (!url) throw new BadRequestError('Error fetching SAML Metadata, no Metadata URL set');
		try {
			// Create a proxy-aware HTTPS agent that respects HTTP_PROXY, HTTPS_PROXY, and NO_PROXY
			// environment variables while also supporting SSL certificate validation options
			const httpsAgent = createHttpsProxyAgent(
				null, // Uses proxy from environment variables
				url,
				{
					rejectUnauthorized: !shouldIgnoreSSL,
				},
			);
			const httpAgent = createHttpProxyAgent(null, url);

			const response = await axios.get(url, {
				httpsAgent,
				httpAgent,
			});
			if (response.status === 200 && response.data) {
				const xml = (await response.data) as string;
				const validationResult = await this.validator.validateMetadata(xml);
				if (!validationResult) {
					throw new BadRequestError(`Data received from ${url} is not valid SAML metadata.`);
				}
				return xml;
			}
		} catch (error) {
			if (error instanceof BadRequestError) throw error;
			throw new BadRequestError(`Error fetching SAML Metadata from ${url}: ${error}`);
		}
		return;
	}

	async getAttributesFromLoginResponse(
		req: express.Request,
		binding: SamlLoginBinding,
		metadataOverride?: string,
	): Promise<{ mapped: SamlUserAttributes; raw: Record<string, unknown> }> {
		let parsedSamlResponse;
		if (!this._samlPreferences.mapping)
			throw new BadRequestError('Error fetching SAML Attributes, no Attribute mapping set');
		try {
			await this.loadSamlify();
			const idp = metadataOverride
				? await this.createIdentityProviderFromMetadata(metadataOverride)
				: this.getIdentityProviderInstance();
			parsedSamlResponse = await this.getServiceProviderInstance().parseLoginResponse(
				idp,
				binding,
				req,
			);
		} catch (error) {
			// throw error;
			throw new AuthError(
				// INFO: The error can be a string. Samlify rejects promises with strings.
				`SAML Authentication failed. Could not parse SAML response. ${error instanceof Error ? error.message : error}`,
			);
		}
		const { attributes, missingAttributes, rawAttributes } = getMappedSamlAttributesFromFlowResult(
			parsedSamlResponse,
			this._samlPreferences.mapping,
			{
				instanceRole: await this.provisioningService.getInstanceRoleClaimName(),
				projectRoles: await this.provisioningService.getProjectsRolesClaimName(),
			},
		);
		if (!attributes) {
			throw new AuthError('SAML Authentication failed. Invalid SAML response.');
		}
		if (missingAttributes.length > 0) {
			throw new AuthError(
				`SAML Authentication failed. Invalid SAML response (missing attributes: ${missingAttributes.join(
					', ',
				)}).`,
			);
		}
		return { mapped: attributes, raw: rawAttributes };
	}

	/**
	 * Disables SAML, switches to email based logins and deletes the SAML
	 * configuration from the database.
	 */
	async reset() {
		await setSamlLoginEnabled(false);
		await this.settingsRepository.delete({ key: SAML_PREFERENCES_DB_KEY });
	}
}
