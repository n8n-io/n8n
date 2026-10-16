import type { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { createHmac } from 'crypto';
import { Cipher } from 'n8n-core';
import { jsonParse, UnexpectedError, UserError } from 'n8n-workflow';

import type { CredentialsService } from '@/credentials/credentials.service';

import type { AgentChatIntegrationContext } from './agent-chat-integration';

const DESTINATION_CREDENTIAL_FIELDS: Record<string, readonly string[]> = {
	discord: ['applicationId', 'publicKey'],
	linear: ['clientId', 'signingSecret', 'actor'],
	teams: ['clientId', 'tenantId', 'graphApiBaseUrl', 'authentication'],
	whatsapp: ['phoneNumberId', 'businessAccountId', 'appSecret'],
};

export function agentChannelDestinationProof(
	ctx: AgentChatIntegrationContext,
	hmacSignatureSecret: string,
): string | undefined {
	const fields = DESTINATION_CREDENTIAL_FIELDS[ctx.integration.type];
	if (!fields) return undefined;
	return createHmac('sha256', hmacSignatureSecret)
		.update(
			JSON.stringify([
				'agent-channel-setup',
				ctx.integration.type,
				ctx.agentId,
				ctx.projectId,
				ctx.credentialId,
				ctx.webhookUrlFor(ctx.integration.type),
				...fields.map((field) => ctx.credential[field] ?? null),
			]),
		)
		.digest('hex');
}

function updatedDestinationProof(
	integrationType: string,
	storedProof: unknown,
	proof: string,
): string | string[] {
	if (integrationType !== 'linear') return proof;
	const previous = Array.isArray(storedProof) ? storedProof : [storedProof];
	const proofs = previous.filter((value: unknown): value is string => typeof value === 'string');
	return [...new Set([...proofs, proof])];
}

export async function rememberAgentChannelSetup(
	ctx: AgentChatIntegrationContext,
	options: {
		credentialTypes: readonly string[];
		displayLabel: string;
		proof: string;
		matchesSetupCredential: (
			credential: Record<string, unknown>,
			credentialType: string,
		) => boolean;
		credentialsService: CredentialsService;
		credentialsRepository: CredentialsRepository;
	},
): Promise<void> {
	const { credentialsService, credentialsRepository } = options;
	const projectCredentials = await credentialsService.findAllCredentialIdsForProject(ctx.projectId);
	const globalCredentials = await credentialsService.findAllGlobalCredentialIds(true);
	const credential = [...projectCredentials, ...globalCredentials].find(
		(entry) => entry.id === ctx.credentialId && options.credentialTypes.includes(entry.type),
	);
	if (!credential) {
		throw new UserError(
			`${options.displayLabel} credential is not available to this project. Select another credential and try again.`,
		);
	}
	const stored = await credentialsService.decrypt(credential, true);
	if (!options.matchesSetupCredential(stored, credential.type)) {
		throw new UserError(
			`The ${options.displayLabel} credential changed during channel setup. Start setup again.`,
		);
	}
	const updated = {
		...stored,
		agentSetupDestination: updatedDestinationProof(
			ctx.integration.type,
			stored.agentSetupDestination,
			options.proof,
		),
	};
	const encrypted = await credentialsService.createEncryptedData({
		id: credential.id,
		name: credential.name,
		type: credential.type,
		data: updated,
	});
	if (!encrypted.data) {
		throw new UnexpectedError('The configured channel credential data is missing.');
	}
	const saved = await credentialsRepository.updateDataIfUnchanged(
		credential.id,
		credential.type,
		credential.data,
		encrypted.data,
	);
	if (!saved) {
		throw new UserError(
			`The ${options.displayLabel} credential changed during channel setup. Start setup again.`,
		);
	}
	ctx.credential = updated;
}

const SLACK_SETUP_EVIDENCE_FIELDS = ['agentId', 'agentProjectId', 'agentWebhookUrl'] as const;

export function sanitizeAgentChannelSetupData<T extends Record<string, unknown>>(
	data: T,
	credentialType: string,
	storedData?: Record<string, unknown>,
): T {
	const sanitized = { ...data, agentSetupDestination: storedData?.agentSetupDestination };
	if (sanitized.agentSetupDestination === undefined) delete sanitized.agentSetupDestination;
	if (credentialType !== 'slackApi') return sanitized;
	const sameBotIdentity =
		typeof data.accessToken === 'string' &&
		data.accessToken.startsWith('xoxb-') &&
		data.accessToken === storedData?.accessToken &&
		typeof data.signatureSecret === 'string' &&
		data.signatureSecret.length > 0 &&
		data.signatureSecret === storedData?.signatureSecret;
	if (!sameBotIdentity) delete sanitized.agentSetupDestination;
	for (const field of SLACK_SETUP_EVIDENCE_FIELDS) {
		delete sanitized[field];
		if (sameBotIdentity && storedData?.[field] !== undefined) {
			Object.assign(sanitized, { [field]: storedData[field] });
		}
	}
	return sanitized;
}

async function decryptStoredChannelSetupData(
	data?: string,
): Promise<Record<string, unknown> | undefined> {
	if (!data) return undefined;
	try {
		const decrypted = jsonParse<unknown>(await Container.get(Cipher).decryptV2(data));
		return isRecord(decrypted) ? decrypted : undefined;
	} catch {
		return undefined;
	}
}

export async function stripAgentChannelSetupEvidence(
	credentialType: string,
	data: string,
	storedData?: string,
): Promise<string> {
	if (
		![
			'slackApi',
			'telegramApi',
			'discordBotApi',
			'linearOAuth2Api',
			'microsoftEntraServicePrincipalApi',
			'whatsAppBotApi',
		].includes(credentialType) ||
		!data
	) {
		return data;
	}
	const cipher = Container.get(Cipher);
	const decrypted = jsonParse<unknown>(await cipher.decryptV2(data));
	if (!isRecord(decrypted)) throw new UserError('Credential data must be a JSON object.');
	const decryptedStored = await decryptStoredChannelSetupData(storedData);
	if (
		!decryptedStored &&
		!('agentSetupDestination' in decrypted) &&
		!(
			credentialType === 'slackApi' &&
			SLACK_SETUP_EVIDENCE_FIELDS.some((field) => field in decrypted)
		)
	) {
		return data;
	}
	return await cipher.encryptV2(
		sanitizeAgentChannelSetupData(decrypted, credentialType, decryptedStored),
	);
}
