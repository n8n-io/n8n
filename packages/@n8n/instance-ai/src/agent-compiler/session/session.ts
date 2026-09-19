import type { AgentJsonConfig } from '@n8n/api-types';
import { z } from 'zod';

import type { DecisionLogEntry } from '../../workflow-compiler/decision/decision-service';
import type { ClarificationQuestion } from '../../workflow-compiler/requirements/clarification';
import type { RequirementIssue } from '../../workflow-compiler/requirements/types';
import type { AgentGeneratorMetadata, CompiledAgent } from '../compiler/compile';
import { agentIrSchema } from '../ir/schema';
import { agentIntentSchema, agentRequirementsSchema } from '../requirements/types';
import type { AgentScenario } from '../scenarios/enumerate';
import type { AgentVerificationReport } from '../validation/validate';

export const agentGeneratorStatusSchema = z.enum([
	'understanding_request',
	'needs_clarification',
	'needs_artifacts',
	'planning',
	'compiling',
	'validating',
	'compiled',
	'compiled_with_unresolved_resources',
	'verifying',
	'verified',
	'failed',
]);
export type AgentGeneratorStatus = z.infer<typeof agentGeneratorStatusSchema>;

/** Persisted fields plus the working state a build keeps in memory. */
export type AgentGenerationSession = PersistedAgentSession & {
	unresolved: RequirementIssue[];
	questions: ClarificationQuestion[];
	compiled?: {
		config: AgentJsonConfig;
		generator: AgentGeneratorMetadata;
		toolNames: Record<string, string>;
	};
	report?: AgentVerificationReport;
	scenarios: AgentScenario[];
	decisions: DecisionLogEntry[];
	timings: Record<string, number>;
};

export const persistedAgentSessionSchema = z.object({
	id: z.string(),
	intent: agentIntentSchema,
	ref: z.string(),
	agentId: z.string().optional(),
	request: z.string(),
	messages: z.array(z.string()),
	requirements: agentRequirementsSchema,
	status: agentGeneratorStatusSchema,
	ir: agentIrSchema.optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type PersistedAgentSession = z.infer<typeof persistedAgentSessionSchema>;

export function toPersistedAgentSession(session: AgentGenerationSession): PersistedAgentSession {
	return {
		id: session.id,
		intent: session.intent,
		ref: session.ref,
		...(session.agentId ? { agentId: session.agentId } : {}),
		request: session.request,
		messages: session.messages,
		requirements: session.requirements,
		status: session.status,
		...(session.ir ? { ir: session.ir } : {}),
		createdAt: session.createdAt,
		updatedAt: session.updatedAt,
	};
}

export function fromPersistedAgentSession(
	persisted: PersistedAgentSession,
): AgentGenerationSession {
	return { ...persisted, unresolved: [], questions: [], scenarios: [], decisions: [], timings: {} };
}

export interface AgentSessionStore {
	get(id: string): Promise<AgentGenerationSession | undefined>;
	save(session: AgentGenerationSession): Promise<void>;
}

export class InMemoryAgentSessionStore implements AgentSessionStore {
	private readonly sessions = new Map<string, AgentGenerationSession>();

	constructor(private readonly maxSessions = 200) {}

	async get(id: string): Promise<AgentGenerationSession | undefined> {
		return this.sessions.get(id);
	}

	async save(session: AgentGenerationSession): Promise<void> {
		this.sessions.delete(session.id);
		this.sessions.set(session.id, session);
		for (const oldest of this.sessions.keys()) {
			if (this.sessions.size <= this.maxSessions) break;
			this.sessions.delete(oldest);
		}
	}
}

/** Reuses `CompiledAgent` fields the session keeps after a build. */
export function compiledSnapshot(
	compiled: CompiledAgent,
): NonNullable<AgentGenerationSession['compiled']> {
	return { config: compiled.config, generator: compiled.generator, toolNames: compiled.toolNames };
}
