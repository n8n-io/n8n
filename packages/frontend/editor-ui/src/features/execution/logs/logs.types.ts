import type { WorkflowObjectAccessors } from '@/app/types';
import type {
	LOG_DETAILS_PANEL_STATE,
	LOGS_PANEL_STATE,
} from '@/features/execution/logs/logs.constants';
import type { INodeUi, LlmTokenUsageData } from '@/Interface';
import type { IRunExecutionData, ITaskData } from 'n8n-workflow';

export type LogEntry = {
	parent?: LogEntry;
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
	| { type: 'selected'; entry: LogEntry }
	| { type: 'none' };

export type LogsPanelState = (typeof LOGS_PANEL_STATE)[keyof typeof LOGS_PANEL_STATE];

export type LogDetailsPanelState =
	(typeof LOG_DETAILS_PANEL_STATE)[keyof typeof LOG_DETAILS_PANEL_STATE];

export interface LogTreeFilter {
	rootNodeId: string;
	rootNodeRunIndex: number;
}
