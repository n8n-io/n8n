/**
 * Thread-persisted agent-builder target binding. Mirrors the workflow source
 * file bindings: one ACTIVE agent target per thread (the most recently created
 * or explicitly targeted agent), plus a session registry of every agent
 * targeted in this conversation keyed by a model-authored ref. Persisting the
 * target in thread metadata lets follow-up turns keep editing the same agent
 * instead of creating a new one — including after a cancelled build.
 */
import { isRecord } from '@n8n/utils/is-record';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import {
	AGENT_PREVIEW_SESSION_METADATA_KEY,
	type AgentPreviewSession,
} from './agent-preview-session-binding';
import { getThread, patchThread } from '../../storage/thread-patch';
import type { InstanceAiContext } from '../../types';
import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';

const METADATA_KEY = 'instanceAiAgentBuilderTarget';
const REGISTRY_METADATA_KEY = 'instanceAiAgentBuilderTargets';
/**
 * Set by the frontend when the user opens a new-agent artifact that has no
 * agent row behind it yet, so the artifact survives a reload before anything
 * is persisted. Cleared here the moment a real agent binds to the thread —
 * whether the chat created it or the user configured it by hand — so a reload
 * doesn't show a phantom blank artifact beside the real one.
 */
export const PENDING_AGENT_METADATA_KEY = 'instanceAiPendingAgentTarget';

const agentBuilderTargetSchema = z.object({
	agentId: z.string(),
	projectId: z.string(),
	/** Agent display name when known — lets the FE label the agent artifact. */
	name: z.string().optional(),
	/**
	 * Model-authored addressing key, and the registry's key. Optional: the
	 * editor/preview handoffs seed a target from an agentId alone, and active
	 * bindings persisted before this field existed carry none.
	 */
	ref: z.string().optional(),
});

export type AgentBuilderTarget = z.infer<typeof agentBuilderTargetSchema>;

const agentBuilderTargetRegistrySchema = z.record(z.string(), agentBuilderTargetSchema);

const pendingAgentTargetSchema = z.object({ projectId: z.string(), agentId: z.string() });

export type PendingAgentTarget = z.infer<typeof pendingAgentTargetSchema>;

/**
 * The id the frontend minted for an unsaved new-agent artifact, so a build
 * creates the agent the user already has open instead of a second one.
 * Best-effort: without a marker (or on a storage failure) the caller falls back
 * to letting the backend mint an id, which is a worse artifact experience but
 * never a failed build.
 */
export async function readPendingAgentTarget(
	context: InstanceAiContext,
): Promise<PendingAgentTarget | undefined> {
	if (!context.threadMemory || !context.threadId) return undefined;

	try {
		const thread = await getThread(context.threadMemory, context.threadId);
		const parsed = pendingAgentTargetSchema.safeParse(
			thread?.metadata?.[PENDING_AGENT_METADATA_KEY],
		);
		return parsed.success ? parsed.data : undefined;
	} catch {
		return undefined;
	}
}

/** Normalize an addressing key so "Support Triage", "support_triage" and
 *  "Support-Triage" all address the same agent. Unicode letters/digits are kept
 *  so a non-Latin agent name still yields a usable key. */
export function normalizeAgentRef(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}

function parseTarget(raw: unknown): AgentBuilderTarget | undefined {
	const parsed = agentBuilderTargetSchema.safeParse(raw);
	return parsed.success ? parsed.data : undefined;
}

function parseRegistry(raw: unknown): Record<string, AgentBuilderTarget> {
	const parsed = agentBuilderTargetRegistrySchema.safeParse(raw);
	return parsed.success ? parsed.data : {};
}

async function readThreadTarget(
	context: InstanceAiContext,
): Promise<AgentBuilderTarget | undefined> {
	if (!context.threadMemory || !context.threadId) return undefined;

	// Let storage failures propagate (AGENT-353): a follow-up turn must edit
	// the thread-persisted target rather than silently falling back to "no
	// target", which would let the caller create a second agent instead of
	// continuing the existing one.
	const thread = await getThread(context.threadMemory, context.threadId);
	return parseTarget(thread?.metadata?.[METADATA_KEY]);
}

/**
 * Resolve the active build target: in-memory context first (current run),
 * then the thread-persisted binding (previous turns). Hydrates the context so
 * subsequent calls in the same run skip the metadata read.
 */
export async function resolveAgentBuilderTarget(
	context: InstanceAiContext,
): Promise<AgentBuilderTarget | undefined> {
	if (context.agentBuilderTarget) return context.agentBuilderTarget;

	const target = await readThreadTarget(context);
	if (target) context.agentBuilderTarget = target;
	return target;
}

/**
 * Same metadata `saveAgentBuilderTarget` writes, as a plain value — for eval
 * thread seeding, which has no `InstanceAiContext` to hand it. Last target wins
 * as the active one, mirroring "most recently targeted".
 */
export function agentBuilderTargetMetadata(targets: AgentBuilderTarget[]): Record<string, unknown> {
	const entries = targets.map((target) =>
		target.ref ? { ...target, ref: normalizeAgentRef(target.ref) } : target,
	);
	const registry: Record<string, AgentBuilderTarget> = {};
	for (const entry of entries) {
		if (!entry.ref) continue;
		// Two refs normalizing to one key ("Support Bot" / "support-bot") would drop
		// an entry, and a later ref lookup would then edit the surviving agent —
		// silently the wrong one. Refuse instead, like a duplicate seed workflow name.
		const clash = registry[entry.ref];
		if (clash && clash.agentId !== entry.agentId) {
			throw new UserError(
				`Seed agents "${clash.name ?? clash.agentId}" and "${entry.name ?? entry.agentId}" both address as "${entry.ref}" — give them names that differ by more than case, spacing or punctuation`,
			);
		}
		registry[entry.ref] = entry;
	}
	return {
		[METADATA_KEY]: entries[entries.length - 1],
		[REGISTRY_METADATA_KEY]: registry,
	};
}

/** Epoch ms of a seed message's `createdAt`, or 0 when it is missing/unparseable. */
function stampOf(message: Record<string, unknown>): number {
	const raw = message.createdAt;
	if (typeof raw !== 'string') return 0;
	const parsed = Date.parse(raw);
	return Number.isNaN(parsed) ? 0 : parsed;
}

/** A seed message's `id`, or '' when absent — the store's tiebreak column. */
function idOf(message: Record<string, unknown>): string {
	return typeof message.id === 'string' ? message.id : '';
}

/**
 * Binding metadata for a seeded thread, reconstructed from the seeded history
 * rather than invented. The model authored the refs its own `build-agent` calls
 * carry, and the LAST such call is what "most recently targeted" meant — array
 * order in the seed is an authoring artifact, not conversation order. An agent
 * the history never targeted keeps its display name as the ref and sorts first,
 * so it can't displace the real active target.
 */
export function seedAgentBuilderTargetMetadata(
	agents: AgentBuilderTarget[],
	seededMessages: Array<Record<string, unknown>>,
): Record<string, unknown> {
	const refById = new Map<string, string>();
	const lastCallIndex = new Map<string, number>();
	let callIndex = 0;
	// `(createdAt, id)` — the exact ordering the store reads messages back in
	// (`typeorm-agent-memory.listMessages`, DESC on both). Scanning the authored
	// array instead can make "most recently targeted" disagree with the history the
	// agent actually sees, and stopping at `createdAt` leaves the same disagreement
	// whenever two seeded turns share a timestamp.
	const chronological = [...seededMessages].sort(
		(a, b) => stampOf(a) - stampOf(b) || idOf(a).localeCompare(idOf(b)),
	);
	for (const message of chronological) {
		if (!Array.isArray(message.content)) continue;
		for (const block of message.content) {
			if (!isRecord(block) || block.type !== 'tool-call') continue;
			if (block.toolName !== ORCHESTRATION_TOOL_IDS.BUILD_AGENT) continue;
			// `targetIdentity` stamps the resolved identity on every build-agent
			// output, so the output is authoritative over the call's own input.
			const output = isRecord(block.output) ? block.output : undefined;
			if (typeof output?.agentId !== 'string') continue;
			if (typeof output.agentRef === 'string') refById.set(output.agentId, output.agentRef);
			lastCallIndex.set(output.agentId, callIndex++);
		}
	}

	const ordered = [...agents].sort(
		(a, b) => (lastCallIndex.get(a.agentId) ?? -1) - (lastCallIndex.get(b.agentId) ?? -1),
	);
	return agentBuilderTargetMetadata(
		ordered.map((agent) => ({ ...agent, ref: refById.get(agent.agentId) ?? agent.ref })),
	);
}

/**
 * The metadata patch that UNDOES `seedAgentBuilderTargetMetadata`, given the
 * thread's metadata from before it was written.
 *
 * `updateThread` MERGES its patch, so handing back the prior snapshot leaves the
 * binding keys standing — the thread would still point at agents a failed restore
 * has since deleted. This names both keys explicitly and restores each to what it
 * was (absent → `undefined`, which the readers' `safeParse` treats as no binding
 * and which drops out of the persisted JSON).
 */
export function clearedAgentBuilderTargetMetadata(
	priorMetadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
	return {
		...(priorMetadata ?? {}),
		[METADATA_KEY]: priorMetadata?.[METADATA_KEY],
		[REGISTRY_METADATA_KEY]: priorMetadata?.[REGISTRY_METADATA_KEY],
	};
}

/**
 * Persist the build target to thread metadata. A no-op (with a warning) when
 * thread persistence is unavailable — unreachable in practice, since every
 * real instance-AI session carries `threadMemory`/`threadId`.
 */
export async function saveAgentBuilderTarget(
	context: InstanceAiContext,
	target: AgentBuilderTarget,
	options?: { previewSession?: AgentPreviewSession },
): Promise<void> {
	if (!context.threadMemory || !context.threadId) {
		context.logger?.warn('Cannot persist agent-builder target: no thread persistence available', {
			agentId: target.agentId,
		});
		return;
	}

	// Let write failures propagate (AGENT-353): swallowing them here would let
	// the build flow report success while the next turn has no binding and
	// creates a new agent instead of editing the one just built.
	await patchThread(context.threadMemory, {
		threadId: context.threadId,
		update: ({ metadata = {} }) => {
			// Omitted from the returned metadata, which `patchThread` writes
			// wholesale — that is what deletes the pending marker.
			const { [PENDING_AGENT_METADATA_KEY]: _pendingAgent, ...carriedMetadata } = metadata;
			const existingRegistry = parseRegistry(metadata[REGISTRY_METADATA_KEY]);
			const previousByAgentId = Object.values(existingRegistry).find(
				(entry) => entry.agentId === target.agentId,
			);
			// An agentId-path / display-name refresh may omit name or ref; keep the
			// values recorded when the agent was first addressed so lookup and the
			// FE artifact label stay correct.
			const entry: AgentBuilderTarget = {
				...target,
				...(target.name === undefined && previousByAgentId?.name !== undefined
					? { name: previousByAgentId.name }
					: {}),
				...(target.ref === undefined && previousByAgentId?.ref !== undefined
					? { ref: previousByAgentId.ref }
					: {}),
			};
			const registry = { ...existingRegistry };
			if (entry.ref) {
				const normalized = normalizeAgentRef(entry.ref);
				// Drop any prior keys that pointed at this agentId so a changed
				// addressing key doesn't leave a stale alias.
				for (const [key, existing] of Object.entries(registry)) {
					if (existing.agentId === entry.agentId) delete registry[key];
				}
				registry[normalized] = { ...entry, ref: normalized };
			}
			return {
				metadata: {
					...carriedMetadata,
					[METADATA_KEY]: entry,
					[REGISTRY_METADATA_KEY]: registry,
					...(options?.previewSession
						? { [AGENT_PREVIEW_SESSION_METADATA_KEY]: options.previewSession }
						: {}),
				},
			};
		},
	});
}

/**
 * Find an agent already targeted in this conversation by its addressing key.
 * Best-effort: returns undefined without thread persistence or on a
 * malformed/empty registry.
 */
export async function getSessionAgentByRef(
	context: InstanceAiContext,
	ref: string,
): Promise<AgentBuilderTarget | undefined> {
	if (!context.threadMemory || !context.threadId) return undefined;

	// Unlike `readThreadTarget`, a malformed/missing registry is not an
	// unusual failure worth propagating — it's normal for a thread with no
	// prior targets. Let a `getThread` rejection propagate though (AGENT-353):
	// silently returning undefined there would cause a duplicate agent.
	const thread = await getThread(context.threadMemory, context.threadId);
	const registry = parseRegistry(thread?.metadata?.[REGISTRY_METADATA_KEY]);
	return registry[normalizeAgentRef(ref)];
}
