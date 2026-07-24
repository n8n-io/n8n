import type { PushMessage, PushType } from '@n8n/api-types';
import type { Router } from 'vue-router';

/**
 * Context handed to a module push handler when it runs. The shell may pass a
 * richer context (it extends this); handlers only see the stable surface.
 */
export interface ModulePushHandlerContext {
	router: Router;
}

/**
 * Handler for a single push message type. Contravariant in its context so the
 * shell can supply a superset context at call time.
 */
export type ModulePushHandler<Ctx extends ModulePushHandlerContext = ModulePushHandlerContext> = (
	event: PushMessage,
	context: Ctx,
) => void | Promise<void>;

/**
 * A module's push-message contributions, keyed by message type. Each handler
 * receives the event already narrowed to its type.
 */
export type ModulePushHandlers = {
	[T in PushType]?: (
		event: Extract<PushMessage, { type: T }>,
		context: ModulePushHandlerContext,
	) => void | Promise<void>;
};
