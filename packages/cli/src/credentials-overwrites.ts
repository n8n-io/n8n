import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { deepCopy, IMPLICIT_MANAGED_VERSION, jsonParse } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { ManagedAppUnavailableError } from '@/errors/managed-app-unavailable.error';
import type { ICredentialsOverwrite, ManagedAuthState, ManagedVersionEntry } from '@/interfaces';
import {
	hasEmptyClientFields,
	hasClientFields,
	hasInvalidStoredVersion,
	hasTokenData,
	nearestValue,
	parseOverwritesPayload,
	readStoredVersion,
	withoutVersion,
} from '@/managed-versions';

import { StaticAuthService } from './services/static-auth-service';

const CREDENTIALS_OVERWRITE_KEY = 'credentialsOverwrite';

@Service()
export class CredentialsOverwrites {
	private overwriteData: ICredentialsOverwrite = {};

	/** Version of the base entry, for OAuth types that state one. A missing type means version 1. */
	private entryVersions: Record<string, number> = {};

	/** The newer app of a rollout, for OAuth types that list one in `__versions`. */
	private newerApps: Record<string, ManagedVersionEntry> = {};

	/** Types whose own entry sets the client fields. Each one has its own app, version and rollout. */
	private appOwners = new Set<string>();

	private resolvedTypes: string[] = [];

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly credentialTypes: CredentialTypes,
		private readonly logger: Logger,
		private readonly settings: SettingsRepository,
		private readonly cipher: Cipher,
	) {}

	/** Registered by FrontendService to regenerate credential types after overwrites change, without this module depending on it. */
	private reloadHandler?: () => Promise<void>;

	registerReloadHandler(handler: () => Promise<void>) {
		this.reloadHandler = handler;
	}

	async init() {
		const data = this.globalConfig.credentials.overwrite.data;
		if (data) {
			this.logger.debug('Loading overwrite credentials from static envvar');
			const overwriteData = jsonParse<Record<string, unknown>>(data, {
				errorMessage: 'The credentials-overwrite is not valid JSON.',
			});

			this.setPlainData(overwriteData);
		}

		const persistence = this.globalConfig.credentials.overwrite.persistence;

		if (persistence) {
			this.logger.debug('Loading overwrite credentials from database');
			await this.loadOverwriteDataFromDB(false);
		}
	}

	private reloading = false;

	@OnPubSubEvent('reload-overwrite-credentials')
	async reloadOverwriteCredentials() {
		await this.loadOverwriteDataFromDB(true);
	}

	async loadOverwriteDataFromDB(reloadFrontend: boolean) {
		if (this.reloading) return;
		try {
			this.reloading = true;
			this.logger.debug('Loading overwrite credentials from DB');
			const data = await this.settings.findByKey(CREDENTIALS_OVERWRITE_KEY);

			if (data) {
				const decryptedData = await this.cipher.decryptV2(data.value);
				const overwriteData = jsonParse<Record<string, unknown>>(decryptedData, {
					errorMessage: 'The credentials-overwrite is not valid JSON.',
				});

				await this.setData(overwriteData, false, reloadFrontend);
			}
		} catch (error) {
			this.logger.error('Error loading overwrite credentials', { error });
		} finally {
			this.reloading = false;
		}
	}

	private async broadcastReloadOverwriteCredentialsCommand(): Promise<void> {
		const { Publisher } = await import('@/scaling/pubsub/publisher.service.js');
		await Container.get(Publisher).publishCommand({ command: 'reload-overwrite-credentials' });
	}

	async saveOverwriteDataToDB(overwriteData: Record<string, unknown>, broadcast: boolean = true) {
		const data = await this.cipher.encryptV2(JSON.stringify(overwriteData));
		const setting = this.settings.create({
			key: CREDENTIALS_OVERWRITE_KEY,
			value: data,
			loadOnStartup: false,
		});
		await this.settings.save(setting);

		if (broadcast) {
			await this.broadcastReloadOverwriteCredentialsCommand();
		}
	}

	getOverwriteEndpointMiddleware() {
		const { endpointAuthToken } = this.globalConfig.credentials.overwrite;
		return StaticAuthService.getStaticAuthMiddleware(endpointAuthToken);
	}

	/**
	 * Sets the overwrites from a payload. A part that does not follow the format is skipped and
	 * logged, so loading never fails on the content.
	 *
	 * A type entry is a plain object. During a rollout, `__versions` adds a newer app for an
	 * OAuth type. See `parseOverwritesPayload` for the format.
	 */
	setPlainData(overwriteData: Record<string, unknown>) {
		const parsed = parseOverwritesPayload(
			overwriteData,
			(type) => this.getClientFields(type),
			(type) => this.credentialTypes.recognizes(type),
			(type) => this.credentialTypes.getParentTypes(type),
		);

		for (const problem of parsed.problems) {
			this.logger.warn(problem);
		}

		// If data gets reinitialized reset the resolved types cache
		this.resolvedTypes.length = 0;

		this.overwriteData = parsed.entries;
		this.entryVersions = parsed.entryVersions;
		this.newerApps = parsed.versions;
		this.appOwners = new Set(
			Object.entries(parsed.entries)
				.filter(([type, entry]) => {
					const clientFields = this.getClientFields(type);
					return clientFields !== undefined && hasClientFields(entry, clientFields);
				})
				.map(([type]) => type),
		);

		for (const type in this.overwriteData) {
			const overwrites = this.getOverwritesWithParents(type);

			if (overwrites && Object.keys(overwrites).length) {
				this.overwriteData[type] = overwrites;
			}
		}
	}

	async setData(
		overwriteData: Record<string, unknown>,
		storeInDb: boolean = true,
		reloadFrontend: boolean = true,
	) {
		this.setPlainData(overwriteData);
		if (storeInDb && this.globalConfig.credentials.overwrite.persistence) {
			await this.saveOverwriteDataToDB(overwriteData, true);
		}

		if (reloadFrontend) {
			await this.reloadHandler?.();
		}
	}

	/**
	 * Fills the empty fields of a credential from the overwrite of its type.
	 *
	 * @param versionOverride the app version to use. By default it is the version of the credential.
	 * @throws ManagedAppUnavailableError when the version matches no app in the config
	 */
	applyOverwrite(type: string, data: ICredentialDataDecryptedObject, versionOverride?: number) {
		const base = this.get(type);

		if (base === undefined) {
			return data;
		}

		const overwrites = this.pickApp(
			type,
			base,
			versionOverride ?? this.resolveBoundVersion(type, data),
		);

		// For skip-list types, don't apply overwrite if the credential has been
		// customized (any overwrite field has a non-empty value that differs from
		// the overwrite value). Since overwrites are never persisted to the DB,
		// any non-empty stored value that differs from the overwrite is user-set.
		if (this.globalConfig.credentials.overwrite?.skipTypes?.includes(type)) {
			const isFieldCustomized = (key: string) => {
				const storedValue = data[key];
				return (
					storedValue !== null &&
					storedValue !== undefined &&
					storedValue !== '' &&
					storedValue !== overwrites[key]
				);
			};
			if (Object.keys(overwrites).some(isFieldCustomized)) {
				return data;
			}
		}

		const returnData = deepCopy(data);
		// Overwrite only if there is currently no data set. An empty overwrite value is
		// skipped so it does not suppress the credential type default downstream.
		for (const key of Object.keys(overwrites)) {
			if (overwrites[key] === '') continue;
			const current = returnData[key];
			if (current === null || current === undefined || current === '') {
				returnData[key] = overwrites[key];
			}
		}

		return returnData;
	}

	/**
	 * The overwrite of a type. Without a version, it is the default app: the newer app of
	 * a rollout, or the base entry.
	 *
	 * @throws ManagedAppUnavailableError when the version matches no app in the config
	 */
	getOverwrites(type: string, version?: number): ICredentialDataDecryptedObject | undefined {
		const base = this.getOverwritesWithParents(type);
		if (base === undefined) return undefined;

		return this.pickApp(type, base, version);
	}

	/**
	 * The version to store when a credential connects. When the overwrite supplies the client, it
	 * is the version of the default app: the newer app of a rollout, or the base entry.
	 * It is `undefined` for a user-owned app, for a type without an overwrite and for a non-OAuth type.
	 */
	getNewConnectionVersion(type: string, data: ICredentialDataDecryptedObject): number | undefined {
		const clientFields = this.getClientFields(type);
		if (!clientFields || !hasEmptyClientFields(data, clientFields)) return undefined;
		if (this.get(type) === undefined) return undefined;

		return (
			this.versionValue(type, this.newerApps)?.version ??
			this.versionValue(type, this.entryVersions) ??
			IMPLICIT_MANAGED_VERSION
		);
	}

	/**
	 * The version of the app a credential uses, or `undefined` for the default app.
	 *
	 * - A user-owned app (client fields set in the credential) uses no managed app.
	 * - A stored version is used as it is. A stored value that is not a valid version fails.
	 * - A credential with tokens and no stored version was connected before versions
	 *   existed: version 1.
	 * - A credential with no tokens at all is tied to no app yet: the default app.
	 */
	resolveBoundVersion(type: string, data: ICredentialDataDecryptedObject): number | undefined {
		const clientFields = this.getClientFields(type);
		if (!clientFields || !hasEmptyClientFields(data, clientFields)) return undefined;

		const stored = readStoredVersion(data);
		if (stored !== undefined) return stored;

		if (hasInvalidStoredVersion(data)) {
			throw new ManagedAppUnavailableError(
				'The managed app version stored on this credential is not valid. Reconnect the credential to continue.',
			);
		}

		return hasTokenData(data) ? IMPLICIT_MANAGED_VERSION : undefined;
	}

	/** Client fields of an OAuth credential type. `undefined` for any other type. */
	private getClientFields(type: string): readonly string[] | undefined {
		if (!this.credentialTypes.recognizes(type)) return undefined;

		// OAuth2 identifies its client with clientId/clientSecret, OAuth1 with
		// consumerKey/consumerSecret. Detect the version so the right pair is checked
		// (checking clientId/clientSecret for both would never match an OAuth1 client).
		const parentTypes = this.credentialTypes.getParentTypes(type);
		const extendsBase = (base: string) => type === base || parentTypes.includes(base);
		if (extendsBase('oAuth2Api')) return ['clientId', 'clientSecret'];
		if (extendsBase('oAuth1Api')) return ['consumerKey', 'consumerSecret'];
		return undefined;
	}

	/**
	 * The version data of a type: its base version or its newer app.
	 *
	 * A type that sets its own client fields uses its own data only, because a parent can use
	 * other client credentials. Any other type uses the data of the nearest parent that has some.
	 */
	private versionValue<T>(type: string, values: Record<string, T>): T | undefined {
		if (this.appOwners.has(type)) return Object.hasOwn(values, type) ? values[type] : undefined;

		return nearestValue(type, this.credentialTypes.getParentTypes(type), values);
	}

	/** Picks the app of an OAuth type from its base overwrite and its newer app, if any. */
	private pickApp(type: string, base: ICredentialDataDecryptedObject, version?: number) {
		if (!this.getClientFields(type)) return base;

		const newer = this.versionValue(type, this.newerApps);
		const baseVersion = this.versionValue(type, this.entryVersions) ?? IMPLICIT_MANAGED_VERSION;
		const target = version ?? newer?.version ?? baseVersion;

		if (target === baseVersion) return base;
		// The newer app takes the fields of the base entry that it does not set.
		if (newer && target === newer.version) return { ...base, ...withoutVersion(newer) };

		throw new ManagedAppUnavailableError(
			`This credential uses a managed app (version ${target}) that is no longer available. Reconnect the credential to continue.`,
		);
	}

	private getOverwritesWithParents(type: string): ICredentialDataDecryptedObject | undefined {
		if (this.resolvedTypes.includes(type)) {
			// Type got already resolved and can so returned directly
			return this.overwriteData[type];
		}

		if (!this.credentialTypes.recognizes(type)) {
			this.logger.warn(`Unknown credential type ${type} in Credential overwrites`);
			return;
		}

		const credentialTypeData = this.credentialTypes.getByName(type);

		if (credentialTypeData.extends === undefined) {
			this.resolvedTypes.push(type);
			return this.overwriteData[type];
		}

		const overwrites: ICredentialDataDecryptedObject = {};
		for (const credentialsTypeName of credentialTypeData.extends) {
			Object.assign(overwrites, this.getOverwritesWithParents(credentialsTypeName));
		}

		if (this.overwriteData[type] !== undefined) {
			Object.assign(overwrites, this.overwriteData[type]);
		}

		this.resolvedTypes.push(type);

		return overwrites;
	}

	private get(name: string): ICredentialDataDecryptedObject | undefined {
		const parentTypes = this.credentialTypes.getParentTypes(name);
		const entries = [name, ...parentTypes]
			.reverse()
			.map((type) => this.overwriteData[type])
			.filter((type): type is ICredentialDataDecryptedObject => !!type);

		if (entries.length === 0) return undefined;

		return entries.reduce(
			(acc, current) => Object.assign(acc, current),
			{} as ICredentialDataDecryptedObject,
		);
	}

	getAll(): ICredentialsOverwrite {
		return this.overwriteData;
	}

	/**
	 * Names of the fields that the newer app of a rollout sets. The default app supplies them,
	 * so the editor must hide them, even when the base entry does not set them.
	 */
	getNewerAppProperties(type: string): string[] {
		const newer = this.versionValue(type, this.newerApps);
		return newer ? Object.keys(withoutVersion(newer)) : [];
	}

	supportsManagedAuth(type: string): boolean {
		return this.get(type) !== undefined;
	}

	/**
	 * OAuth credential type whose client this instance provides via overwrites
	 * (clientId + clientSecret), excluding skip-list types where managed
	 * creation is disabled. These types support one-click connect in the editor.
	 */
	isManagedOAuthType(type: string): boolean {
		const clientFields = this.getClientFields(type);
		if (!clientFields) return false;

		if (this.globalConfig.credentials.overwrite?.skipTypes?.includes(type)) return false;

		const overwrites = this.get(type);
		return !!overwrites && clientFields.every((field) => field in overwrites);
	}

	usesManagedAuth(type: string, data: Record<string, unknown>): boolean {
		return this.getManagedAuthState(type, data) === 'managed';
	}

	/** How a credential relates to the managed app of its type. See `ManagedAuthState`. */
	getManagedAuthState(type: string, data: Record<string, unknown>): ManagedAuthState {
		const overwrites = this.get(type);
		if (overwrites === undefined) return 'not-managed';

		// Managed iff applying the overwrite actually injects a value. Delegating to
		// applyOverwrite keeps this in lockstep with the skip-list / customization rules.
		try {
			const applied = this.applyOverwrite(type, data as ICredentialDataDecryptedObject);
			return Object.keys(overwrites).some((key) => applied[key] !== data[key])
				? 'managed'
				: 'not-managed';
		} catch (error) {
			if (error instanceof ManagedAppUnavailableError) return 'missing-app';
			throw error;
		}
	}
}
