import { deepCopy } from 'n8n-workflow';
import config from '@/config';
import { CredentialsService } from './credentials.service';
import { CredentialRequest, ListQuery } from '@/requests';
import { InternalHooks } from '@/InternalHooks';
import { Logger } from '@/Logger';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnauthorizedError } from '@/errors/response-errors/unauthorized.error';
import { NamingService } from '@/services/naming.service';
import { License } from '@/License';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { OwnershipService } from '@/services/ownership.service';
import { EnterpriseCredentialsService } from './credentials.service.ee';
import { Delete, Get, Licensed, Patch, Post, Put, RestController } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UserManagementMailer } from '@/UserManagement/email';
import * as Db from '@/Db';
import * as utils from '@/utils';
import { listQueryMiddleware } from '@/middlewares';

@RestController('/credentials')
export class CredentialsController {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly enterpriseCredentialsService: EnterpriseCredentialsService,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly namingService: NamingService,
		private readonly license: License,
		private readonly logger: Logger,
		private readonly ownershipService: OwnershipService,
		private readonly internalHooks: InternalHooks,
		private readonly userManagementMailer: UserManagementMailer,
	) {}

	@Get('/', { middlewares: listQueryMiddleware })
	async getMany(req: ListQuery.Request) {
		return await this.credentialsService.getMany(req.user, {
			listQueryOptions: req.listQueryOptions,
		});
	}

	@Get('/new')
	async generateUniqueName(req: CredentialRequest.NewName) {
		const requestedName = req.query.name ?? config.getEnv('credentials.defaultName');

		return {
			name: await this.namingService.getUniqueCredentialName(requestedName),
		};
	}

	@Get('/:id')
	async getOne(req: CredentialRequest.Get) {
		if (this.license.isSharingEnabled()) {
			const { id: credentialId } = req.params;
			const includeDecryptedData = req.query.includeData === 'true';

			let credential = await this.credentialsRepository.findOne({
				where: { id: credentialId },
				relations: ['shared', 'shared.user'],
			});

			if (!credential) {
				throw new NotFoundError(
					'Could not load the credential. If you think this is an error, ask the owner to share it with you again',
				);
			}

			const userSharing = credential.shared?.find((shared) => shared.user.id === req.user.id);

			if (!userSharing && !req.user.hasGlobalScope('credential:read')) {
				throw new UnauthorizedError('Forbidden.');
			}

			credential = this.ownershipService.addOwnedByAndSharedWith(credential);

			// Below, if `userSharing` does not exist, it means this credential is being
			// fetched by the instance owner or an admin. In this case, they get the full data
			if (!includeDecryptedData || userSharing?.role === 'credential:user') {
				const { data: _, ...rest } = credential;
				return { ...rest };
			}

			const { data: _, ...rest } = credential;

			const decryptedData = this.credentialsService.redact(
				this.credentialsService.decrypt(credential),
				credential,
			);

			return { data: decryptedData, ...rest };
		}

		// non-enterprise

		const { id: credentialId } = req.params;
		const includeDecryptedData = req.query.includeData === 'true';

		const sharing = await this.credentialsService.getSharing(
			req.user,
			credentialId,
			{ allowGlobalScope: true, globalScope: 'credential:read' },
			['credentials'],
		);

		if (!sharing) {
			throw new NotFoundError(`Credential with ID "${credentialId}" could not be found.`);
		}

		const { credentials: credential } = sharing;

		const { data: _, ...rest } = credential;

		if (!includeDecryptedData) {
			return { ...rest };
		}

		const decryptedData = this.credentialsService.redact(
			this.credentialsService.decrypt(credential),
			credential,
		);

		return { data: decryptedData, ...rest };
	}

	@Post('/test')
	async testCredentials(req: CredentialRequest.Test) {
		if (this.license.isSharingEnabled()) {
			const { credentials } = req.body;

			const credentialId = credentials.id;
			const { ownsCredential } = await this.enterpriseCredentialsService.isOwned(
				req.user,
				credentialId,
			);

			const sharing = await this.enterpriseCredentialsService.getSharing(req.user, credentialId, {
				allowGlobalScope: true,
				globalScope: 'credential:read',
			});
			if (!ownsCredential) {
				if (!sharing) {
					throw new UnauthorizedError('Forbidden');
				}

				const decryptedData = this.credentialsService.decrypt(sharing.credentials);
				Object.assign(credentials, { data: decryptedData });
			}

			const mergedCredentials = deepCopy(credentials);
			if (mergedCredentials.data && sharing?.credentials) {
				const decryptedData = this.credentialsService.decrypt(sharing.credentials);
				mergedCredentials.data = this.credentialsService.unredact(
					mergedCredentials.data,
					decryptedData,
				);
			}

			return await this.credentialsService.test(req.user, mergedCredentials);
		}

		// non-enterprise

		const { credentials } = req.body;

		const sharing = await this.credentialsService.getSharing(req.user, credentials.id, {
			allowGlobalScope: true,
			globalScope: 'credential:read',
		});

		const mergedCredentials = deepCopy(credentials);
		if (mergedCredentials.data && sharing?.credentials) {
			const decryptedData = this.credentialsService.decrypt(sharing.credentials);
			mergedCredentials.data = this.credentialsService.unredact(
				mergedCredentials.data,
				decryptedData,
			);
		}

		return await this.credentialsService.test(req.user, mergedCredentials);
	}

	@Post('/')
	async createCredentials(req: CredentialRequest.Create) {
		const newCredential = await this.credentialsService.prepareCreateData(req.body);

		const encryptedData = this.credentialsService.createEncryptedData(null, newCredential);
		const credential = await this.credentialsService.save(newCredential, encryptedData, req.user);

		void this.internalHooks.onUserCreatedCredentials({
			user: req.user,
			credential_name: newCredential.name,
			credential_type: credential.type,
			credential_id: credential.id,
			public_api: false,
		});

		return credential;
	}

	@Patch('/:id')
	async updateCredentials(req: CredentialRequest.Update) {
		const { id: credentialId } = req.params;

		const sharing = await this.credentialsService.getSharing(
			req.user,
			credentialId,
			{
				allowGlobalScope: true,
				globalScope: 'credential:update',
			},
			['credentials'],
		);

		if (!sharing) {
			this.logger.info('Attempt to update credential blocked due to lack of permissions', {
				credentialId,
				userId: req.user.id,
			});
			throw new NotFoundError(
				'Credential to be updated not found. You can only update credentials owned by you',
			);
		}

		if (sharing.role !== 'credential:owner' && !req.user.hasGlobalScope('credential:update')) {
			this.logger.info('Attempt to update credential blocked due to lack of permissions', {
				credentialId,
				userId: req.user.id,
			});
			throw new UnauthorizedError('You can only update credentials owned by you');
		}

		const { credentials: credential } = sharing;

		const decryptedData = this.credentialsService.decrypt(credential);
		const preparedCredentialData = await this.credentialsService.prepareUpdateData(
			req.body,
			decryptedData,
		);
		const newCredentialData = this.credentialsService.createEncryptedData(
			credentialId,
			preparedCredentialData,
		);

		const responseData = await this.credentialsService.update(credentialId, newCredentialData);

		if (responseData === null) {
			throw new NotFoundError(`Credential ID "${credentialId}" could not be found to be updated.`);
		}

		// Remove the encrypted data as it is not needed in the frontend
		const { data: _, ...rest } = responseData;

		this.logger.verbose('Credential updated', { credentialId });

		void this.internalHooks.onUserUpdatedCredentials({
			user: req.user,
			credential_name: credential.name,
			credential_type: credential.type,
			credential_id: credential.id,
		});

		return { ...rest };
	}

	@Delete('/:id')
	async deleteCredentials(req: CredentialRequest.Delete) {
		const { id: credentialId } = req.params;

		const sharing = await this.credentialsService.getSharing(
			req.user,
			credentialId,
			{
				allowGlobalScope: true,
				globalScope: 'credential:delete',
			},
			['credentials'],
		);

		if (!sharing) {
			this.logger.info('Attempt to delete credential blocked due to lack of permissions', {
				credentialId,
				userId: req.user.id,
			});
			throw new NotFoundError(
				'Credential to be deleted not found. You can only removed credentials owned by you',
			);
		}

		if (sharing.role !== 'credential:owner' && !req.user.hasGlobalScope('credential:delete')) {
			this.logger.info('Attempt to delete credential blocked due to lack of permissions', {
				credentialId,
				userId: req.user.id,
			});
			throw new UnauthorizedError('You can only remove credentials owned by you');
		}

		const { credentials: credential } = sharing;

		await this.credentialsService.delete(credential);

		void this.internalHooks.onUserDeletedCredentials({
			user: req.user,
			credential_name: credential.name,
			credential_type: credential.type,
			credential_id: credential.id,
		});

		return true;
	}

	@Licensed('feat:sharing')
	@Put('/:id/share')
	async shareCredentials(req: CredentialRequest.Share) {
		const { id: credentialId } = req.params;
		const { shareWithIds } = req.body;

		if (
			!Array.isArray(shareWithIds) ||
			!shareWithIds.every((userId) => typeof userId === 'string')
		) {
			throw new BadRequestError('Bad request');
		}

		const isOwnedRes = await this.enterpriseCredentialsService.isOwned(req.user, credentialId);
		const { ownsCredential } = isOwnedRes;
		let { credential } = isOwnedRes;
		if (!ownsCredential || !credential) {
			credential = undefined;
			// Allow owners/admins to share
			if (req.user.hasGlobalScope('credential:share')) {
				const sharedRes = await this.enterpriseCredentialsService.getSharing(
					req.user,
					credentialId,
					{
						allowGlobalScope: true,
						globalScope: 'credential:share',
					},
				);
				credential = sharedRes?.credentials;
			}
			if (!credential) {
				throw new UnauthorizedError('Forbidden');
			}
		}

		const ownerIds = (
			await this.enterpriseCredentialsService.getSharings(
				Db.getConnection().createEntityManager(),
				credentialId,
				['shared'],
			)
		)
			.filter((e) => e.role === 'credential:owner')
			.map((e) => e.userId);

		let amountRemoved: number | null = null;
		let newShareeIds: string[] = [];
		await Db.transaction(async (trx) => {
			// remove all sharings that are not supposed to exist anymore
			const { affected } = await this.credentialsRepository.pruneSharings(trx, credentialId, [
				...ownerIds,
				...shareWithIds,
			]);
			if (affected) amountRemoved = affected;

			const sharings = await this.enterpriseCredentialsService.getSharings(trx, credentialId);

			// extract the new sharings that need to be added
			newShareeIds = utils.rightDiff(
				[sharings, (sharing) => sharing.userId],
				[shareWithIds, (shareeId) => shareeId],
			);

			if (newShareeIds.length) {
				await this.enterpriseCredentialsService.share(trx, credential, newShareeIds);
			}
		});

		void this.internalHooks.onUserSharedCredentials({
			user: req.user,
			credential_name: credential.name,
			credential_type: credential.type,
			credential_id: credential.id,
			user_id_sharer: req.user.id,
			user_ids_sharees_added: newShareeIds,
			sharees_removed: amountRemoved,
		});

		await this.userManagementMailer.notifyCredentialsShared({
			sharer: req.user,
			newShareeIds,
			credentialsName: credential.name,
		});
	}
}
