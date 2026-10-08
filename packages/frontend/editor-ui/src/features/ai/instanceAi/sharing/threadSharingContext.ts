import { inject, provide, type ComputedRef, type InjectionKey } from 'vue';
import type { SharedCard } from '@n8n/api-types';
import type { CardAccess, ThreadSharingView } from './sharingView';

/** The sharing state of the chat that a conversation shows, for the cards deep inside it. */
export interface ThreadSharingContext {
	view: ComputedRef<ThreadSharingView>;
	/** What the viewer can do with a card. Undefined for the owner, who answers every card. */
	cardAccess: (call: SharedCard | undefined) => CardAccess | undefined;
}

const ThreadSharingKey: InjectionKey<ThreadSharingContext> = Symbol('instanceAiThreadSharing');

export function provideThreadSharingContext(context: ThreadSharingContext): void {
	provide(ThreadSharingKey, context);
}

/** The context of the nearest conversation, or undefined outside one. */
export function useOptionalThreadSharing(): ThreadSharingContext | undefined {
	return inject(ThreadSharingKey, null) ?? undefined;
}
