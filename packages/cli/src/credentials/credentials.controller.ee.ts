import express from 'express';
import type { INodeCredentialTestResult } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';

import type { CredentialRequest } from '@/requests';
import { isSharingEnabled } from '@/UserManagement/UserManagementHelper';
import { EECredentialsService as EECredentials } from './credentials.service.ee';
import { OwnershipService } from '@/services/ownership.service';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnauthorizedError } from '@/errors/response-errors/unauthorized.error';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import * as utils from '@/utils';

export const EECredentialsController = express.Router();

EECredentialsController.use((req, res, next) => {
	if (!isSharingEnabled()) {
		// skip ee router and use free one
		next('router');
		return;
	}
	// use ee router
	next();
});

/**
 * GET /credentials/:id
 */
EECredentialsController.get(
	'/:id(\\w+)',
	(req, res, next) => (req.params.id === 'new' ? next('router') : next()), // skip ee router and use free one for naming
	ResponseHelper.send(async (req: CredentialRequest.Get) => {
		const { id: credentialId } = req.params;
		const includeDecryptedData = req.query.includeData === 'true';

		let credential = await Container.get(CredentialsRepository).findOne({
			where: { id: credentialId },
			relations: ['shared', 'shared.role', 'shared.user'],
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

		credential = Container.get(OwnershipService).addOwnedByAndSharedWith(credential);

		if (!includeDecryptedData || !userSharing || userSharing.role.name !== 'owner') {
			const { data: _, ...rest } = credential;
			return { ...rest };
		}

		const { data: _, ...rest } = credential;

		const decryptedData = EECredentials.redact(EECredentials.decrypt(credential), credential);

		return { data: decryptedData, ...rest };
	}),
);

/**
 * POST /credentials/test
 *
 * Test if a credential is valid.
 */
EECredentialsController.post(
	'/test',
	ResponseHelper.send(async (req: CredentialRequest.Test): Promise<INodeCredentialTestResult> => {
		const { credentials } = req.body;

		const credentialId = credentials.id;
		const { ownsCredential } = await EECredentials.isOwned(req.user, credentialId);

		const sharing = await EECredentials.getSharing(req.user, credentialId, {
			allowGlobalScope: true,
			globalScope: 'credential:read',
		});
		if (!ownsCredential) {
			if (!sharing) {
				throw new UnauthorizedError('Forbidden');
			}

			const decryptedData = EECredentials.decrypt(sharing.credentials);
			Object.assign(credentials, { data: decryptedData });
		}

		const mergedCredentials = deepCopy(credentials);
		if (mergedCredentials.data && sharing?.credentials) {
			const decryptedData = EECredentials.decrypt(sharing.credentials);
			mergedCredentials.data = EECredentials.unredact(mergedCredentials.data, decryptedData);
		}

		return await EECredentials.test(req.user, mergedCredentials);
	}),
);

/**
 * (EE) PUT /credentials/:id/share
 *
 * Grant or remove users' access to a credential.
 */

EECredentialsController.put(
	'/:credentialId/share',
	ResponseHelper.send(async (req: CredentialRequest.Share) => {
		const { credentialId } = req.params;
		const { shareWithIds } = req.body;

		if (
			!Array.isArray(shareWithIds) ||
			!shareWithIds.every((userId) => typeof userId === 'string')
		) {
			throw new BadRequestError('Bad request');
		}

		const isOwnedRes = await EECredentials.isOwned(req.user, credentialId);
		const { ownsCredential } = isOwnedRes;
		let { credential } = isOwnedRes;
		if (!ownsCredential || !credential) {
			credential = undefined;
			// Allow owners/admins to share
			if (req.user.hasGlobalScope('credential:share')) {
				const sharedRes = await EECredentials.getSharing(req.user, credentialId, {
					allowGlobalScope: true,
					globalScope: 'credential:share',
				});
				credential = sharedRes?.credentials;
			}
			if (!credential) {
				throw new UnauthorizedError('Forbidden');
			}
		}

		const ownerIds = (
			await EECredentials.getSharings(Db.getConnection().createEntityManager(), credentialId, [
				'shared',
				'shared.role',
			])
		)
			.filter((e) => e.role.name === 'owner')
			.map((e) => e.userId);

		let amountRemoved: number | null = null;
		let newShareeIds: string[] = [];
		await Db.transaction(async (trx) => {
			// remove all sharings that are not supposed to exist anymore
			const { affected } = await Container.get(CredentialsRepository).pruneSharings(
				trx,
				credentialId,
				[...ownerIds, ...shareWithIds],
			);
			if (affected) amountRemoved = affected;

			const sharings = await EECredentials.getSharings(trx, credentialId);

			// extract the new sharings that need to be added
			newShareeIds = utils.rightDiff(
				[sharings, (sharing) => sharing.userId],
				[shareWithIds, (shareeId) => shareeId],
			);

			if (newShareeIds.length) {
				await EECredentials.share(trx, credential!, newShareeIds);
			}
		});

		void Container.get(InternalHooks).onUserSharedCredentials({
			user: req.user,
			credential_name: credential.name,
			credential_type: credential.type,
			credential_id: credential.id,
			user_id_sharer: req.user.id,
			user_ids_sharees_added: newShareeIds,
			sharees_removed: amountRemoved,
		});
	}),
);
