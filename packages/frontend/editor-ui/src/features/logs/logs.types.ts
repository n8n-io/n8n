import type { LOG_DETAILS_PANEL_STATE, LOGS_PANEL_STATE } from '@/features/logs/logs.constants';
import type { INodeUi, LlmTokenUsageData } from '@/Interface';
import type { IRunExecutionData, ITaskData, Workflow } from 'n8n-workflow';

export interface LogEntry {
	parent?: LogEntry;
	node: INodeUi;
	id: string;
	children: LogEntry[];
	depth: number;
	runIndex: number;
	runData: ITaskData;
	consumedTokens: LlmTokenUsageData;
	workflow: Workflow;
	executionId: string;
	execution: IRunExecutionData;
}

export interface LogTreeCreationContext {
	parent: LogEntry | undefined;
	depth: number;
	workflow: Workflow;
	executionId: string;
	data: IRunExecutionData;
	workflows: Record<string, Workflow>;
	subWorkflowData: Record<string, IRunExecutionData>;
}

export interface LatestNodeInfo {
	disabled: boolean;
	deleted: boolean;
	name: string;
}

export type LogEntrySelection =
	| { type: 'initial' }
	| { type: 'selected'; id: string }
	| { type: 'none' };

export type LogsPanelState = (typeof LOGS_PANEL_STATE)[keyof typeof LOGS_PANEL_STATE];

export type LogDetailsPanelState =
	(typeof LOG_DETAILS_PANEL_STATE)[keyof typeof LOG_DETAILS_PANEL_STATE];
