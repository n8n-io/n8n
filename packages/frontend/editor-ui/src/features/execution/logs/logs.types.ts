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
	/** Member node name, used as selector label */
	label: string;
	/** The member entry to render in the IO panel */
	entry: NodeLogEntry;
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

export interface LogTreeCreationContext {
	parent: LogEntry | undefined;
	ancestorRunIndexes: number[];
	workflow: WorkflowObjectAccessors;
	executionId: string;
	data: IRunExecutionData;
	workflows: Record<string, WorkflowObjectAccessors>;
	subWorkflowData: Record<string, IRunExecutionData>;
	isSubExecution: boolean;
	/** Canvas groups of the current workflow; empty disables group folding (e.g. sub-executions) */
	nodeGroups: IWorkflowGroup[];
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
