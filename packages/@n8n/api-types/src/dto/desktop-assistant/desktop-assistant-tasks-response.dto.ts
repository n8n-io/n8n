import type { ExecutionStatus } from 'n8n-workflow';

/**
 * Response shape for `GET /desktop-assistant/tasks`. The controller
 * classifies the user's accessible workflows into three buckets that the
 * desktop assistant UI renders. A workflow appears in at most one bucket;
 * precedence is `actionNeeded > upcoming > readyToRun`.
 */
export interface DesktopAssistantTasksResponse {
	actionNeeded: DesktopAssistantTaskCard[];
	upcoming: DesktopAssistantTaskCard[];
	readyToRun: DesktopAssistantTaskCard[];
}

export interface DesktopAssistantTaskCard {
	workflowId: string;
	name: string;
	/** Bucket-specific description rendered under the workflow name. */
	description: string;
	icon: DesktopAssistantTaskIcon;
	trigger: DesktopAssistantTriggerSummary;
	source: 'desktop-assistant' | 'user-built';
	active: boolean;
	lastExecution?: {
		id: string;
		status: ExecutionStatus;
		startedAt: string;
	};
	/** True when any node uses a local computer-use capability. */
	runsLocally: boolean;
}

export type DesktopAssistantTriggerSummary =
	| { kind: 'manual' }
	| { kind: 'schedule'; nextRunAt: string | null }
	| { kind: 'poll' | 'webhook'; sourceLabel: string }
	| { kind: 'other' };

export type DesktopAssistantTaskIcon =
	| { type: 'emoji'; value: string }
	| { type: 'node'; nodeType: string };
