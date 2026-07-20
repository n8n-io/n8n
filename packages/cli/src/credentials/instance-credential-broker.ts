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
	InstanceCredentialConsumerRegistry,
	type InstanceCredentialConsumer,
} from './instance-credential-consumer.registry';

export type InstanceCredentialSummary = Pick<CredentialsEntity, 'id' | 'name' | 'type'>;

export interface ResolvedInstanceCredential extends InstanceCredentialSummary {
	data: ICredentialDataDecryptedObject;
}

@Service()
export class InstanceCredentialBroker {
	constructor(
		private readonly logger: Logger,
		private readonly consumerRegistry: InstanceCredentialConsumerRegistry,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly assignmentRepository: InstanceCredentialAssignmentRepository,
		private readonly credentialsService: CredentialsService,
	) {}

	registerConsumer(consumer: InstanceCredentialConsumer): void {
		this.consumerRegistry.register(consumer);
	}

	async listForConsumer(consumerId: string): Promise<InstanceCredentialSummary[]> {
		const consumer = this.consumerRegistry.get(consumerId);
		return await this.credentialsRepository.find({
			select: ['id', 'name', 'type'],
			where: {
				availability: 'instance',
				type: In([...consumer.credentialTypes]),
			},
			order: { name: 'ASC' },
		});
	}

	async assignForConsumer(
		consumerId: string,
		credentialId: string,
		transactionManager?: EntityManager,
	): Promise<InstanceCredentialSummary> {
		const consumer = this.consumerRegistry.get(consumerId);
		const credential = await this.findCredential(consumer, credentialId, transactionManager);
		if (!credential) {
			throw new UnprocessableRequestError(
				`Credential "${credentialId}" is not valid for instance credential consumer "${consumerId}"`,
			);
		}
		if (transactionManager) {
			await transactionManager.upsert(InstanceCredentialAssignment, { consumerId, credentialId }, [
				'consumerId',
			]);
		} else {
			await this.assignmentRepository.upsert({ consumerId, credentialId }, ['consumerId']);
		}
		this.logger.debug('Assigned instance credential', { consumerId, credentialId });
		return { id: credential.id, name: credential.name, type: credential.type };
	}

	async clearForConsumer(consumerId: string, transactionManager?: EntityManager): Promise<void> {
		this.consumerRegistry.get(consumerId);
		if (transactionManager) {
			await transactionManager.delete(InstanceCredentialAssignment, { consumerId });
		} else {
			await this.assignmentRepository.delete({ consumerId });
		}
	}

	async getAssignedCredentialId(
		consumerId: string,
		transactionManager?: EntityManager,
	): Promise<string | null> {
		this.consumerRegistry.get(consumerId);
		const assignment = transactionManager
			? await transactionManager.findOneBy(InstanceCredentialAssignment, { consumerId })
			: await this.assignmentRepository.findOneBy({ consumerId });
		return assignment?.credentialId ?? null;
	}

	async resolveForConsumer(
		consumerId: string,
		transactionManager?: EntityManager,
	): Promise<ResolvedInstanceCredential | null> {
		const credentialId = await this.getAssignedCredentialId(consumerId, transactionManager);
		if (!credentialId) return null;

		const consumer = this.consumerRegistry.get(consumerId);
		const credential = await this.findCredential(consumer, credentialId, transactionManager);
		if (!credential) {
			throw new UnprocessableRequestError(
				`Credential "${credentialId}" is not valid for instance credential consumer "${consumerId}"`,
			);
		}

		const resolved = {
			id: credential.id,
			name: credential.name,
			type: credential.type,
			data: await this.credentialsService.decrypt(credential, true),
		};
		this.logger.debug('Resolved instance credential', { consumerId, credentialId });
		return resolved;
	}

	private async findCredential(
		consumer: InstanceCredentialConsumer,
		credentialId: string,
		transactionManager?: EntityManager,
	): Promise<CredentialsEntity | null> {
		const options: FindOneOptions<CredentialsEntity> = {
			where: {
				id: credentialId,
				availability: 'instance',
				type: In([...consumer.credentialTypes]),
			},
		};
		return transactionManager
			? await transactionManager.findOne(CredentialsEntity, options)
			: await this.credentialsRepository.findOne(options);
	}
}
