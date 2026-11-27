import { hasInjectionContext, inject, provide, type InjectionKey } from 'vue';
import type { ArtifactTab } from './useCanvasPreview';

/**
 * Lets the "+" menu of the composer open a project resource in a preview tab.
 * Only a thread view with a preview panel provides it, so other composers do not show the item.
 */
export interface OpenResourceContext {
	projectId: () => string | undefined;
	/** False until the stored tabs load: a resource opened before then replaces them. */
	isAvailable: () => boolean;
	/** Resources that are open in a tab already. The list leaves them out. */
	excludedTabs: () => ArtifactTab[];
	open: (resource: ArtifactTab) => void;
}

const OpenResourceKey: InjectionKey<OpenResourceContext> = Symbol('InstanceAiOpenResource');

export function provideOpenResource(context: OpenResourceContext): void {
	provide(OpenResourceKey, context);
}

export function injectOpenResource(): OpenResourceContext | null {
	return hasInjectionContext() ? inject(OpenResourceKey, null) : null;
}
