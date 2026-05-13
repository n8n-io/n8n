/**
 * Incremental builder — internal types.
 *
 * Zod schemas live in `@n8n/api-types` (incDraft*, incChecklist*, incScope*,
 * etc.). This file holds non-wire shapes plus a few small re-exports for
 * ergonomic imports.
 */

import type {
	IncChecklist,
	IncChecklistItem,
	IncDraftEdge,
	IncDraftNode,
	IncDraftState,
	IncScopeSpec,
	IncVerifierReport,
	InstanceAiEvent,
} from '@n8n/api-types';

import type { InstanceAiEventBus } from '../event-bus';
import type {
	InstanceAiCredentialService,
	InstanceAiExecutionService,
	InstanceAiNodeService,
	InstanceAiWorkflowService,
} from '../types';

export type {
	IncChecklist,
	IncChecklistItem,
	IncDraftEdge,
	IncDraftNode,
	IncDraftState,
	IncScopeSpec,
	IncVerifierReport,
};

export interface SpecialistResult {
	confidence: 'high' | 'medium' | 'low';
	rationale: string;
	notes?: string;
}

export interface IncrementalBuilderServices {
	workflow: InstanceAiWorkflowService;
	node: InstanceAiNodeService;
	execution?: InstanceAiExecutionService;
	credential?: InstanceAiCredentialService;
}

export interface IncrementalBuilderRunContext {
	threadId: string;
	runId: string;
	agentId: string;
	userId?: string;
	projectId?: string;
	model: string;
	fastModel?: string;
	services: IncrementalBuilderServices;
	eventBus: InstanceAiEventBus;
	checkpointThreadKey: string;
	maxClarifyingRounds?: number;
}

export type EventEmitter = (event: InstanceAiEvent) => void;
