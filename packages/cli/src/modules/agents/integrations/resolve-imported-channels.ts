import {
	isCredentialAgentIntegration,
	isDraftIntegration,
	type AgentIntegrationConfig,
} from '@n8n/api-types';

export type ImportedChannelSetupReason = 'new-channel' | 'destination-draft';

export type ImportedChannel =
	| { type: string; status: 'reused' }
	| { type: string; status: 'setup-required'; reason: ImportedChannelSetupReason };

/**
 * Decide which channels an imported definition keeps. External event routing
 * depends on the instance, project, and Agent, so a source credential never
 * proves destination setup. Only a channel the destination Agent already has is
 * reused; every other channel keeps its settings as a draft that needs setup.
 * Destination channels absent from the source are removed.
 */
export function resolveImportedChannels(
	destination: AgentIntegrationConfig[],
	source: AgentIntegrationConfig[],
): { integrations: AgentIntegrationConfig[]; channels: ImportedChannel[] } {
	// Most channel types allow several connections, so the nth source entry of a
	// type reuses the nth configured destination entry of that type.
	const configured = destination.filter(
		(entry) => isCredentialAgentIntegration(entry) && !isDraftIntegration(entry),
	);
	const integrations: AgentIntegrationConfig[] = [];
	const channels: ImportedChannel[] = [];
	for (const entry of source) {
		if (!isCredentialAgentIntegration(entry)) {
			integrations.push(entry);
			continue;
		}
		const index = configured.findIndex(({ type }) => type === entry.type);
		if (index !== -1) {
			const [existing] = configured.splice(index, 1);
			integrations.push({ ...entry, credentialId: existing.credentialId });
			channels.push({ type: entry.type, status: 'reused' });
			continue;
		}
		integrations.push({ ...entry, credentialId: '' });
		channels.push({
			type: entry.type,
			status: 'setup-required',
			reason: destination.some((draft) => draft.type === entry.type && isDraftIntegration(draft))
				? 'destination-draft'
				: 'new-channel',
		});
	}
	return { integrations, channels };
}
