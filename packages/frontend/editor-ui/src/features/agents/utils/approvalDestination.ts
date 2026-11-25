import type { AgentHitlConfiguration } from '@n8n/api-types';

type ConfigurationFields = 'id' | 'nameOverridden' | 'expirySeconds';
type Destination<T> = T extends AgentHitlConfiguration ? Omit<T, ConfigurationFields> : never;
export type ApprovalDestination = Destination<AgentHitlConfiguration>;

export function approvalName(configuration: AgentHitlConfiguration) {
	if (configuration.method !== 'channel' || configuration.nameOverridden) return configuration.name;
	return configuration.recipient.name ?? configuration.recipient.id;
}
