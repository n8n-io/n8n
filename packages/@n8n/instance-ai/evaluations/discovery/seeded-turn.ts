// ---------------------------------------------------------------------------
// What a seeded routing case adds to the orchestrator's turn. An open workflow
// or Agent goes in the same `<thread-context>` block as production. Earlier
// messages, and the first turn of a reply, go into memory as thread history.
// ---------------------------------------------------------------------------

import { Memory, type AgentDbMessage, type BuiltMemory } from '@n8n/agents';
import { jsonParse } from 'n8n-workflow';

import type { DiscoveryScenario } from './types';
import { CaseSeedSchema } from '../harness/schema';
import {
	buildThreadArtifactsBlock,
	buildThreadContextBlock,
} from '../../src/prompts/thread-context';

/** The project the stub instance reports for every Agent. */
export const STUB_PROJECT_ID = 'discovery-project';

/**
 * The text the orchestrator receives: with an open workflow or Agent, the
 * `<thread-context>` hand-off block, a blank line, and the user's message.
 * The case schema already checked that the attachment names a seeded resource.
 */
export function buildTurnMessage({ userMessage, attach, seed }: DiscoveryScenario): string {
	if (!attach) return userMessage;
	const attachment =
		'workflow' in attach
			? {
					type: 'workflow' as const,
					id: attach.workflow,
					name: seed?.workflows.find((workflow) => workflow.id === attach.workflow)?.name,
				}
			: {
					type: 'agent' as const,
					id: attach.agent,
					name: seed?.agents.find((agent) => agent.id === attach.agent)?.config.name,
					projectId: STUB_PROJECT_ID,
				};
	const block = buildThreadContextBlock([buildThreadArtifactsBlock(undefined, [attachment])]);
	return [block, userMessage].filter(Boolean).join('\n\n');
}

/**
 * The user's reply as the next turn. The first turn's message and the
 * Assistant's text become thread history. The reply has no attachment.
 */
export function buildReplyTurn<T extends DiscoveryScenario>(
	scenario: T,
	assistantText: string,
	reply: string,
): T {
	// The schema expands the `{role, text}` shorthand and orders the timestamps.
	const history = CaseSeedSchema.parse({
		mode: 'inline',
		messages: [
			...(scenario.seed?.messages ?? []),
			{ role: 'user', text: buildTurnMessage(scenario) },
			{ role: 'assistant', text: assistantText },
		],
	});
	if (history.mode !== 'inline') throw new Error('A reply turn needs an inline seed');
	const seed = scenario.seed ? { ...scenario.seed, messages: history.messages } : history;
	return { ...scenario, userMessage: reply, attach: undefined, seed };
}

/** An in-memory thread that holds the seeded messages, or none when there are none. */
export async function createSeededMemory(
	threadId: string,
	resourceId: string,
	messages: NonNullable<DiscoveryScenario['seed']>['messages'] = [],
): Promise<BuiltMemory | undefined> {
	if (messages.length === 0) return undefined;
	const { memory } = new Memory().build();
	await memory.saveThread({ id: threadId, resourceId });
	await memory.saveMessages({
		threadId,
		resourceId,
		// The case schema checked the envelope; the store keeps the rest verbatim.
		messages: messages.map((message) => ({
			...jsonParse<AgentDbMessage>(JSON.stringify(message)),
			createdAt: new Date(message.createdAt),
		})),
	});
	return memory;
}
