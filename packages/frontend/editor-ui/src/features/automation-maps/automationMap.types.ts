import type {
	AutomationMapChange,
	AutomationMapDataTable,
	AutomationMapService,
	AutomationMapWorkflow,
} from '@n8n/api-types';

import type { LaidOutGroup } from './automationMap.layout';

export type MapFocusState = 'normal' | 'focused' | 'related' | 'dimmed';

export interface MapWorkflowNodeData {
	workflow: AutomationMapWorkflow;
	summary: string;
	isEntryPoint: boolean;
	serviceNodeTypes: string[];
	dataTableCount: number;
	change: AutomationMapChange['change'] | null;
	focus: MapFocusState;
	matchesSearch: boolean;
}

export interface MapDataTableNodeData {
	dataTable: AutomationMapDataTable;
	readers: number;
	writers: number;
	focus: MapFocusState;
	matchesSearch: boolean;
}

export interface MapServiceNodeData {
	service: AutomationMapService;
	usedBy: number;
	focus: MapFocusState;
	matchesSearch: boolean;
}

export interface MapGroupNodeData {
	group: LaidOutGroup;
	focus: MapFocusState;
}

export type MapSelection =
	| { kind: 'workflow'; id: string }
	| { kind: 'dataTable'; id: string }
	| { kind: 'service'; id: string };
