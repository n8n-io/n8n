// ---------------------------------------------------------------------------
// What a seeded routing case adds to the orchestrator's turn. An open workflow
// or Agent goes in the same `<thread-context>` block as production. Earlier
// messages go into memory as thread history.
// ---------------------------------------------------------------------------

import { Memory, type AgentDbMessage, type BuiltMemory } from '@n8n/agents';
import { jsonParse } from 'n8n-workflow';
import { nanoid } from 'nanoid';

import type { DiscoveryScenario } from './types';
import { STUB_USER_ID } from '../harness/stub-services';
// Deep relative import, like the node-definition resolver in harness/stub-services.ts:
// the eval must render the exact block production renders. A follow-up PR moves
// these builders into this package.
// @boundaries-ignore eval-only reach-in into packages/cli
import {
	buildThreadArtifactsBlock,
	buildThreadContextBlock,
} from '../../../../cli/src/modules/instance-ai/internal-messages';

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

/** An in-memory thread. Each turn of one conversation goes on in it, so later turns see the earlier ones. */
export interface SeededThread {
	id: string;
	memory: BuiltMemory;
}

/** A new thread that holds the earlier messages. */
export async function createSeededThread(
	messages: NonNullable<DiscoveryScenario['seed']>['messages'] = [],
): Promise<SeededThread> {
	const id = 'discovery-thread-' + nanoid(6);
	const { memory } = new Memory().build();
	await memory.saveThread({ id, resourceId: STUB_USER_ID });
	await memory.saveMessages({
		threadId: id,
		resourceId: STUB_USER_ID,
		// The case schema checked the envelope; the store keeps the rest verbatim.
		messages: messages.map((message) => ({
			...jsonParse<AgentDbMessage>(JSON.stringify(message)),
			createdAt: new Date(message.createdAt),
		})),
	});
	return { id, memory };
}
