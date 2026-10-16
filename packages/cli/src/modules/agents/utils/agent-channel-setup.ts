import {
	isCredentialAgentIntegration,
	isDraftIntegration,
	type AgentIntegrationConfig,
	type AgentConfigValidationIssue,
	type CredentialAgentIntegrationConfig,
} from '@n8n/api-types';
import { ConflictError } from '@n8n/errors';
import isEqual from 'lodash/isEqual';
import { randomUUID } from 'node:crypto';

import type { Agent } from '../entities/agent.entity';
import {
	matchesIntegrationRef,
	type IntegrationRef,
	type RequestedAgentIntegration,
} from './agent-channel';

export type AgentChannelState = Pick<Agent, 'integrations'> &
	Partial<Pick<Agent, 'pendingChannelSetup'>>;

export function getDraftIntegrations(agent: AgentChannelState): AgentIntegrationConfig[] {
	return (
		agent.pendingChannelSetup?.requested.map(({ integration }) => integration) ??
		agent.integrations ??
		[]
	);
}

export function isConfiguredIntegration(agent: AgentChannelState, integration: IntegrationRef) {
	return (agent.integrations ?? []).some(
		(entry) => !isDraftIntegration(entry) && matchesIntegrationRef(entry, integration),
	);
}

export function getChannelSetupIssues(
	agent: Partial<Pick<Agent, 'pendingChannelSetup'>>,
): AgentConfigValidationIssue[] {
	return (agent.pendingChannelSetup?.requested ?? []).flatMap(
		({ setupId, integration }, index): AgentConfigValidationIssue[] => {
			if (!setupId) return [];
			return [
				{
					code: 'setup_required',
					path: `integrations.${index}`,
					capability: { kind: 'channel', id: integration.type, index },
				},
			];
		},
	);
}

export function requirePendingChannel(
	agent: AgentChannelState,
	setupId: string,
	type: string,
): RequestedAgentIntegration & { integration: CredentialAgentIntegrationConfig } {
	const pending = agent.pendingChannelSetup?.requested.find((entry) => entry.setupId === setupId);
	if (
		!pending ||
		pending.integration.type !== type ||
		!isCredentialAgentIntegration(pending.integration)
	) {
		throw new ConflictError('Channel setup changed. Reload the Agent and try again.');
	}
	return { ...pending, integration: pending.integration };
}

export function assertChannelSetupReference(
	agent: AgentChannelState,
	integration: IntegrationRef,
	setupId?: string,
): void {
	if (setupId) {
		requirePendingChannel(agent, setupId, integration.type);
		return;
	}
	if (
		agent.pendingChannelSetup?.requested.some(
			(entry) => entry.setupId && matchesIntegrationRef(entry.integration, integration),
		)
	) {
		throw new ConflictError('Open the pending channel setup before connecting this credential.');
	}
}

export function prepareChannelSetup(
	agent: AgentChannelState,
	integrations: AgentIntegrationConfig[],
	options: {
		replaces?: IntegrationRef;
		requested?: IntegrationRef;
		unverified?: IntegrationRef[];
	} = {},
): Required<AgentChannelState> {
	const reusedSetupIds = new Set<string>();
	const requested = integrations.map((integration): RequestedAgentIntegration => {
		const unverified = options.unverified?.some((entry) =>
			matchesIntegrationRef(entry, integration),
		);
		if (
			!isCredentialAgentIntegration(integration) ||
			(isConfiguredIntegration(agent, integration) && !unverified)
		) {
			return { integration };
		}
		const previous = agent.pendingChannelSetup?.requested.find(
			(entry) =>
				entry.setupId &&
				!reusedSetupIds.has(entry.setupId) &&
				isEqual(entry.integration, integration),
		);
		if (previous?.setupId) reusedSetupIds.add(previous.setupId);
		const replaces =
			options.requested && matchesIntegrationRef(integration, options.requested)
				? options.replaces
				: previous?.replaces;
		const setupId =
			previous?.setupId && isEqual(previous.replaces, replaces) ? previous.setupId : randomUUID();
		return { integration, setupId, ...(replaces ? { replaces } : {}) };
	});
	return projectChannelSetup(agent, requested);
}

export function projectChannelSetup(
	agent: AgentChannelState,
	requested: RequestedAgentIntegration[],
): Required<AgentChannelState> {
	if (!requested.some(({ setupId }) => setupId)) {
		return {
			integrations: requested.map(({ integration }) => integration),
			pendingChannelSetup: null,
		};
	}
	const configured = requested
		.filter(({ setupId }) => !setupId)
		.map(({ integration }) => integration);
	// An incomplete replacement must not disconnect an existing destination channel.
	for (const previous of agent.integrations ?? []) {
		if (!isCredentialAgentIntegration(previous) || isDraftIntegration(previous)) continue;
		if (!configured.some((entry) => matchesIntegrationRef(entry, previous)))
			configured.push(previous);
	}
	return { integrations: configured, pendingChannelSetup: { requested } };
}

export function completeChannelSetup(
	agent: AgentChannelState,
	setupId: string,
	integration: AgentIntegrationConfig,
	replaces?: IntegrationRef,
): Required<AgentChannelState> {
	requirePendingChannel(agent, setupId, integration.type);
	const requested = (agent.pendingChannelSetup?.requested ?? []).flatMap((entry) => {
		if (entry.setupId === setupId) return [{ integration }];
		if (replaces && matchesIntegrationRef(entry.integration, replaces)) return [];
		return [entry];
	});
	const configured = (agent.integrations ?? []).filter(
		(entry) => !replaces || !matchesIntegrationRef(entry, replaces),
	);
	return projectChannelSetup({ integrations: configured }, requested);
}

export function cancelChannelSetup(
	agent: AgentChannelState,
	setupId: string,
	type: string,
): Required<AgentChannelState> {
	requirePendingChannel(agent, setupId, type);
	const requested = (agent.pendingChannelSetup?.requested ?? []).filter(
		(entry) => entry.setupId !== setupId,
	);
	// Cancellation keeps the destination connections, including a proposed replacement.
	for (const integration of agent.integrations ?? []) {
		if (!requested.some((entry) => matchesIntegrationRef(entry.integration, integration))) {
			requested.push({ integration });
		}
	}
	return projectChannelSetup(agent, requested);
}
