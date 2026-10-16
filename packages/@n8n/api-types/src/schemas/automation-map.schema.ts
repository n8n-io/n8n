import { z } from 'zod';

export const AUTOMATION_MAP_GROUP_COLORS = [1, 2, 3, 4, 5, 6, 7] as const;

export const automationMapScopeSchema = z.object({
	projectId: z.string().min(1).optional(),
	folderIds: z.array(z.string().min(1)).max(50).optional(),
	workflowIds: z.array(z.string().min(1)).max(500).optional(),
	tags: z.array(z.string().min(1)).max(20).optional(),
	nameQuery: z.string().trim().min(1).max(128).optional(),
	includeCalledWorkflows: z.boolean().optional(),
	includeCallers: z.boolean().optional(),
});
export type AutomationMapScope = z.infer<typeof automationMapScopeSchema>;

export const automationMapGroupSchema = z.object({
	id: z.string().min(1).max(64),
	name: z.string().trim().min(1).max(80),
	description: z.string().trim().max(400).optional(),
	color: z.number().int().min(1).max(7).optional(),
	workflowIds: z.array(z.string().min(1)).max(500),
});
export type AutomationMapGroup = z.infer<typeof automationMapGroupSchema>;

export const automationMapStepSchema = z.object({
	title: z.string().trim().min(1).max(120),
	description: z.string().trim().max(800),
	workflowIds: z.array(z.string().min(1)).max(50),
});
export type AutomationMapStep = z.infer<typeof automationMapStepSchema>;

export const automationMapInferredEdgeSchema = z.object({
	source: z.string().min(1),
	target: z.string().min(1),
	label: z.string().trim().max(120).optional(),
});
export type AutomationMapInferredEdge = z.infer<typeof automationMapInferredEdgeSchema>;

export const automationMapAnnotationsSchema = z.object({
	summary: z.string().trim().max(4000).optional(),
	groups: z.array(automationMapGroupSchema).max(30).optional(),
	steps: z.array(automationMapStepSchema).max(20).optional(),
	notes: z.record(z.string(), z.string().trim().max(600)).optional(),
	inferredEdges: z.array(automationMapInferredEdgeSchema).max(300).optional(),
});
export type AutomationMapAnnotations = z.infer<typeof automationMapAnnotationsSchema>;

export type AutomationMapIconSource =
	| { type: 'file'; src: string; srcDark?: string }
	| { type: 'icon'; name: string; color?: string };

export type AutomationMapTriggerKind =
	| 'schedule'
	| 'webhook'
	| 'form'
	| 'chat'
	| 'subworkflow'
	| 'manual'
	| 'error'
	| 'mcp'
	| 'evaluation'
	| 'app';

export interface AutomationMapTrigger {
	kind: AutomationMapTriggerKind;
	nodeName: string;
	nodeType: string;
	label: string;
	serviceId?: string;
}

export type AutomationMapWorkflowRole = 'member' | 'dependency' | 'caller';

export interface AutomationMapDynamicCall {
	nodeName: string;
	expression: string;
	resolvedVia?: string;
}

export interface AutomationMapWorkflowNode {
	id: string;
	name: string;
	description: string | null;
	active: boolean;
	isArchived: boolean;
	accessible: boolean;
	role: AutomationMapWorkflowRole;
	projectId: string | null;
	folderId: string | null;
	folderPath: string[];
	tags: string[];
	nodeCount: number;
	triggers: AutomationMapTrigger[];
	serviceIds: string[];
	dynamicCalls: AutomationMapDynamicCall[];
	updatedAt: string | null;
	versionId: string | null;
}

export interface AutomationMapDataTableNode {
	id: string;
	name: string;
	projectId: string | null;
	accessible: boolean;
	columnNames: string[];
	referencedWorkflowIds: string[];
}

export interface AutomationMapCredentialNode {
	id: string;
	name: string;
	type: string;
	typeDisplayName: string;
	accessible: boolean;
	icon: AutomationMapIconSource | null;
}

export interface AutomationMapServiceNode {
	id: string;
	name: string;
	icon: AutomationMapIconSource | null;
	hosts: string[];
}

export type AutomationMapEdgeKind =
	| 'calls'
	| 'callsDynamic'
	| 'callsInferred'
	| 'errorHandler'
	| 'webhookCall'
	| 'reads'
	| 'writes'
	| 'usesCredential'
	| 'usesService';

export interface AutomationMapEdge {
	id: string;
	kind: AutomationMapEdgeKind;
	source: string;
	target: string;
	label?: string;
	nodeNames: string[];
}

export interface AutomationMapGraph {
	workflows: AutomationMapWorkflowNode[];
	dataTables: AutomationMapDataTableNode[];
	credentials: AutomationMapCredentialNode[];
	services: AutomationMapServiceNode[];
	edges: AutomationMapEdge[];
}

export interface AutomationMapChanges {
	isStale: boolean;
	changedWorkflowIds: string[];
	addedWorkflowIds: string[];
	removedWorkflowIds: string[];
}

export interface AutomationMapSummary {
	id: string;
	name: string;
	projectId: string;
	summary: string | null;
	workflowCount: number;
	dataTableCount: number;
	credentialCount: number;
	serviceCount: number;
	refreshedAt: string;
	annotatedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface AutomationMapDetail extends AutomationMapSummary {
	scope: AutomationMapScope;
	graph: AutomationMapGraph;
	annotations: AutomationMapAnnotations;
	changes: AutomationMapChanges;
}

export const automationMapNodeRef = {
	workflow: (id: string) => `workflow:${id}`,
	dataTable: (id: string) => `dataTable:${id}`,
	credential: (id: string) => `credential:${id}`,
	service: (id: string) => `service:${id}`,
} as const;
