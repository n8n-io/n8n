import { hasInjectionContext, inject, type InjectionKey } from 'vue';

/**
 * Bridge exposing group view state to the context menu: collapse state, for
 * the expand/collapse items. It is per-canvas *view* state (not workflow
 * data), so the hosting canvas provides it instead of a store — this also
 * keeps simultaneous canvases (e.g. embedded previews) isolated. Hosts without
 * a provider leave the collapse items always enabled.
 */
export interface ContextMenuGroupView {
	isGroupCollapsed: (groupId: string) => boolean;
}

export const ContextMenuGroupViewKey: InjectionKey<ContextMenuGroupView> =
	Symbol('contextMenuGroupView');

export function injectContextMenuGroupView(): ContextMenuGroupView | undefined {
	return hasInjectionContext() ? inject(ContextMenuGroupViewKey, undefined) : undefined;
}
