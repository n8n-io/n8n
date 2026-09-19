import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { z } from 'zod';

import type { DecisionLogEntry } from '../decision/decision-service';
import type { GeneratorMetadata } from '../compiler/compile';
import { workflowIrSchema, type WorkflowIR } from '../ir/schema';
import {
	requirementsSchema,
	type Intent,
	type RequirementIssue,
	type Requirements,
} from '../requirements/types';
import type { VerificationReport } from '../validation/report';
import type { ClarificationQuestion } from '../requirements/clarification';

export const generatorStatusSchema = z.enum([
	'understanding_request',
	'needs_clarification',
	'planning',
	'binding_parameters',
	'compiling',
	'validating',
	'repairing',
	'compiled',
	'compiled_with_unresolved_resources',
	'testing',
	'ready_to_publish',
	'published',
	'failed',
]);
export type GeneratorStatus = z.infer<typeof generatorStatusSchema>;

export interface GenerationSession {
	id: string;
	intent: Intent;
	request: string;
	/** Every user message in the session, newest last. */
	messages: string[];
	requirements: Requirements;
	status: GeneratorStatus;
	unresolved: RequirementIssue[];
	questions: ClarificationQuestion[];
	/** Existing workflow for edit and debug sessions. */
	workflowId?: string;
	ir?: WorkflowIR;
	compiled?: {
		workflow: WorkflowJSON;
		stepNodeNames: Record<string, string>;
		generator: GeneratorMetadata;
	};
	report?: VerificationReport;
	decisions: DecisionLogEntry[];
	timings: Record<string, number>;
	planningPath: 'fast' | 'synthesis' | 'patch' | 'debug';
	createdAt: string;
	updatedAt: string;
}

/** Compact persisted form: enough to resume clarification, without artifacts. */
export const persistedSessionSchema = z.object({
	id: z.string(),
	intent: z.enum(['create', 'edit', 'debug']),
	request: z.string(),
	messages: z.array(z.string()),
	requirements: requirementsSchema,
	status: generatorStatusSchema,
	workflowId: z.string().optional(),
	ir: workflowIrSchema.optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type PersistedSession = z.infer<typeof persistedSessionSchema>;

export function toPersisted(session: GenerationSession): PersistedSession {
	return {
		id: session.id,
		intent: session.intent,
		request: session.request,
		messages: session.messages,
		requirements: session.requirements,
		status: session.status,
		...(session.workflowId ? { workflowId: session.workflowId } : {}),
		...(session.ir ? { ir: session.ir } : {}),
		createdAt: session.createdAt,
		updatedAt: session.updatedAt,
	};
}

export function fromPersisted(persisted: PersistedSession): GenerationSession {
	return {
		...persisted,
		unresolved: [],
		questions: [],
		decisions: [],
		timings: {},
		planningPath:
			persisted.intent === 'edit' ? 'patch' : persisted.intent === 'debug' ? 'debug' : 'fast',
	};
}

export interface SessionStore {
	get(id: string): Promise<GenerationSession | undefined>;
	save(session: GenerationSession): Promise<void>;
}

/** Process-local store with a bounded size; the default when no host store is wired. */
export class InMemorySessionStore implements SessionStore {
	private readonly sessions = new Map<string, GenerationSession>();

	constructor(private readonly maxSessions = 200) {}

	async get(id: string): Promise<GenerationSession | undefined> {
		return this.sessions.get(id);
	}

	async save(session: GenerationSession): Promise<void> {
		this.sessions.delete(session.id);
		this.sessions.set(session.id, session);
		while (this.sessions.size > this.maxSessions) {
			const oldest = this.sessions.keys().next().value;
			if (oldest === undefined) break;
			this.sessions.delete(oldest);
		}
	}
}
