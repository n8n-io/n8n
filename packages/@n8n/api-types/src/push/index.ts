import type { BuilderCreditsPushMessage } from './builder-credits';
import type { ChatHubPushMessage } from './chat-hub';
import type { CollaborationPushMessage } from './collaboration';
import type { DebugPushMessage } from './debug';
import type { ExecutionPushMessage } from './execution';
import type { HotReloadPushMessage } from './hot-reload';
import type { InstanceAiPushMessage } from './instance-ai';
import type { PromotionPushMessage } from './promotion';
import type { WebhookPushMessage } from './webhook';
import type { WorkerPushMessage } from './worker';
import type { WorkflowPushMessage } from './workflow';
import type { WorkflowReviewPushMessage } from './workflow-review';

export type PushMessage =
	| ExecutionPushMessage
	| WorkflowPushMessage
	| HotReloadPushMessage
	| WebhookPushMessage
	| WorkerPushMessage
	| CollaborationPushMessage
	| DebugPushMessage
	| BuilderCreditsPushMessage
	| ChatHubPushMessage
	| InstanceAiPushMessage
	| WorkflowReviewPushMessage
	| PromotionPushMessage;

export type PushType = PushMessage['type'];

export type PushPayload<T extends PushType> = Extract<PushMessage, { type: T }>['data'];
