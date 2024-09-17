import type { ExecutionPushMessage } from './execution';
import type { WorkflowPushMessage } from './workflow';
import type { HotReloadPushMessage } from './hot-reload';
import type { WorkerPushMessage } from './worker';
import type { WebhookPushMessage } from './webhook';
import type { CollaborationPushMessage } from './collaboration';
import type { DebugPushMessage } from './debug';

export type PushMessage =
	| ExecutionPushMessage
	| WorkflowPushMessage
	| HotReloadPushMessage
	| WebhookPushMessage
	| WorkerPushMessage
	| CollaborationPushMessage
	| DebugPushMessage;

export type PushType = PushMessage['type'];

export type PushPayload<T extends PushType> = Extract<PushMessage, { type: T }>['data'];
