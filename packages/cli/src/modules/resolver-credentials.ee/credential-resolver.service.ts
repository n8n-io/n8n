import { ICredentialsResolverService } from '@/credentials/credentials-resolver-proxy.service';

import { Logger } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';
import { Credentials } from 'n8n-core';
import { ICredentialDataDecryptedObject, IRunExecutionData } from 'n8n-workflow';
import { AvailableEngine, ResolverConfig, ResolverConfigSchema } from './types';
import { IStorageEngine } from './storage-engines/interface';
import { DirectMapEngine } from './storage-engines/direct-map.engine';

@Service()
export class CredentialResolverService implements ICredentialsResolverService {
	private readonly engineMap: Map<AvailableEngine, IStorageEngine<ICredentialDataDecryptedObject>> =
		new Map([['direct_map', Container.get(DirectMapEngine)]]);

	constructor(private readonly logger: Logger) {}

	async findCredentialData(
		credential: Credentials<ICredentialDataDecryptedObject>,
		decryptedDataOriginal: ICredentialDataDecryptedObject,
		workflowRunData: IRunExecutionData,
	): Promise<ICredentialDataDecryptedObject | undefined> {
		const resolverConfig = this.parseCredentialData(decryptedDataOriginal);

		if (!resolverConfig) {
			this.logger.debug('Not a resolver credential');
			return;
		}
		const engineSelection = resolverConfig.resolver_options.engine;

		const engine = this.engineMap.get(engineSelection);

		if (!engine) {
			this.logger.error(`Engine ${engineSelection} not found`);
			return;
		}

		if (!credential.id) {
			this.logger.error('Credential id not found');
			return;
		}
		this.logger.debug('Resolving credential data, based on workflow execution data');

		return await engine.getSecret(credential.id, workflowRunData.executionContext!);
	}

	private parseCredentialData(
		decryptedDataOriginal: ICredentialDataDecryptedObject,
	): ResolverConfig | undefined {
		const validationResult = ResolverConfigSchema.safeParse(decryptedDataOriginal);
		if (!validationResult.success || !validationResult.data.is_resolveable) {
			return;
		}

		return validationResult.data;
	}

	isResolveable(credential: ICredentialDataDecryptedObject): boolean {
		const resolverConfig = this.parseCredentialData(credential);
		return resolverConfig !== undefined;
	}

	makeResolveable(credential: ICredentialDataDecryptedObject): ICredentialDataDecryptedObject {
		const resolverConfig = this.parseCredentialData(credential);
		if (!resolverConfig) {
			const cfg: ResolverConfig = {
				resolver_options: {
					engine: 'direct_map',
				},
				is_resolveable: true,
			};
			return {
				...cfg,
				...credential,
			};
		} else {
			resolverConfig.is_resolveable = true;
		}
		return resolverConfig;
	}

	async storeCredentialData(
		credentialId: string,
		decryptedDataOriginal: ICredentialDataDecryptedObject,
		credentialData: ICredentialDataDecryptedObject,
		accessToken: string,
	): Promise<void> {
		const resolverConfig = this.parseCredentialData(decryptedDataOriginal);

		if (!resolverConfig) {
			throw new Error('Credential is not resolveable');
		}

		if (!resolverConfig.is_resolveable) {
			throw new Error('Credential is not resolveable');
		}

		const engineSelection = resolverConfig.resolver_options.engine;

		const engine = this.engineMap.get(engineSelection);

		if (!engine) {
			throw new Error(`Engine ${engineSelection} not found`);
		}

		await engine.setSecret(credentialId, credentialData, accessToken);
	}
}
