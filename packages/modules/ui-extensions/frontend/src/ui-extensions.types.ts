import type {
	UiExtensionFrameMessage,
	UiExtensionPanelData,
	UiExtensionView,
} from '@n8n/api-types';
import type { InjectionKey, Ref, ShallowRef } from 'vue';

/**
 * A tab of the side panel, or a page of the main sidebar. `builtin` marks one
 * that ships with n8n.
 */
export type SidePanelView = UiExtensionView & { builtin: boolean };

/** The view runtime bundle that the shell passes in, as strings. */
export type ViewRuntimeAssets = { js: string; css: string };

/** What a built-in view asks the editor to open: a run, a workflow, or an http(s) URL. */
export type ViewOpenTarget = Extract<UiExtensionFrameMessage, { type: 'open' }>['target'];

/**
 * What the shell gives to the page route. The route component can't get these
 * through props, so the shell provides them with `UI_EXTENSIONS_HOST_KEY`.
 */
export type UiExtensionsHost = {
	/** `null` until the shell loads the runtime. The panel and the pages share one load. */
	runtime: Readonly<ShallowRef<ViewRuntimeAssets | null>>;
	locale: Readonly<Ref<string>>;
	/** Call it in a component setup. It fetches only while `enabled` is true. */
	useOverviewData: (enabled: Readonly<Ref<boolean>>) => {
		data: Readonly<Ref<UiExtensionPanelData>>;
		refresh: () => void;
	};
	open: (target: ViewOpenTarget) => void;
	/** Starts the runtime load. A second call does nothing. */
	loadRuntime: () => void;
};

export const UI_EXTENSIONS_HOST_KEY: InjectionKey<UiExtensionsHost> = Symbol('uiExtensionsHost');
