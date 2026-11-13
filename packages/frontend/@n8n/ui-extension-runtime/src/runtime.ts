import {
	UI_EXTENSION_ERROR_MESSAGE_MAX_LENGTH,
	UI_EXTENSION_MESSAGE_SOURCE,
	UI_EXTENSION_PROTOCOL_VERSION,
	uiExtensionHostMessageSchema,
	type UiExtensionPageContext,
} from '@n8n/api-types';
import * as Vue from 'vue';
import type { Component, ComputedRef } from 'vue';

/** The `n8n` global of a view. */
export type ViewApi = {
	useContext: () => ComputedRef<UiExtensionPageContext>;
	t: (key: string) => string;
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

/**
 * Connects the frame to the editor. The context and the strings come only from
 * the parent window, and only in a valid `context` message.
 */
export function createViewBridge(target: RuntimeWindow) {
	const context = Vue.shallowRef<UiExtensionPageContext | null>(null);
	const strings = Vue.shallowRef<Record<string, string>>({});
	const contextListeners: Array<() => void> = [];

	function onMessage(event: MessageEvent) {
		if (event.source !== target.parent) return;
		const parsed = uiExtensionHostMessageSchema.safeParse(event.data);
		if (!parsed.success) return;

		const isFirst = context.value === null;
		context.value = parsed.data.context;
		strings.value = parsed.data.strings;
		if (isFirst) for (const listener of contextListeners.splice(0)) listener();
	}

	target.addEventListener('message', onMessage);

	function post(message: FrameMessage) {
		// The frame has an opaque origin and cannot name the origin of the editor.
		// The messages carry no data that the editor did not send.
		target.parent.postMessage(
			{ source: UI_EXTENSION_MESSAGE_SOURCE, version: UI_EXTENSION_PROTOCOL_VERSION, ...message },
			'*',
		);
	}

	const fallbackContext: UiExtensionPageContext = { page: 'other', routeName: null };
	const api: ViewApi = {
		useContext: () => Vue.computed(() => context.value ?? fallbackContext),
		t: (key) => (Object.hasOwn(strings.value, key) ? strings.value[key] : key),
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
		dispose: () => target.removeEventListener('message', onMessage),
	};
}

function isComponentOptions(value: unknown): value is Component {
	return (
		(typeof value === 'object' && value !== null && !Array.isArray(value)) ||
		typeof value === 'function'
	);
}

/**
 * Turns the source of a view into its component. A view is one ES module with
 * no imports, and its default export is the component. The module runs as a
 * function body with the two globals as arguments.
 */
export function evaluateViewSource(source: string, globals: { Vue: typeof Vue; n8n: ViewApi }) {
	if (/^\s*import[\s{*]/m.test(source)) {
		throw new Error('A view cannot use import statements. Use the Vue and n8n globals.');
	}
	const exports = source.match(/\bexport\s+default\b/g) ?? [];
	if (exports.length !== 1) {
		throw new Error('A view must have exactly one "export default".');
	}

	const body = source.replace(/\bexport\s+default\b/, 'return ');
	// The frame sandbox is the boundary. This only gives the module its globals.
	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	const factory = new Function('Vue', 'n8n', `"use strict";\n${body}`) as (
		vue: typeof Vue,
		n8n: ViewApi,
	) => unknown;
	const component = factory(globals.Vue, globals.n8n);

	if (!isComponentOptions(component)) {
		throw new Error('The default export of a view must be a Vue component options object.');
	}
	return component;
}

/**
 * The editor writes the source as a JSON string in `<script type="application/json" id="view-source">`.
 * JSON lets it escape `<`, so no source can close the script element.
 */
export function readViewSource(document: Document): string {
	const text = document.getElementById('view-source')?.textContent ?? '';
	const source: unknown = text ? JSON.parse(text) : '';
	if (typeof source !== 'string') throw new Error('The view source is not a string.');
	return source;
}

/**
 * Starts a view in the frame: it reads the source, waits for the first context,
 * then mounts the view with the design-system components registered.
 */
export function startViewRuntime(
	target: RuntimeWindow & { document: Document },
	components: Record<string, Component>,
) {
	const bridge = createViewBridge(target);
	Object.assign(target, { Vue, n8n: bridge.api });

	bridge.whenContext(() => {
		try {
			const source = readViewSource(target.document);
			const view = evaluateViewSource(source, { Vue, n8n: bridge.api });
			const app = Vue.createApp(view);
			for (const [name, component] of Object.entries(components)) app.component(name, component);
			app.config.errorHandler = (error) => bridge.postError(error);
			const root = target.document.getElementById('app');
			if (!root) throw new Error('The view frame has no #app element.');
			app.mount(root);
		} catch (error) {
			bridge.postError(error);
		}
	});

	bridge.post({ type: 'ready' });
	return bridge;
}
