import type { CredentialOptionsRequestDto } from '@n8n/api-types';
import { CredentialsFinderService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';
import { CredentialsHelper } from '@/credentials-helper';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { SecretsProviderAccessCheckService } from '@/modules/external-secrets.ee/secret-provider-access-check.service.ee';
import { userHasScopes } from '@/permissions.ee/check-access';
import { getBase } from '@/workflow-execute-additional-data';

import { CredentialsService } from './credentials.service';
import {
	validateAccessToReferencedSecretProviders,
	validateExternalSecretsPermissions,
} from './validation';

@Service()
export class CredentialOptionsService {
	constructor(
		private readonly credentialTypes: CredentialTypes,
		private readonly credentialsHelper: CredentialsHelper,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinder: CredentialsFinderService,
		private readonly externalSecretsConfig: ExternalSecretsConfig,
		private readonly secretProviderAccess: SecretsProviderAccessCheckService,
	) {}

	async lookupDraft(user: User, request: CredentialOptionsRequestDto, projectId: string | null) {
		const allowed =
			projectId === null
				? hasGlobalScope(user, 'credential:manageInstance')
				: await userHasScopes(user, ['credential:create'], false, { projectId });
		if (!allowed) throw new ForbiddenError();
		await this.credentialsService.enforceCredentialUse(
			{ id: '', type: request.type },
			{ kind: 'user', user },
			projectId,
		);
		await this.validateExternalSecrets(user, request.data, projectId);
		return await this.load(user, request, request.data, projectId);
	}

	async lookupStored(user: User, credentialId: string, request: CredentialOptionsRequestDto) {
		const storedCredential = await this.credentialsFinder.findCredentialForUser(
			credentialId,
			user,
			['credential:read'],
			{ includeInstanceCredentials: true },
		);
		if (!storedCredential) throw new ForbiddenError();
		if (storedCredential.type !== request.type) {
			throw new BadRequestError('The credential type does not match the stored credential');
		}
		const { credentials, storedData } = await this.credentialsService.prepareCredentialsForUse({
			storedCredential,
			user,
			credentialsToUse: storedCredential.isManaged
				? undefined
				: { id: credentialId, name: storedCredential.name, type: request.type, data: request.data },
		});
		const projectId = credentials.homeProject?.id ?? null;
		const data = credentials.data ?? {};
		await this.validateExternalSecrets(user, data, projectId, storedData);
		return await this.load(user, request, data, projectId);
	}

	private async validateExternalSecrets(
		user: User,
		data: ICredentialDataDecryptedObject,
		projectId: string | null,
		storedData?: ICredentialDataDecryptedObject,
	) {
		if (projectId === null) {
			this.credentialsService.validateInstanceCredentialData(data);
			return;
		}
		await validateExternalSecretsPermissions({
			user,
			projectId,
			dataToSave: data,
			decryptedExistingData: storedData,
		});
		if (this.externalSecretsConfig.externalSecretsForProjects) {
			await validateAccessToReferencedSecretProviders(
				projectId,
				data,
				this.secretProviderAccess,
				'create',
			);
		}
	}

	private async load(
		user: User,
		request: CredentialOptionsRequestDto,
		data: ICredentialDataDecryptedObject,
		projectId: string | null,
	) {
		const credentialType = this.credentialTypes.getByName(request.type);
		const property = this.credentialsHelper
			.getCredentialsProperties(request.type)
			.find((field) => field.name === request.propertyName);
		const methodName = property?.typeOptions?.loadOptionsMethod;
		const loader =
			methodName && Object.hasOwn(credentialType.methods?.loadOptions ?? {}, methodName)
				? credentialType.methods?.loadOptions?.[methodName]
				: undefined;
		if (property?.type !== 'string' || !loader) {
			throw new BadRequestError('This credential field does not support loading a list.');
		}
		try {
			const additionalData = await getBase({ userId: user.id, projectId: projectId ?? undefined });
			const resolvedData = await this.credentialsHelper.applyDefaultsAndOverwrites(
				additionalData,
				data,
				request.type,
				'internal',
				undefined,
				undefined,
			);
			return await loader(resolvedData, request.filter, request.paginationToken);
		} catch {
			// Provider errors can contain credential data.
			throw new BadRequestError('Could not load the list. Try again or enter an ID.');
		}
	}
}
