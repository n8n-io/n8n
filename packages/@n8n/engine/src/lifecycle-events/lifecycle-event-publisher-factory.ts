import type { ExecutionObserver } from '../dependencies';
import type { CallerContext } from '../execution';
import {
	noopLifecycleEventPublisher,
	type LifecycleEventPublisher,
} from './lifecycle-event-publisher';
import type { LifecycleEventSubscription } from './lifecycle-event-subscription.schema';

/**
 * Hands each execution the publisher its subscription calls for: the host's
 * publisher when the caller subscribed, and a no-op publisher otherwise. A
 * missing or `null` subscription means `none`. The observer, when the host
 * gives one, sees every event of every execution.
 */
export class LifecycleEventPublisherFactory {
	constructor(
		private readonly publisher: LifecycleEventPublisher,
		private readonly observer?: ExecutionObserver,
	) {}

	create(execution: {
		lifecycleEventSubscription?: LifecycleEventSubscription | null;
		callerContext?: CallerContext;
	}): LifecycleEventPublisher {
		const kind = execution.lifecycleEventSubscription?.kind ?? 'none';
		const subscribed = kind === 'none' ? noopLifecycleEventPublisher : this.publisher;

		const { observer } = this;
		const { callerContext } = execution;
		if (!observer || !callerContext) return subscribed;

		return {
			publish: (event) => {
				try {
					observer(event, { callerContext });
				} catch {}
				subscribed.publish(event);
			},
			stop: async () => await subscribed.stop(),
		};
	}
}
