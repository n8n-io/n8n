import type { TimelineEvent } from '@/modules/agents/execution-recorder';

export type { TimelineEvent };

/** What a tool does to the outside world. `acts` is the safe default for an unknown tool. */
export type ToolAction = 'reads' | 'acts';

/**
 * How the action was decided: the node `operation`, words in the tool name, an
 * MCP annotation, or the safe default. Kept so a reader can see a guess.
 */
export type ToolActionBasis = 'operation' | 'name' | 'default';

export interface AgentToolProfile {
	name: string;
	source: 'node' | 'workflow' | 'custom' | 'mcp';
	action: ToolAction;
	basis: ToolActionBasis;
	requireApproval: boolean;
}

/** One reading of what an agent can do, for the trust ladder next to Publish. */
export type AgentStakes = 'no-tools' | 'reads-only' | 'acts-with-approval' | 'acts-on-its-own';

export type AgentCheckKind = 'tool' | 'promise' | 'base';

export interface AgentCheck {
	id: string;
	kind: AgentCheckKind;
	/** A yes/no question. "Yes" always means the agent did the right thing. */
	question: string;
	/** Why the check exists, shown to the user next to the question. */
	reason: string;
	/** When the check applies. Outside it, the verdict is `not_applicable`. */
	appliesWhen?: string;
	source: { field: 'instructions' | 'skills' | 'tools' | 'base'; quote?: string };
}

/**
 * `not_run` is never a pass: the check had nothing to read (for example, no
 * recorded timeline). `not_applicable` means it read the chat and the check did
 * not apply.
 */
export type CheckVerdictStatus = 'pass' | 'fail' | 'not_applicable' | 'unsure' | 'not_run';

export interface CheckMoment {
	turnIndex: number;
	toolCallId?: string;
}

export interface CheckVerdict {
	checkId: string;
	status: CheckVerdictStatus;
	reason: string;
	moment?: CheckMoment;
}

/**
 * One turn of a real chat. `timeline` is the recorded `agent_execution.timeline`
 * when we have it; test chats read from an Assistant trace carry only the text.
 */
export interface ChatTurn {
	userMessage: string;
	reply: string;
	timeline?: TimelineEvent[];
	/** The run ended in an error (`agent_execution.status`). */
	runFailed?: boolean;
}
