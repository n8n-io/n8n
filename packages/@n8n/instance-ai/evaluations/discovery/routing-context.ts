// ---------------------------------------------------------------------------
// What a routing case's seed and attachment add to the orchestrator's turn.
//
// Production (packages/cli/src/modules/instance-ai/instance-ai.service.ts)
// sends an editor hand-off as a resource attachment and prepends a
// `<thread-context>` block built by `internal-messages.ts`. The runner uses the
// same builders, so the model reads the same block. Seeded prior messages go
// into the agent's memory as thread history, the way a restored thread holds
// them.
// ---------------------------------------------------------------------------

import { Memory, type AgentDbMessage, type BuiltMemory } from '@n8n/agents';
import type { InstanceAiResourceAttachment } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';

import type { RoutingAttachment, RoutingSeed } from './types';
// Deep relative import, like the node-definition resolver in harness/stub-services.ts:
// the eval must render the exact block production renders.
import {
	buildThreadArtifactsBlock,
	buildThreadContextBlock,
} from '../../../../cli/src/modules/instance-ai/internal-messages';

/** The project the stub instance reports for every Agent. */
export const STUB_PROJECT_ID = 'discovery-project';

/**
 * The resource attachment production receives when the user sends a message
 * with this seeded workflow or Agent open. The loader already checked that the
 * attachment names a seeded resource.
 */
export function toResourceAttachment(
	attach: RoutingAttachment,
	seed: RoutingSeed | undefined,
): InstanceAiResourceAttachment {
	if ('workflow' in attach) {
		const workflow = seed?.workflows.find((w) => w.id === attach.workflow);
		if (!workflow) throw new Error(`attach.workflow "${attach.workflow}" is not a seeded workflow`);
		return { type: 'workflow', id: workflow.id, name: workflow.name };
	}
	const agent = seed?.agents.find((a) => a.id === attach.agent);
	if (!agent) throw new Error(`attach.agent "${attach.agent}" is not a seeded Agent`);
	return { type: 'agent', id: agent.id, name: agent.config.name, projectId: STUB_PROJECT_ID };
}

/**
 * The text the orchestrator receives for the turn. With an attachment, it is
 * the `<thread-context>` block with the `<thread-artifacts>` hand-off, a blank
 * line, and the user's message, as production composes it. Without one, it is
 * the user's message unchanged.
 */
export function buildRoutingTurnMessage(
	userMessage: string,
	attachment: InstanceAiResourceAttachment | undefined,
): string {
	if (!attachment) return userMessage;
	const threadContextBlock = buildThreadContextBlock([
		buildThreadArtifactsBlock(undefined, [attachment]),
	]);
	return [threadContextBlock, userMessage].filter(Boolean).join('\n\n');
}

/**
 * An in-memory thread that already holds the seeded messages. The agent loads
 * them as history when it streams with `persistence` for this thread.
 */
export async function createSeededMemory(
	threadId: string,
	resourceId: string,
	messages: RoutingSeed['messages'],
): Promise<BuiltMemory> {
	const { memory } = new Memory().build();
	await memory.saveThread({ id: threadId, resourceId });
	await memory.saveMessages({ threadId, resourceId, messages: toDbMessages(messages) });
	return memory;
}

/**
 * Seed messages are the runtime's own stored shape, validated at load for
 * their envelope only. The store keeps them verbatim, like production's thread
 * restore; only `createdAt` becomes a `Date`.
 */
function toDbMessages(messages: RoutingSeed['messages']): AgentDbMessage[] {
	return messages.map((message) => ({
		...jsonParse<AgentDbMessage>(JSON.stringify(message)),
		id: message.id,
		createdAt: new Date(message.createdAt),
	}));
}
