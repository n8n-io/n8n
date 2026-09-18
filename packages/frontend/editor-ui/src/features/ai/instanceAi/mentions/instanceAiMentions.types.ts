import type { InstanceAiNodesAttachment, InstanceAiWorkflowAttachment } from '@n8n/api-types';

export type InstanceAiMentionTarget =
	| { kind: 'workflow'; workflowId: string }
	| { kind: 'node'; workflowId: string; nodeId: string }
	| { kind: 'canvas-group'; workflowId: string; groupId: string };

export type InstanceAiMentionOrigin = 'typed' | 'button';

export interface InstanceAiDraftMention {
	key: string;
	target: InstanceAiMentionTarget;
	label: string;
	parentLabel?: string;
	origin: InstanceAiMentionOrigin;
	attachment: InstanceAiWorkflowAttachment | InstanceAiNodesAttachment;
}

export interface InstanceAiMentionNode {
	id: string;
	name: string;
	type: string;
	typeVersion: number;
	disabled?: boolean;
}

export type InstanceAiMentionSource =
	| {
			kind: 'workflow';
			workflowId: string;
			workflowName: string;
	  }
	| {
			kind: 'node';
			workflowId: string;
			workflowName: string;
			node: InstanceAiMentionNode;
	  }
	| {
			kind: 'canvas-group';
			workflowId: string;
			workflowName: string;
			groupId: string;
			groupName: string;
			nodes: InstanceAiMentionNode[];
	  };

export type InstanceAiMentionUnavailableReason =
	| 'selected'
	| 'node-unavailable'
	| 'group-unavailable'
	| 'group-too-large';

export interface InstanceAiMentionCandidate {
	key: string;
	kind: InstanceAiMentionTarget['kind'];
	label: string;
	parentLabel?: string;
	workflowId: string;
	source?: InstanceAiMentionSource;
	node?: InstanceAiMentionNode;
	unavailableReason?: InstanceAiMentionUnavailableReason;
}
