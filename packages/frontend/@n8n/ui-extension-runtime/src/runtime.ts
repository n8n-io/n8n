import {
	UI_EXTENSION_ERROR_MESSAGE_MAX_LENGTH,
	UI_EXTENSION_MESSAGE_SOURCE,
	UI_EXTENSION_PROTOCOL_VERSION,
	UI_EXTENSION_VIEW_FACTORY_GLOBAL,
	uiExtensionConnectMessageSchema,
	uiExtensionHostMessageSchema,
	type UiExtensionPageContext,
} from '@n8n/api-types';
import * as Vue from 'vue';
import type { Component, ComputedRef } from 'vue';

/** Values for the `{name}` placeholders of a translated string. */
export type TranslationParams = Record<string, string | number>;

/** The `n8n` global of a view. */
export type ViewApi = {
	useContext: () => ComputedRef<UiExtensionPageContext>;
	t: (key: string, params?: TranslationParams) => string;
};

/** The part of the frame window that the runtime uses. */
export type RuntimeWindow = Pick<Window, 'addEventListener' | 'removeEventListener'> & {
	parent: Pick<Window, 'postMessage'>;
};

type FrameMessage = { type: 'ready' } | { type: 'error'; message: string };

export function errorMessage(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	return message.slice(0, UI_EXTENSION_ERROR_MESSAGE_MAX_LENGTH);
}

/** Replaces each `{name}` in `text` with its value. Unknown names stay as they are. */
export function interpolate(text: string, params: TranslationParams = {}): string {
	return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
		Object.hasOwn(params, name) ? String(params[name]) : placeholder,
	);
}

/**
 * Connects the frame to the editor. The frame posts `ready` to its parent once.
 * The parent answers with a `connect` message that holds a port, and the context
 * then comes only over that port.
 */
export function createViewBridge(target: RuntimeWindow) {
	const context = Vue.shallowRef<UiExtensionPageContext | null>(null);
	const strings = Vue.shallowRef<Record<string, string>>({});
	const contextListeners: Array<() => void> = [];
	let port: MessagePort | null = null;

	function envelope(message: FrameMessage) {
		return {
			source: UI_EXTENSION_MESSAGE_SOURCE,
			version: UI_EXTENSION_PROTOCOL_VERSION,
			...message,
		};
	}

	function onPortMessage(event: MessageEvent) {
		const parsed = uiExtensionHostMessageSchema.safeParse(event.data);
		if (!parsed.success) return;

		const isFirst = context.value === null;
		context.value = parsed.data.context;
		strings.value = parsed.data.strings;
		if (isFirst) for (const listener of contextListeners.splice(0)) listener();
	}

	function onWindowMessage(event: MessageEvent) {
		if (port || event.source !== target.parent) return;
		if (!uiExtensionConnectMessageSchema.safeParse(event.data).success) return;
		const [connectPort] = event.ports;
		if (!connectPort) return;

		port = connectPort;
		port.onmessage = onPortMessage;
		target.removeEventListener('message', onWindowMessage);
	}

	target.addEventListener('message', onWindowMessage);

	function post(message: FrameMessage) {
		if (port) {
			port.postMessage(envelope(message));
			return;
		}
		// Before the port exists. The frame has an opaque origin and cannot name the
		// origin of the editor. The messages carry no data that the editor sent.
		target.parent.postMessage(envelope(message), '*');
	}

	const fallbackContext: UiExtensionPageContext = { page: 'other', routeName: null };
	const api: ViewApi = {
		useContext: () => Vue.computed(() => context.value ?? fallbackContext),
		t: (key, params) =>
			Object.hasOwn(strings.value, key) ? interpolate(strings.value[key], params) : key,
	};

	return {
		api,
		post,
		postError: (error: unknown) => post({ type: 'error', message: errorMessage(error) }),
		/** Runs `listener` once the editor has sent the first context. */
		whenContext(listener: () => void) {
			if (context.value !== null) listener();
			else contextListeners.push(listener);
		},
		dispose: () => {
			target.removeEventListener('message', onWindowMessage);
			port?.close();
		},
	};
}

function isComponentOptions(value: unknown): value is Component {
	return (
		(typeof value === 'object' && value !== null && !Array.isArray(value)) ||
		typeof value === 'function'
	);
}

/**
 * Builds the component of the view. The view script of the frame sets
 * {@link UI_EXTENSION_VIEW_FACTORY_GLOBAL} to a factory that takes the two globals.
 */
export function createViewComponent(
	factory: unknown,
	globals: { Vue: typeof Vue; n8n: ViewApi },
	loadError?: string,
): Component {
	if (typeof factory !== 'function') {
		throw new Error(loadError ? `The view did not load: ${loadError}` : 'The view did not load.');
	}

	const component: unknown = Reflect.apply(factory, undefined, [globals.Vue, globals.n8n]);
	if (!isComponentOptions(component)) {
		throw new Error('The default export of a view must be a Vue component options object.');
	}
	return component;
}

/**
 * Starts a view in the frame. It waits for the first context and for the view
 * script, then mounts the view with the design-system components registered.
 */
export function startViewRuntime(
	target: RuntimeWindow & { document: Document },
	components: Record<string, Component>,
) {
	const bridge = createViewBridge(target);
	Object.assign(target, { Vue, n8n: bridge.api });

	// The view script runs after this one. A syntax error in it shows here.
	let loadError: string | undefined;
	const onError = (event: Event) => {
		loadError ??= event instanceof ErrorEvent && event.message ? event.message : undefined;
	};
	target.addEventListener('error', onError);

	const whenDocumentLoaded = (listener: () => void) => {
		if (target.document.readyState === 'loading') {
			target.document.addEventListener('DOMContentLoaded', listener, { once: true });
		} else listener();
	};

	function mount() {
		target.removeEventListener('error', onError);
		try {
			const factory: unknown = Reflect.get(target, UI_EXTENSION_VIEW_FACTORY_GLOBAL);
			const view = createViewComponent(factory, { Vue, n8n: bridge.api }, loadError);
			const app = Vue.createApp(view);
			for (const [name, component] of Object.entries(components)) app.component(name, component);
			app.config.errorHandler = (error) => bridge.postError(error);
			const root = target.document.getElementById('app');
			if (!root) throw new Error('The view frame has no #app element.');
			app.mount(root);
		} catch (error) {
			bridge.postError(error);
		}
	}

	bridge.whenContext(() => whenDocumentLoaded(mount));
	bridge.post({ type: 'ready' });
	return bridge;
}
