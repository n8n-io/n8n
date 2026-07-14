import { hasInjectionContext, inject, type InjectionKey } from 'vue';

/**
 * Bridge exposing group collapse state to the context menu for enablement of
 * the expand/collapse items. Collapse is per-canvas *view* state (not
 * workflow data), so the hosting canvas provides it instead of a store —
 * this also keeps simultaneous canvases (e.g. embedded previews) isolated.
 * Hosts without a provider leave the items always enabled.
 */
export interface ContextMenuGroupView {
	isGroupCollapsed: (groupId: string) => boolean;
}

export const ContextMenuGroupViewKey: InjectionKey<ContextMenuGroupView> =
	Symbol('contextMenuGroupView');

export function injectContextMenuGroupView(): ContextMenuGroupView | undefined {
	return hasInjectionContext() ? inject(ContextMenuGroupViewKey, undefined) : undefined;
}
