import { Logger } from '@n8n/backend-common';
import { CredentialsRepository, type CredentialsEntity } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
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

	async resolveForConsumer(
		consumerId: string,
		credentialId: string,
	): Promise<ResolvedInstanceCredential> {
		const consumer = this.consumerRegistry.get(consumerId);
		const credential = await this.credentialsRepository.findOne({
			where: {
				id: credentialId,
				availability: 'instance',
				type: In([...consumer.credentialTypes]),
			},
		});
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
}
