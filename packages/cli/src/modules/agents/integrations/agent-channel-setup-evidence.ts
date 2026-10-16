import { Container } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { Cipher } from 'n8n-core';
import { jsonParse, UserError } from 'n8n-workflow';

export function sanitizeAgentChannelSetupData<T extends Record<string, unknown>>(
	data: T,
	storedData?: Record<string, unknown>,
): T {
	const sanitized = { ...data, agentSetupDestination: storedData?.agentSetupDestination };
	if (sanitized.agentSetupDestination === undefined) delete sanitized.agentSetupDestination;
	return sanitized;
}

export async function stripAgentChannelSetupEvidence(
	credentialType: string,
	data: string,
): Promise<string> {
	if (credentialType !== 'telegramApi' || !data) return data;
	const cipher = Container.get(Cipher);
	const decrypted = jsonParse<unknown>(await cipher.decryptV2(data));
	if (!isRecord(decrypted)) throw new UserError('Credential data must be a JSON object.');
	if (!('agentSetupDestination' in decrypted)) return data;
	return await cipher.encryptV2(sanitizeAgentChannelSetupData(decrypted));
}
