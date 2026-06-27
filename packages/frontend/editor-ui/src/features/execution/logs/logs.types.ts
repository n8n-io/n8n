import type { WorkflowObjectAccessors } from '@/app/types';
import type {
	LOG_DETAILS_PANEL_STATE,
	LOGS_PANEL_STATE,
} from '@/features/execution/logs/logs.constants';
import type { GroupExecutionStatus } from '@/features/workflows/canvas/canvas.types';
import type { INodeUi, LlmTokenUsageData } from '@/Interface';
import type { IRunExecutionData, ITaskData, IWorkflowGroup } from 'n8n-workflow';

export type LogEntry = {
	parent?: LogTreeEntry;
	node: INodeUi;
	id: string;
	children: LogEntry[];
	runIndex: number;
	runData: ITaskData | undefined;
	consumedTokens: LlmTokenUsageData;
	workflow: WorkflowObjectAccessors;
	executionId: string;
	execution: IRunExecutionData;
	isSubExecution: boolean;
};

/**
 * A workflow group surfaced in the logs tree. It wraps the log entries of its
 * member nodes as `children`, mirroring how AI sub-nodes nest under their
 * parent node. A group carries no run data of its own — its input/output is
 * read from its entry/exit member entries, and its status/tokens are rolled
 * up from members.
 */
export interface LogGroupEntry {
	parent?: LogTreeEntry;
	group: IWorkflowGroup;
	id: string;
	children: LogEntry[];
	consumedTokens: LlmTokenUsageData;
	executionStatus: GroupExecutionStatus | undefined;
	/** Number of member nodes that produced run data. */
	executedMemberCount: number;
	/** Entry member (earliest in execution order) — drives the input pane. */
	inputLogEntry: LogEntry;
	/** Exit member (latest in execution order) — drives the output pane. */
	outputLogEntry: LogEntry;
	workflow: WorkflowObjectAccessors;
	executionId: string;
	execution: IRunExecutionData;
	isSubExecution: boolean;
}

export type LogTreeEntry = LogEntry | LogGroupEntry;

export function isLogGroupEntry(entry: LogTreeEntry): entry is LogGroupEntry {
	return 'group' in entry;
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
}

export interface LatestNodeInfo {
	disabled: boolean;
	deleted: boolean;
	name: string;
}

export type LogEntrySelection =
	| { type: 'initial' }
	| { type: 'selected'; entry: LogTreeEntry }
	| { type: 'none' };

export type LogsPanelState = (typeof LOGS_PANEL_STATE)[keyof typeof LOGS_PANEL_STATE];

export type LogDetailsPanelState =
	(typeof LOG_DETAILS_PANEL_STATE)[keyof typeof LOG_DETAILS_PANEL_STATE];

export interface LogTreeFilter {
	rootNodeId: string;
	rootNodeRunIndex: number;
}
