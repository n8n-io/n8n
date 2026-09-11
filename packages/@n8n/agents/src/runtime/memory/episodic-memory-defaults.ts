import { z } from 'zod';

import type {
	EpisodicMemoryEntrySource,
	EpisodicMemoryReflection,
	EpisodicMemoryReflectorInput,
	EpisodicMemoryReflectFn,
	ModelConfig,
	RetrievedEpisodicMemoryEntry,
} from '../../types';
import { incrementTokenCountFromUsage } from '../loop/execution-counter';
import { createModel } from '../model/model-factory';

export const DEFAULT_EPISODIC_MEMORY_EMBEDDING_MODEL = 'openai/text-embedding-3-small';
export const DEFAULT_EPISODIC_MEMORY_TOP_K = 5;
export const DEFAULT_EPISODIC_MEMORY_MAX_ENTRIES_PER_RUN = 5;

export const DEFAULT_EPISODIC_MEMORY_RECALL_TOOL_INSTRUCTION =
	'Episodic memory is enabled. Only call recall_memory when the user explicitly asks about prior conversations, earlier decisions, remembered details, previous sessions/work, similar historical situations, exact names, prior artifacts, or complete lists/inventories of what was established before. Use recall_memory to find related prior entries; it does not answer from memory. Write the query with the concrete names, identifiers, and topic words involved (person, company, account, ticket subject), not a generic paraphrase. Treat returned results as prior or historical candidate context, not current-thread truth. The current user message, current thread history, and current observations outrank recall results. Do not call recall_memory for normal current-thread questions, thin current context, missing current information, or as a fallback for missing current context.';

export const DEFAULT_EPISODIC_MEMORY_CAPTURE_TOOL_INSTRUCTION =
	'Episodic memory capture is enabled. flag_memory is the only way a detail carries over to future conversations; telling the user that something is noted or on file does not save it. Call flag_memory when the user asks you to remember something, and for preferences, decisions, facts, corrections, case resolutions, and requests that a future conversation with this user or about this account would need: account or system identifiers and corrections to them, named contacts and their roles, the root cause and the fix that resolved a case, and requests or decisions that take effect later. Call it once per distinct item, in the same turn you acknowledge it. When unsure whether an item will matter later, flag it. Do not call it for ordinary chatter, unconfirmed inferences, secrets, raw tool output, or assistant proposals the user has not adopted. Set content to a concise durable statement that names the person, company, or account it is about. Set evidence to one short, contiguous exact quote from a user or assistant text message in this conversation that supports the statement. Copy its whitespace and punctuation without changes. Do not wrap it in quotation marks. A successful call only notes the candidate for later processing, so do not claim that a final memory entry was created.';

export const DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT = `You maintain source-backed episodic memory for cross-session recall.

Return JSON only:
{
  "drop": ["memory_entry_id"],
  "merge": [
    {
      "supersedes": ["memory_entry_id_1", "memory_entry_id_2"],
      "content": "Merged replacement entry in 1-3 sentences"
    }
  ]
}

Drop only obvious noise, unsupported claims, failed-recall diagnostics, or low-value duplicates. Merge only entries about the same case, entity, decision, or open thread when one replacement preserves their useful evidence more clearly. When a newer entry corrects or replaces an older one, drop the older entry; a merge whose content only restates the newer entry is a duplicate. Every merged entry must contain only information supported by the source entries it supersedes. Do not invent content, causation, dates, identifiers, commitments, or outcomes. Preserve exact identifiers and uncertainty. Never merge merely related cases. Never drop durable user decisions, preferences, identities, commitments, or confirmed outcomes unless a newer active entry replaces them. An ID can appear in drop or merge, never both. Use only active entry IDs from the input.

Most batches need no action. Return {"drop": [], "merge": []} when no clear lifecycle change is needed.`;

const EpisodicMemoryReflectionSchema = z.object({
	drop: z.array(z.string()),
	merge: z.array(
		z.object({
			supersedes: z.array(z.string()).min(1),
			content: z.string(),
		}),
	),
});

export interface CreateEpisodicMemoryReflectFnOptions {
	reflectionPrompt?: string;
}

export function buildEpisodicMemoryReflectorPrompt(input: EpisodicMemoryReflectorInput): string {
	return [
		`Current timestamp: ${input.now.toISOString()}`,
		`Scope: resource:${input.scope.resourceId}`,
		`Seed entry IDs: ${input.seedEntryIds.length ? input.seedEntryIds.join(', ') : '(none)'}`,
		`Active episodic entries:\n${renderEntriesWithSources(input.entries, input.sources)}`,
	].join('\n\n');
}

export function createEpisodicMemoryReflectFn(
	model: ModelConfig,
	options: CreateEpisodicMemoryReflectFnOptions = {},
): EpisodicMemoryReflectFn {
	return async (input): Promise<EpisodicMemoryReflection> => {
		const { generateText, Output } = await import('ai');
		const response = await generateText({
			model: createModel(model),
			instructions: options.reflectionPrompt ?? DEFAULT_EPISODIC_MEMORY_REFLECTION_PROMPT,
			prompt: buildEpisodicMemoryReflectorPrompt(input),
			output: Output.object({ schema: EpisodicMemoryReflectionSchema }),
		});
		incrementTokenCountFromUsage(input.executionCounter, response.usage);
		return response.output;
	};
}

function renderEntriesWithSources(
	entries: RetrievedEpisodicMemoryEntry[],
	sources: EpisodicMemoryEntrySource[],
): string {
	if (entries.length === 0) return '(none)';
	const sourcesByEntryId = new Map<string, EpisodicMemoryEntrySource[]>();
	for (const source of sources) {
		const bucket = sourcesByEntryId.get(source.memoryEntryId) ?? [];
		bucket.push(source);
		sourcesByEntryId.set(source.memoryEntryId, bucket);
	}

	return entries
		.map((entry) => {
			const sourceLines = (sourcesByEntryId.get(entry.id) ?? []).map((source) => {
				const origin = source.observationId
					? `observation ${source.observationId}`
					: `candidate ${source.candidateId}`;
				return `  - source ${origin} in thread ${source.threadId}: ${source.evidenceText}`;
			});
			return [
				`[${entry.id}] ${entry.content}`,
				`createdAt: ${entry.createdAt.toISOString()}`,
				`lastSeenAt: ${entry.lastSeenAt.toISOString()}`,
				...sourceLines,
			].join('\n');
		})
		.join('\n\n');
}
