import { randomUUID } from 'node:crypto';

import type { OrchestrationContext } from '../../types';

const SUB_AGENT_RESOURCE_PREFIX = 'instance-ai-subagent';

export function createSubAgentResourceIdPrefix(parentThreadId: string): string {
	return `${SUB_AGENT_RESOURCE_PREFIX}:${parentThreadId}:`;
}

function normalizeSubAgentKind(agentKind: string): string {
	const normalized = agentKind
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return (normalized || 'agent').slice(0, 64);
}

export function createSubAgentResourceId(parentThreadId: string, agentKind: string): string {
	return `${createSubAgentResourceIdPrefix(parentThreadId)}${normalizeSubAgentKind(agentKind)}`;
}

interface CreateSubAgentPersistenceOptions {
	agentKind: string;
	threadId?: string;
	resourceId?: string;
}

export async function createSubAgentPersistence(
	context: OrchestrationContext,
	options: CreateSubAgentPersistenceOptions,
) {
	const threadId = options.threadId ?? randomUUID();
	const resourceId =
		options.resourceId ?? createSubAgentResourceId(context.threadId, options.agentKind);
	const metadata: Record<string, unknown> = {
		instanceAiHidden: true,
		instanceAiThreadKind: 'sub-agent',
		parentThreadId: context.threadId,
		agentKind: normalizeSubAgentKind(options.agentKind),
	};

	await context.memory?.saveThread({
		id: threadId,
		resourceId,
		title: '',
		metadata,
	});

	return {
		threadId,
		resourceId,
	};
}
