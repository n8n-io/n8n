import type { AgentJsonConfig } from '@n8n/api-types';
import { z } from 'zod';

import type { DecisionLogEntry } from '../../workflow-compiler/decision/decision-service';
import type { ClarificationQuestion } from '../../workflow-compiler/requirements/clarification';
import type { RequirementIssue } from '../../workflow-compiler/requirements/types';
import type { AgentGeneratorMetadata, CompiledAgent } from '../compiler/compile';
import { agentIrSchema, type AgentIR } from '../ir/schema';
import {
	agentRequirementsSchema,
	type AgentIntent,
	type AgentRequirements,
} from '../requirements/types';
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

export interface AgentGenerationSession {
	id: string;
	intent: AgentIntent;
	ref: string;
	agentId?: string;
	request: string;
	messages: string[];
	requirements: AgentRequirements;
	status: AgentGeneratorStatus;
	unresolved: RequirementIssue[];
	questions: ClarificationQuestion[];
	ir?: AgentIR;
	compiled?: {
		config: AgentJsonConfig;
		generator: AgentGeneratorMetadata;
		toolNames: Record<string, string>;
	};
	report?: AgentVerificationReport;
	scenarios: AgentScenario[];
	decisions: DecisionLogEntry[];
	timings: Record<string, number>;
	createdAt: string;
	updatedAt: string;
}

export const persistedAgentSessionSchema = z.object({
	id: z.string(),
	intent: z.enum(['create', 'edit']),
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
		while (this.sessions.size > this.maxSessions) {
			const oldest = this.sessions.keys().next().value;
			if (oldest === undefined) break;
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
