import {
	noopLifecycleEventPublisher,
	type LifecycleEventPublisher,
} from './lifecycle-event-publisher';
import type { LifecycleEventSubscription } from './lifecycle-event-subscription.schema';

/**
 * Hands each execution the publisher its subscription calls for: the host's
 * publisher when the caller subscribed, and a no-op publisher otherwise. A
 * missing or `null` subscription means `none`.
 */
export class LifecycleEventPublisherFactory {
	constructor(private readonly publisher: LifecycleEventPublisher) {}

	create(execution: {
		lifecycleEventSubscription?: LifecycleEventSubscription | null;
	}): LifecycleEventPublisher {
		const kind = execution.lifecycleEventSubscription?.kind ?? 'none';
		return kind === 'none' ? noopLifecycleEventPublisher : this.publisher;
	}
}
