import { z } from 'zod';

import { Z } from './zod-class';

export type AutomationMapTriggerKind =
	| 'schedule'
	| 'webhook'
	| 'form'
	| 'chat'
	| 'subworkflow'
	| 'error'
	| 'manual'
	| 'app'
	| 'mcp';

export interface AutomationMapTrigger {
	kind: AutomationMapTriggerKind;
	nodeType: string;
	label: string;
}

export interface AutomationMapWorkflow {
	id: string;
	name: string;
	description: string;
	active: boolean;
	archived: boolean;
	missing: boolean;
	folderId: string | null;
	folderPath: string;
	projectId: string | null;
	tags: string[];
	triggers: AutomationMapTrigger[];
	nodeCount: number;
	hasUnresolvedDynamicCall: boolean;
	versionId: string;
	updatedAt: string;
	inScope: boolean;
}

export interface AutomationMapDataTable {
	id: string;
	name: string;
	projectId: string | null;
	missing: boolean;
}

export interface AutomationMapCredential {
	id: string;
	name: string;
	type: string;
}

export interface AutomationMapService {
	key: string;
	name: string;
	nodeType: string | null;
	host: string | null;
	credentials: AutomationMapCredential[];
}

export type AutomationMapEdgeKind =
	| 'calls'
	| 'dispatches'
	| 'references'
	| 'errorHandler'
	| 'reads'
	| 'writes'
	| 'uses';

export interface AutomationMapEdge {
	id: string;
	kind: AutomationMapEdgeKind;
	source: string;
	target: string;
	via: string | null;
	nodeNames: string[];
}

export interface AutomationMapGraph {
	workflows: AutomationMapWorkflow[];
	dataTables: AutomationMapDataTable[];
	services: AutomationMapService[];
	edges: AutomationMapEdge[];
}

export interface AutomationMapGroup {
	id: string;
	name: string;
	description: string;
	workflowIds: string[];
}

export interface AutomationMapStep {
	title: string;
	description: string;
	workflowIds: string[];
}

export interface AutomationMapAnnotations {
	source: 'ai' | 'heuristic';
	summary: string;
	groups: AutomationMapGroup[];
	steps: AutomationMapStep[];
	workflowSummaries: Record<string, string>;
	aiError: string | null;
}

export interface AutomationMapScope {
	keywords: string[];
	folderIds: string[];
	tags: string[];
	workflowIds: string[];
}

export type AutomationMapStatus = 'building' | 'ready' | 'failed';

export interface AutomationMapChange {
	workflowId: string;
	name: string;
	change: 'modified' | 'added' | 'removed';
}

export interface AutomationMapSummary {
	id: string;
	name: string;
	prompt: string;
	saved: boolean;
	autoUpdate: boolean;
	status: AutomationMapStatus;
	builtAt: string | null;
	createdAt: string;
	updatedAt: string;
	counts: { workflows: number; dataTables: number; services: number };
}

export interface AutomationMapDetail extends AutomationMapSummary {
	error: string | null;
	scope: AutomationMapScope;
	graph: AutomationMapGraph | null;
	annotations: AutomationMapAnnotations | null;
	changes: AutomationMapChange[];
}

export class CreateAutomationMapDto extends Z.class({
	prompt: z.string().trim().min(2).max(2000),
}) {}

export class UpdateAutomationMapDto extends Z.class({
	name: z.string().trim().min(1).max(255).optional(),
	saved: z.boolean().optional(),
	autoUpdate: z.boolean().optional(),
}) {}
