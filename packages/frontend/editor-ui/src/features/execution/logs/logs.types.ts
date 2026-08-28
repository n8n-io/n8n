import type { WorkflowObjectAccessors } from '@/app/types';
import type {
	LOG_DETAILS_PANEL_STATE,
	LOGS_PANEL_STATE,
} from '@/features/execution/logs/logs.constants';
import type { INodeUi, LlmTokenUsageData } from '@/Interface';
import type { IRunExecutionData, ITaskData, IWorkflowGroup } from 'n8n-workflow';

type BaseLogEntry = {
	parent?: LogEntry;
	id: string;
	children: LogEntry[];
	runIndex: number;
	consumedTokens: LlmTokenUsageData;
	workflow: WorkflowObjectAccessors;
	executionId: string;
	execution: IRunExecutionData;
	isSubExecution: boolean;
};

export type NodeLogEntry = BaseLogEntry & {
	type: 'node';
	node: INodeUi;
	runData: ITaskData | undefined;
};

/** One boundary crossing of a group (a member execution where data enters or leaves the group). */
export type GroupBoundaryRunData = {
	id: string;
	/** Selector label (member node name, disambiguated when one node has several crossings) */
	label: string;
	/** The member entry whose run data is rendered in the IO panel */
	entry: NodeLogEntry;
	/** Input only: which entry in the member's runData.source[] this crossing came through */
	sourceIndex?: number;
	/** Output only: which of the member's output branches leaves the group */
	overrideOutputs?: number[];
};

export type GroupLogEntry = BaseLogEntry & {
	type: 'group';
	group: IWorkflowGroup;
	/** Which appearance of this group this is (groups split by branching/loops appear multiple times) */
	segmentIndex: number;
	/** Whether any member execution (including descendants) errored. */
	hasError: boolean;
	boundaries: { inputs: GroupBoundaryRunData[]; outputs: GroupBoundaryRunData[] };
};

export type LogEntry = NodeLogEntry | GroupLogEntry;

export function isNodeLog(entry: LogEntry): entry is NodeLogEntry {
	return entry.type === 'node';
}

export function isGroupLog(entry: LogEntry): entry is GroupLogEntry {
	return entry.type === 'group';
}

export interface LogTreeCreationContext {
	parent: LogEntry | undefined;
	ancestorRunIndexes: number[];
	workflow: WorkflowObjectAccessors;
	executionId: string;
	data: IRunExecutionData;
	workflows: Record<string, WorkflowObjectAccessors>;
	subWorkflowData: Record<string, IRunExecutionData>;
	isSubExecution: boolean;
	/** Canvas groups of the current workflow; empty disables group folding */
	nodeGroups: IWorkflowGroup[];
	/** Canvas groups of loaded sub-workflows, keyed by workflow id, applied when recursing into them */
	subWorkflowNodeGroups: Record<string, IWorkflowGroup[]>;
}

export interface LatestNodeInfo {
	disabled: boolean;
	deleted: boolean;
	name: string;
}

export type LogEntrySelection =
	| { type: 'initial' }
	| { type: 'selected'; entry: LogEntry }
	| { type: 'none' };

export type LogsPanelState = (typeof LOGS_PANEL_STATE)[keyof typeof LOGS_PANEL_STATE];

export type LogDetailsPanelState =
	(typeof LOG_DETAILS_PANEL_STATE)[keyof typeof LOG_DETAILS_PANEL_STATE];

export interface LogTreeFilter {
	rootNodeId: string;
	rootNodeRunIndex: number;
}
