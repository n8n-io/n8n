import { Logger } from '@n8n/backend-common';
import {
	CredentialsEntity,
	CredentialsRepository,
	InstanceCredentialAssignment,
	InstanceCredentialAssignmentRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, type EntityManager, type FindOneOptions } from '@n8n/typeorm';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import { CredentialsService } from './credentials.service';
import {
	InstanceCredentialUseRegistry,
	type InstanceCredentialUse,
} from './instance-credential-use.registry';

export type InstanceCredentialSummary = Pick<CredentialsEntity, 'id' | 'name' | 'type'>;

export interface ResolvedInstanceCredential extends InstanceCredentialSummary {
	data: ICredentialDataDecryptedObject;
}

@Service()
export class InstanceCredentialBroker {
	constructor(
		private readonly logger: Logger,
		private readonly useRegistry: InstanceCredentialUseRegistry,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly assignmentRepository: InstanceCredentialAssignmentRepository,
		private readonly credentialsService: CredentialsService,
	) {}

	registerUse(credentialUse: InstanceCredentialUse): void {
		this.useRegistry.register(credentialUse);
	}

	async listForUse(credentialUseId: string): Promise<InstanceCredentialSummary[]> {
		const credentialUse = this.useRegistry.get(credentialUseId);
		return await this.credentialsRepository.find({
			select: ['id', 'name', 'type'],
			where: {
				availability: 'instance',
				type: In([...credentialUse.credentialTypes]),
			},
			order: { name: 'ASC' },
		});
	}

	async assignForUse(
		credentialUseId: string,
		credentialId: string,
		transactionManager?: EntityManager,
	): Promise<InstanceCredentialSummary> {
		const credentialUse = this.useRegistry.get(credentialUseId);
		const credential = await this.findCredential(credentialUse, credentialId, transactionManager);
		if (!credential) {
			throw new UnprocessableRequestError(
				`Credential "${credentialId}" is not valid for instance credential use "${credentialUseId}"`,
			);
		}
		if (transactionManager) {
			await transactionManager.upsert(
				InstanceCredentialAssignment,
				{ credentialUseId, credentialId },
				['credentialUseId'],
			);
		} else {
			await this.assignmentRepository.upsert({ credentialUseId, credentialId }, [
				'credentialUseId',
			]);
		}
		this.logger.debug('Assigned instance credential', { credentialUseId, credentialId });
		return { id: credential.id, name: credential.name, type: credential.type };
	}

	async clearForUse(credentialUseId: string, transactionManager?: EntityManager): Promise<void> {
		this.useRegistry.get(credentialUseId);
		if (transactionManager) {
			await transactionManager.delete(InstanceCredentialAssignment, { credentialUseId });
		} else {
			await this.assignmentRepository.delete({ credentialUseId });
		}
	}

	async getAssignedCredentialId(
		credentialUseId: string,
		transactionManager?: EntityManager,
	): Promise<string | null> {
		this.useRegistry.get(credentialUseId);
		const assignment = transactionManager
			? await transactionManager.findOneBy(InstanceCredentialAssignment, { credentialUseId })
			: await this.assignmentRepository.findOneBy({ credentialUseId });
		return assignment?.credentialId ?? null;
	}

	async resolveForUse(
		credentialUseId: string,
		transactionManager?: EntityManager,
	): Promise<ResolvedInstanceCredential | null> {
		const credentialId = await this.getAssignedCredentialId(credentialUseId, transactionManager);
		if (!credentialId) return null;

		const credentialUse = this.useRegistry.get(credentialUseId);
		const credential = await this.findCredential(credentialUse, credentialId, transactionManager);
		if (!credential) {
			throw new UnprocessableRequestError(
				`Credential "${credentialId}" is not valid for instance credential use "${credentialUseId}"`,
			);
		}

		const resolved = {
			id: credential.id,
			name: credential.name,
			type: credential.type,
			data: await this.credentialsService.decrypt(credential, true),
		};
		this.logger.debug('Resolved instance credential', { credentialUseId, credentialId });
		return resolved;
	}

	private async findCredential(
		credentialUse: InstanceCredentialUse,
		credentialId: string,
		transactionManager?: EntityManager,
	): Promise<CredentialsEntity | null> {
		const options: FindOneOptions<CredentialsEntity> = {
			where: {
				id: credentialId,
				availability: 'instance',
				type: In([...credentialUse.credentialTypes]),
			},
		};
		return transactionManager
			? await transactionManager.findOne(CredentialsEntity, options)
			: await this.credentialsRepository.findOne(options);
	}
}
