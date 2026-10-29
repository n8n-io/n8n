import { z } from 'zod';

import type {
	EpisodicMemoryConsolidateFn,
	EpisodicMemoryConsolidateResult,
	EpisodicMemoryConsolidationFact,
	EpisodicMemoryConsolidationNeighbour,
	EpisodicMemoryConsolidatorInput,
	ModelConfig,
} from '../../types';
import { getCatalogModelId } from '../../utils/model';
import { incrementTokenCountFromUsage } from '../loop/execution-counter';
import { createModel } from '../model/model-factory';
import { toTokenUsage } from '../streaming/stream';

export const DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL = 'openai/text-embedding-3-small';
export const DEFAULT_EPISODIC_MEMORY_TOP_K = 5;
export const DEFAULT_EPISODIC_MEMORY_MAX_ENTRIES_PER_RUN = 5;

export const DEFAULT_EPISODIC_MEMORY_RECALL_TOOL_INSTRUCTION =
	'Episodic memory is enabled. Only call recall_memory when the user explicitly asks about prior conversations, earlier decisions, remembered details, previous sessions/work, similar historical situations, exact names, prior artifacts, or complete lists/inventories of what was established before. Use recall_memory to find related prior entries; it does not answer from memory. Write the query with the concrete names, identifiers, and topic words involved (person, company, account, ticket subject), not a generic paraphrase. Treat returned results as prior or historical candidate context, not current-thread truth. The current user message, current thread history, and current observations outrank recall results. Do not call recall_memory for normal current-thread questions, thin current context, missing current information, or as a fallback for missing current context. The runtime limits recall to the memory scope available for this turn. Use returned results when the user asks; do not ask the source author for consent first.';

export const DEFAULT_EPISODIC_MEMORY_CAPTURE_TOOL_INSTRUCTION =
	'Episodic memory capture is enabled. flag_memory is the only way a detail carries over to future conversations; telling the user that something is noted or on file does not save it. Call flag_memory when the user asks you to remember something, and for preferences, decisions, facts, corrections, case resolutions, and requests that a future conversation with this user or about this account would need: account or system identifiers and corrections to them, named contacts and their roles, the root cause and the fix that resolved a case, and requests or decisions that take effect later. Call it once per distinct item, in the same turn you acknowledge it. When unsure whether an item will matter later, flag it. Do not call it for ordinary chatter, unconfirmed inferences, secrets, raw tool output, or assistant proposals the user has not adopted. Set content to a concise durable statement that names the person, company, or account it is about. Set evidence to one short, contiguous exact quote from a user or assistant text message in this conversation that supports the statement. Copy its whitespace and punctuation without changes. Do not wrap it in quotation marks. A successful call only notes the candidate for later processing, so do not claim that a final memory entry was created. The runtime determines the memory scope for this turn. Source authors and outbound message destinations do not change that scope.';

export const DEFAULT_EPISODIC_MEMORY_CONSOLIDATION_PROMPT = `An AI agent is storing new memories. Similar memories are already stored.
For each new memory, decide how it relates to each stored memory listed under it. For each stored memory, first write one short reason, then the relation.

- duplicate: the new memory makes the same claim as the stored one, in other words. Every name, ID, number, date, version, region and value matches, and neither memory states something the other does not. If one memory adds, drops or changes any detail, it is not a duplicate.
- update: both memories describe the same attribute of the same subject (the same person, account, ID, service or setting), and the new memory gives a different value for it. The stored value is now outdated. Related events, causes, consequences or other attributes of the same subject are not updates.
- different: anything else. Facts about another subject, another attribute, a related event, or a detail the stored memory does not cover are different. When unsure, answer different.

When a relation of a new memory is update, write mergedContent: the stored memory rewritten with the new value. Keep every other detail of both memories that is still valid. Never invent details. Keep names, IDs, numbers and other exact identifiers unchanged. When the new memory updates more than one stored memory, write one mergedContent that covers all of them. When no relation is update, set mergedContent to null.

Answer for every new memory and for every stored memory listed under it. Use only the IDs from the input.`;

const EpisodicMemoryConsolidationSchema = z.object({
	facts: z.array(
		z.object({
			candidateId: z.string(),
			relations: z.array(
				z.object({
					entryId: z.string(),
					reason: z.string(),
					relation: z.enum(['duplicate', 'update', 'different']),
				}),
			),
			mergedContent: z.string().nullable(),
		}),
	),
});

export interface CreateEpisodicMemoryConsolidateFnOptions {
	consolidationPrompt?: string;
}

export function buildEpisodicMemoryConsolidatorPrompt(
	input: EpisodicMemoryConsolidatorInput,
): string {
	return [
		`Current timestamp: ${input.now.toISOString()}`,
		...input.facts.map(renderConsolidationFact),
	].join('\n\n');
}

export function createEpisodicMemoryConsolidateFn(
	model: ModelConfig,
	options: CreateEpisodicMemoryConsolidateFnOptions = {},
): EpisodicMemoryConsolidateFn {
	return async (input): Promise<EpisodicMemoryConsolidateResult> => {
		const { generateText, Output } = await import('ai');
		const response = await generateText({
			model: createModel(model, input.modelFetch),
			instructions: options.consolidationPrompt ?? DEFAULT_EPISODIC_MEMORY_CONSOLIDATION_PROMPT,
			prompt: buildEpisodicMemoryConsolidatorPrompt(input),
			output: Output.object({ schema: EpisodicMemoryConsolidationSchema }),
		});
		incrementTokenCountFromUsage(input.executionCounter, response.usage);
		return {
			consolidation: response.output,
			usage: toTokenUsage(response.usage, response.finalStep.providerMetadata),
			// The host prices side calls by this id, so report the model a deployment serves.
			model: getCatalogModelId(model),
		};
	};
}

function renderConsolidationFact(fact: EpisodicMemoryConsolidationFact): string {
	return [
		`New memory [${fact.candidateId}] (stored ${toDay(fact.createdAt)}): ${fact.content}`,
		`  Evidence: ${fact.evidenceText}`,
		'Stored memories:',
		...fact.neighbours.map(renderConsolidationNeighbour),
	].join('\n');
}

function renderConsolidationNeighbour(neighbour: EpisodicMemoryConsolidationNeighbour): string {
	const lines = [
		`- [${neighbour.id}] (stored ${toDay(neighbour.createdAt)}, last seen ${toDay(neighbour.lastSeenAt)}): ${neighbour.content}`,
	];
	if (neighbour.evidenceText) lines.push(`  Evidence: ${neighbour.evidenceText}`);
	return lines.join('\n');
}

function toDay(date: Date): string {
	return date.toISOString().slice(0, 10);
}
