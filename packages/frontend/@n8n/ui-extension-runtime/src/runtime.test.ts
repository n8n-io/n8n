import { UI_EXTENSION_VIEW_FACTORY_GLOBAL, type UiExtensionPageContext } from '@n8n/api-types';
import { nextTick } from 'vue';
import * as Vue from 'vue';

import {
	createViewBridge,
	createViewComponent,
	startViewRuntime,
	type RuntimeWindow,
	type ViewApi,
} from './runtime';

const workflowContext: UiExtensionPageContext = {
	page: 'workflow',
	routeName: 'NodeViewExisting',
	workflow: { id: 'wf-1', name: 'Payroll', active: false, nodes: [] },
};

const contextMessage = (overrides: Record<string, unknown> = {}) => ({
	source: 'n8n-ui-extension',
	version: 1,
	type: 'context',
	context: workflowContext,
	strings: { 'greeting.hello': 'Hello' },
	...overrides,
});

/** A frame window whose parent is the jsdom window, so `event.source` checks work. */
function createFrameWindow() {
	const events = new EventTarget();
	const parent = { postMessage: vi.fn() };
	const target = {
		addEventListener: events.addEventListener.bind(events),
		removeEventListener: events.removeEventListener.bind(events),
		dispatchEvent: events.dispatchEvent.bind(events),
		parent,
	} as unknown as RuntimeWindow &
		EventTarget & { parent: { postMessage: ReturnType<typeof vi.fn> } };
	const send = (data: unknown, source: unknown = parent) => {
		const event = new MessageEvent('message', { data });
		Object.defineProperty(event, 'source', { value: source });
		events.dispatchEvent(event);
	};
	return { target, parent, send };
}

describe('createViewBridge', () => {
	it('updates the context and the strings on a valid context message', () => {
		const { target, send } = createFrameWindow();
		const bridge = createViewBridge(target);
		const context = bridge.api.useContext();

		expect(context.value).toEqual({ page: 'other', routeName: null });
		expect(bridge.api.t('greeting.hello')).toBe('greeting.hello');

		send(contextMessage());

		expect(context.value).toEqual(workflowContext);
		expect(bridge.api.t('greeting.hello')).toBe('Hello');
		expect(bridge.api.t('missing.key')).toBe('missing.key');
	});

	it.each(['__proto__', 'constructor', 'toString'])('returns the key %s itself', (key) => {
		const { target, send } = createFrameWindow();
		const bridge = createViewBridge(target);

		send(contextMessage());

		expect(bridge.api.t(key)).toBe(key);
	});

	it.each([
		['a wrong source', { source: 'someone-else' }],
		['a wrong version', { version: 2 }],
		['a wrong type', { type: 'ready' }],
		['a context that is not valid', { context: { page: 'admin' } }],
	])('ignores a message with %s', (_case, overrides) => {
		const { target, send } = createFrameWindow();
		const bridge = createViewBridge(target);

		send(contextMessage(overrides));

		expect(bridge.api.useContext().value).toEqual({ page: 'other', routeName: null });
	});

	it('ignores a message from a window that is not the parent', () => {
		const { target, send } = createFrameWindow();
		const bridge = createViewBridge(target);

		send(contextMessage(), { postMessage: vi.fn() });

		expect(bridge.api.useContext().value).toEqual({ page: 'other', routeName: null });
	});

	it('posts messages to the parent in the protocol envelope', () => {
		const { target, parent } = createFrameWindow();
		const bridge = createViewBridge(target);

		bridge.post({ type: 'ready' });
		bridge.postError(new Error('x'.repeat(5000)));

		expect(parent.postMessage).toHaveBeenNthCalledWith(
			1,
			{ source: 'n8n-ui-extension', version: 1, type: 'ready' },
			'*',
		);
		const errorMessage = parent.postMessage.mock.calls[1][0] as { message: string };
		expect(errorMessage).toMatchObject({ type: 'error' });
		expect(errorMessage.message).toHaveLength(1000);
	});

	it('runs the context callbacks once, on the first context', () => {
		const { target, send } = createFrameWindow();
		const bridge = createViewBridge(target);
		const listener = vi.fn();

		bridge.whenContext(listener);
		expect(listener).not.toHaveBeenCalled();

		send(contextMessage());
		send(contextMessage());
		expect(listener).toHaveBeenCalledTimes(1);

		const late = vi.fn();
		bridge.whenContext(late);
		expect(late).toHaveBeenCalledTimes(1);
	});
});

describe('createViewComponent', () => {
	const globals = () => ({ Vue, n8n: createViewBridge(createFrameWindow().target).api });

	it('calls the factory with the two globals and returns the component', () => {
		const factory = (vue: typeof Vue, n8n: unknown) => ({
			name: `${typeof vue.ref}:${typeof (n8n as { useContext: unknown }).useContext}`,
		});

		expect(createViewComponent(factory, globals())).toEqual({ name: 'function:function' });
	});

	it('reports a view script that did not load, with the load error', () => {
		expect(() => createViewComponent(undefined, globals())).toThrow('The view did not load.');
		expect(() => createViewComponent(undefined, globals(), 'Unexpected token')).toThrow(
			'The view did not load: Unexpected token',
		);
	});

	it.each([
		['a number', 42],
		['an array', []],
		['null', null],
	])('rejects a default export that is %s', (_case, value) => {
		expect(() => createViewComponent(() => value, globals())).toThrow(
			'must be a Vue component options object',
		);
	});

	it('throws the error of a view that throws', () => {
		expect(() =>
			createViewComponent(() => {
				throw new Error('boom');
			}, globals()),
		).toThrow('boom');
	});
});

describe('startViewRuntime', () => {
	const setFactory = (target: object, factory: unknown) =>
		Object.assign(target, { [UI_EXTENSION_VIEW_FACTORY_GLOBAL]: factory });

	const start = (factory: unknown, components = {}, doc: Document = document) => {
		document.body.innerHTML = '<div id="app"></div>';
		const frame = createFrameWindow();
		const target = Object.assign(frame.target, { document: doc });
		startViewRuntime(target, components);
		// The view script runs after the runtime script.
		setFactory(target, factory);
		return { ...frame, target };
	};

	it('posts ready, then mounts the view with the context on the first context message', async () => {
		const { parent, send } = start((vue: typeof Vue, n8n: ViewApi) => ({
			setup() {
				const c = n8n.useContext();
				const label = vue.computed(
					() =>
						`${c.value.page}:${c.value.page === 'workflow' ? (c.value.workflow?.name ?? '') : ''}:${n8n.t('greeting.hello')}`,
				);
				return { label };
			},
			template: '<p id="out">{{ label }}</p>',
		}));

		expect(parent.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'ready' }),
			'*',
		);
		expect(document.getElementById('out')).toBeNull();

		send(contextMessage());
		await nextTick();
		expect(document.getElementById('out')?.textContent).toBe('workflow:Payroll:Hello');

		send(
			contextMessage({
				context: {
					page: 'workflows',
					routeName: 'Workflows',
					projectId: null,
					totalWorkflows: null,
				},
			}),
		);
		await nextTick();
		expect(document.getElementById('out')?.textContent).toBe('workflows::Hello');
	});

	it('registers the given components for the view', async () => {
		const Shout = { template: '<strong id="shout"><slot /></strong>' };
		const { send } = start(() => ({ template: '<Shout>hi</Shout>' }), { Shout });

		send(contextMessage());
		await nextTick();

		expect(document.getElementById('shout')?.textContent).toBe('hi');
	});

	it('reports a script error of the view script', () => {
		document.body.innerHTML = '<div id="app"></div>';
		const frame = createFrameWindow();
		const target = Object.assign(frame.target, { document });
		startViewRuntime(target, {});

		target.dispatchEvent(new ErrorEvent('error', { message: 'Unexpected token }' }));
		frame.send(contextMessage());

		expect(frame.parent.postMessage).toHaveBeenLastCalledWith(
			expect.objectContaining({
				type: 'error',
				message: 'The view did not load: Unexpected token }',
			}),
			'*',
		);
	});

	it('posts an error when the view throws while it renders', async () => {
		const { parent, send } = start(() => ({
			setup() {
				throw new Error('render failed');
			},
		}));

		send(contextMessage());
		await nextTick();

		expect(parent.postMessage).toHaveBeenLastCalledWith(
			expect.objectContaining({ type: 'error', message: 'render failed' }),
			'*',
		);
	});

	it('waits for the document to load before it mounts', async () => {
		const loading = new EventTarget();
		const doc = Object.assign(loading, {
			readyState: 'loading',
			getElementById: (id: string) => document.getElementById(id),
		}) as unknown as Document;
		const { send } = start(() => ({ template: '<p id="late">ok</p>' }), {}, doc);

		send(contextMessage());
		await nextTick();
		expect(document.getElementById('late')).toBeNull();

		loading.dispatchEvent(new Event('DOMContentLoaded'));
		await nextTick();
		expect(document.getElementById('late')?.textContent).toBe('ok');
	});
});
