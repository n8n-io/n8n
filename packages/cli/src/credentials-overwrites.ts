import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { Request, Response, NextFunction } from 'express';
import { Cipher } from 'n8n-core';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { deepCopy, jsonParse } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import type { ICredentialsOverwrite } from '@/interfaces';

const CREDENTIALS_OVERWRITE_KEY = 'credentialsOverwrite';

@Service()
export class CredentialsOverwrites {
	private overwriteData: ICredentialsOverwrite = {};

	private resolvedTypes: string[] = [];

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly credentialTypes: CredentialTypes,
		private readonly logger: Logger,
		private readonly settings: SettingsRepository,
		private readonly cipher: Cipher,
	) {}

	async init() {
		const data = this.globalConfig.credentials.overwrite.data;
		if (data) {
			this.logger.debug('Loading overwrite credentials from static envvar');
			const overwriteData = jsonParse<ICredentialsOverwrite>(data, {
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
				const decryptedData = this.cipher.decrypt(data.value);
				const overwriteData = jsonParse<ICredentialsOverwrite>(decryptedData, {
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
		const { Publisher } = await import('@/scaling/pubsub/publisher.service');
		await Container.get(Publisher).publishCommand({ command: 'reload-overwrite-credentials' });
	}

	async saveOverwriteDataToDB(overwriteData: ICredentialsOverwrite, broadcast: boolean = true) {
		const data = this.cipher.encrypt(JSON.stringify(overwriteData));
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

		if (!endpointAuthToken?.trim()) {
			return null;
		}

		const expectedAuthorizationHeaderValue = `Bearer ${endpointAuthToken.trim()}`;

		return (req: Request, res: Response, next: NextFunction) => {
			if (req.headers.authorization !== expectedAuthorizationHeaderValue) {
				res.status(401).send('Unauthorized');
				return;
			}
			next();
		};
	}

	setPlainData(overwriteData: ICredentialsOverwrite) {
		// If data gets reinitialized reset the resolved types cache
		this.resolvedTypes.length = 0;

		this.overwriteData = overwriteData;

		for (const type in overwriteData) {
			const overwrites = this.getOverwrites(type);

			if (overwrites && Object.keys(overwrites).length) {
				this.overwriteData[type] = overwrites;
			}
		}
	}

	async setData(
		overwriteData: ICredentialsOverwrite,
		storeInDb: boolean = true,
		reloadFrontend: boolean = true,
	) {
		this.setPlainData(overwriteData);
		if (storeInDb && this.globalConfig.credentials.overwrite.persistence) {
			await this.saveOverwriteDataToDB(overwriteData, true);
		}

		if (reloadFrontend) {
			await this.reloadFrontendService();
		}
	}

	private async reloadFrontendService() {
		// FrontendService has CredentialOverwrites injected via the constructor
		// to break the circular dependency we need to use the container to get the instance
		const { FrontendService } = await import('./services/frontend.service');
		await Container.get(FrontendService)?.generateTypes();
	}

	applyOverwrite(type: string, data: ICredentialDataDecryptedObject) {
		const overwrites = this.get(type);

		if (overwrites === undefined) {
			return data;
		}

		const returnData = deepCopy(data);
		// Overwrite only if there is currently no data set
		for (const key of Object.keys(overwrites)) {
			// @ts-ignore
			if ([null, undefined, ''].includes(returnData[key])) {
				returnData[key] = overwrites[key];
			}
		}

		return returnData;
	}

	getOverwrites(type: string): ICredentialDataDecryptedObject | undefined {
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
			Object.assign(overwrites, this.getOverwrites(credentialsTypeName));
		}

		if (this.overwriteData[type] !== undefined) {
			Object.assign(overwrites, this.overwriteData[type]);
		}

		this.resolvedTypes.push(type);

		return overwrites;
	}

	private get(name: string): ICredentialDataDecryptedObject | undefined {
		const parentTypes = this.credentialTypes.getParentTypes(name);
		return [name, ...parentTypes]
			.reverse()
			.map((type) => this.overwriteData[type])
			.filter((type) => !!type)
			.reduce((acc, current) => Object.assign(acc, current), {});
	}

	getAll(): ICredentialsOverwrite {
		return this.overwriteData;
	}
}
