import { Logger } from '@n8n/backend-common';
import {
	CredentialsEntity,
	InstanceCredentialAssignmentRepository,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import { CredentialsService } from './credentials.service';
import {
	InstanceCredentialUseRegistry,
	type InstanceCredentialUse,
} from './instance-credential-use.registry';

export type { InstanceCredentialUse } from './instance-credential-use.registry';

type InstanceCredentialSummary = Pick<CredentialsEntity, 'id' | 'name' | 'type'>;

export interface ResolvedInstanceCredential extends InstanceCredentialSummary {
	data: ICredentialDataDecryptedObject;
}

@Service()
export class InstanceCredentialBroker {
	constructor(
		private readonly logger: Logger,
		private readonly useRegistry: InstanceCredentialUseRegistry,
		private readonly assignmentRepository: InstanceCredentialAssignmentRepository,
		private readonly credentialsService: CredentialsService,
	) {}

	registerUse(credentialUse: InstanceCredentialUse): void {
		this.useRegistry.register(credentialUse);
	}

	async listForUse(credentialUse: InstanceCredentialUse): Promise<InstanceCredentialSummary[]> {
		const registeredUse = this.useRegistry.get(credentialUse.id);
		return await this.assignmentRepository.findAvailableCredentials(registeredUse.credentialTypes);
	}

	async assignForUse(
		credentialUse: InstanceCredentialUse,
		credentialId: string,
		ctx?: OperationContext,
	): Promise<InstanceCredentialSummary> {
		const registeredUse = this.useRegistry.get(credentialUse.id);
		const credentialUseId = registeredUse.id;
		const credential = await this.assignmentRepository.assignCredential(
			credentialUseId,
			credentialId,
			registeredUse.credentialTypes,
			ctx,
		);
		if (!credential) throw this.invalidCredentialError(credentialUseId, credentialId);
		this.logger.debug('Assigned instance credential', { credentialUseId, credentialId });
		return { id: credential.id, name: credential.name, type: credential.type };
	}

	async clearForUse(credentialUse: InstanceCredentialUse, ctx?: OperationContext): Promise<void> {
		this.useRegistry.get(credentialUse.id);
		await this.assignmentRepository.clearCredential(credentialUse.id, ctx);
	}

	async getAssignedCredentialId(
		credentialUse: InstanceCredentialUse,
		ctx?: OperationContext,
	): Promise<string | null> {
		this.useRegistry.get(credentialUse.id);
		return await this.assignmentRepository.findAssignedCredentialId(credentialUse.id, ctx);
	}

	async resolveForUse(
		credentialUse: InstanceCredentialUse,
		ctx?: OperationContext,
	): Promise<ResolvedInstanceCredential | null> {
		const registeredUse = this.useRegistry.get(credentialUse.id);
		const credentialUseId = registeredUse.id;
		const assignment = await this.assignmentRepository.findAssignedCredential(
			credentialUseId,
			registeredUse.credentialTypes,
			ctx,
		);
		if (!assignment) return null;
		const { credentialId, credential } = assignment;
		if (!credential) throw this.invalidCredentialError(credentialUseId, credentialId);

		const resolved = {
			id: credential.id,
			name: credential.name,
			type: credential.type,
			data: await this.credentialsService.decrypt(credential, true),
		};
		this.logger.debug('Resolved instance credential', {
			credentialUseId,
			credentialId: credential.id,
		});
		return resolved;
	}

	private invalidCredentialError(credentialUseId: string, credentialId: string) {
		return new UnprocessableRequestError(
			`Credential "${credentialId}" is not valid for instance credential use "${credentialUseId}"`,
		);
	}
}
