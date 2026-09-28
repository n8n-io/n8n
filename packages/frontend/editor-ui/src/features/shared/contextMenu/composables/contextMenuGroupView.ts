import { hasInjectionContext, inject, type InjectionKey } from 'vue';

/**
 * Bridge exposing group view state to the context menu: collapse state (for the
 * expand/collapse items) and description-pin state (for show/hide all
 * descriptions). Both are per-canvas *view* state (not workflow data), so the
 * hosting canvas provides them instead of a store — this also keeps
 * simultaneous canvases (e.g. embedded previews) isolated. Hosts without a
 * provider leave the collapse items always enabled and drop the description
 * items (their pin state is unknown).
 */
export interface ContextMenuGroupView {
	isGroupCollapsed: (groupId: string) => boolean;
	isDescriptionVisible: (groupId: string) => boolean;
}

export const ContextMenuGroupViewKey: InjectionKey<ContextMenuGroupView> =
	Symbol('contextMenuGroupView');

export function injectContextMenuGroupView(): ContextMenuGroupView | undefined {
	return hasInjectionContext() ? inject(ContextMenuGroupViewKey, undefined) : undefined;
}
