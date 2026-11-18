import { OutboundHttp } from '@n8n/backend-network';
import { CredentialsFinderService, UrlService } from '@n8n/backend-services';
import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError, OperationalError } from '@n8n/errors';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialTypes } from '@/credential-types';

import { CredentialsService } from '../credentials.service';
import { VaultCredentialsConfig } from './vault-credentials.config';

/** Mirrored by the editor. Keep the two in sync. */
export interface VaultStatusResponse {
	enabled: boolean;
}

export interface VaultCaptureResponse {
	/** The page to load in the secure frame. It is served by the broker. */
	captureUrl: string;
	/** The origin that sends the "stored" message. The editor checks it. */
	captureOrigin: string;
}

interface TicketResponse {
	ticket?: string;
}

/**
 * Starts a secure entry for the secret fields of one credential.
 *
 * The secret never passes through n8n. n8n only asks the broker for a single-use ticket, points the
 * credential at its vault path, and hands the editor the URL of the entry page.
 */
@Service()
export class VaultCaptureService {
	constructor(
		private readonly config: VaultCredentialsConfig,
		private readonly outboundHttp: OutboundHttp,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsService: CredentialsService,
		private readonly credentialTypes: CredentialTypes,
		private readonly urlService: UrlService,
	) {}

	isEnabled(): boolean {
		return !!(this.config.brokerUrl && this.config.vaultUrl && this.config.captureKey);
	}

	async startCapture(user: User, credentialId: string): Promise<VaultCaptureResponse> {
		if (!this.isEnabled()) throw new BadRequestError('Vault credentials are not configured');

		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:update'],
		);
		if (!credential) throw new NotFoundError('Credential not found');
		if (credential.isManaged) throw new BadRequestError('Managed credentials cannot be updated');

		const credentialType = this.credentialTypes.getByName(credential.type);
		const secretFields = credentialType.properties.filter(
			(property) => property.typeOptions?.password === true,
		);
		if (secretFields.length === 0) {
			throw new BadRequestError('This credential type has no secret fields');
		}

		await this.pointCredentialAtVault(
			user,
			credential,
			secretFields.map((field) => field.name),
		);

		const ticket = await this.requestTicket({
			credentialId,
			credentialName: credential.name,
			title: credentialType.displayName,
			fields: secretFields.map((field) => ({ name: field.name, label: field.displayName })),
			parentOrigin: new URL(this.urlService.getInstanceBaseUrl()).origin,
		});

		const publicUrl = (this.config.brokerPublicUrl || this.config.brokerUrl).replace(/\/$/, '');
		return {
			captureUrl: `${publicUrl}/capture?ticket=${encodeURIComponent(ticket)}`,
			captureOrigin: new URL(publicUrl).origin,
		};
	}

	/** Keeps the non-secret fields in n8n and replaces the secret fields with a reference. */
	private async pointCredentialAtVault(
		user: User,
		credential: CredentialsEntity,
		secretFieldNames: string[],
	) {
		const current = await this.credentialsService.decrypt(credential, true);
		const data: ICredentialDataDecryptedObject = {};
		for (const [key, value] of Object.entries(current)) {
			if (key === '$vault' || secretFieldNames.includes(key)) continue;
			data[key] = value;
		}
		data.$vault = `kv/creds/${credential.id}`;

		const encrypted = await this.credentialsService.createEncryptedData({
			id: credential.id,
			name: credential.name,
			type: credential.type,
			data,
		});
		await this.credentialsService.update(credential.id, encrypted, {
			kind: 'user',
			user: { id: user.id },
		});
	}

	private async requestTicket(body: object): Promise<string> {
		// Admin-configured infrastructure that may be internal: the broker.
		const client = this.outboundHttp.requests({
			useDefaultSsrfPolicy: 'unsafe',
			timeout: this.config.requestTimeout,
		});
		try {
			const response = await client.request<TicketResponse>({
				method: 'POST',
				url: `${this.config.brokerUrl}/capture-tickets`,
				headers: { 'x-capture-key': this.config.captureKey },
				body,
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			});
			if (response.statusCode !== 200 || !response.body.ticket) {
				throw new OperationalError('The vault broker did not issue a secure entry ticket');
			}
			return response.body.ticket;
		} catch (error) {
			if (error instanceof OperationalError) throw error;
			throw new OperationalError('The vault broker could not be reached', { cause: error });
		}
	}
}
