import { UI_EXTENSION_VIEW_FACTORY_GLOBAL, type UiExtensionPageContext } from '@n8n/api-types';
import * as Vue from 'vue';

import {
	createViewBridge,
	createViewComponent,
	interpolate,
	startViewRuntime,
	type RuntimeWindow,
	type ViewApi,
} from './runtime';

const workflowContext: UiExtensionPageContext = {
	page: 'workflow',
	routeName: 'NodeViewExisting',
	workflow: { id: 'wf-1', name: 'Payroll', active: false, nodes: [] },
};

const envelope = { source: 'n8n-ui-extension', version: 1 };

const contextMessage = (overrides: Record<string, unknown> = {}) => ({
	...envelope,
	type: 'context',
	context: workflowContext,
	strings: { 'greeting.hello': 'Hello', 'greeting.count': 'Nodes: {count}' },
	...overrides,
});

/** Lets the message ports deliver what is in flight. A port delivers on a later turn. */
const flush = async () => {
	for (let turn = 0; turn < 5; turn++) await new Promise((resolve) => setTimeout(resolve, 0));
};

/** The channels that a test opens. They are closed after each test. */
const openChannels: MessageChannel[] = [];

afterEach(() => {
	for (const channel of openChannels.splice(0)) {
		channel.port1.close();
		channel.port2.close();
	}
});

const createChannel = () => {
	const channel = new MessageChannel();
	openChannels.push(channel);
	return channel;
};

/** A frame window with a fake parent, so `event.source` checks work. */
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

	/** Dispatches a window message to the frame. */
	const sendWindowMessage = (
		data: unknown,
		source: unknown = parent,
		ports: MessagePort[] = [],
	) => {
		const event = new MessageEvent('message', { data });
		Object.defineProperty(event, 'source', { value: source });
		Object.defineProperty(event, 'ports', { value: ports });
		events.dispatchEvent(event);
	};

	/** Does the editor's side of the handshake and returns the editor's port. */
	const connect = () => {
		const channel = createChannel();
		const received: unknown[] = [];
		channel.port1.onmessage = (event) => received.push(event.data);
		sendWindowMessage({ ...envelope, type: 'connect' }, parent, [channel.port2]);
		const sendContext = async (overrides: Record<string, unknown> = {}) => {
			channel.port1.postMessage(contextMessage(overrides));
			await flush();
		};
		return { port: channel.port1, received, sendContext };
	};

	return { target, parent, sendWindowMessage, connect };
}

describe('interpolate', () => {
	it('fills the placeholders that have a value and keeps the others', () => {
		expect(interpolate('Nodes: {count}, {missing}', { count: 3 })).toBe('Nodes: 3, {missing}');
	});

	it('does not read placeholders from the object prototype', () => {
		expect(interpolate('{toString}', {})).toBe('{toString}');
	});
});

describe('createViewBridge', () => {
	it('takes the context and the strings from the port only', async () => {
		const { target, connect } = createFrameWindow();
		const bridge = createViewBridge(target);
		const context = bridge.api.useContext();

		expect(context.value).toEqual({ page: 'other', routeName: null });
		expect(bridge.api.t('greeting.hello')).toBe('greeting.hello');

		const { sendContext } = connect();
		await sendContext();

		expect(context.value).toEqual(workflowContext);
		expect(bridge.api.t('greeting.hello')).toBe('Hello');
		expect(bridge.api.t('greeting.count', { count: 4 })).toBe('Nodes: 4');
		expect(bridge.api.t('missing.key')).toBe('missing.key');
	});

	it('ignores a context message on the window', () => {
		const { target, sendWindowMessage } = createFrameWindow();
		const bridge = createViewBridge(target);

		sendWindowMessage(contextMessage());

		expect(bridge.api.useContext().value).toEqual({ page: 'other', routeName: null });
	});

	it.each(['__proto__', 'constructor', 'toString'])('returns the key %s itself', async (key) => {
		const { target, connect } = createFrameWindow();
		const bridge = createViewBridge(target);
		await connect().sendContext();

		expect(bridge.api.t(key)).toBe(key);
	});

	it.each([
		['a wrong source', { source: 'someone-else' }],
		['a wrong version', { version: 2 }],
		['a wrong type', { type: 'ready' }],
		['a context that is not valid', { context: { page: 'admin' } }],
	])('ignores a port message with %s', async (_case, overrides) => {
		const { target, connect } = createFrameWindow();
		const bridge = createViewBridge(target);

		await connect().sendContext(overrides);

		expect(bridge.api.useContext().value).toEqual({ page: 'other', routeName: null });
	});

	it('takes the port only from the parent window, and only once', async () => {
		const { target, sendWindowMessage, connect } = createFrameWindow();
		const bridge = createViewBridge(target);
		const intruder = createChannel();

		sendWindowMessage({ ...envelope, type: 'connect' }, { postMessage: vi.fn() }, [intruder.port2]);
		const editor = connect();
		sendWindowMessage({ ...envelope, type: 'connect' }, target.parent, [intruder.port2]);

		intruder.port1.postMessage(contextMessage({ context: { page: 'other', routeName: 'x' } }));
		await editor.sendContext();
		await flush();

		expect(bridge.api.useContext().value).toEqual(workflowContext);
	});

	it('posts ready to the parent, then errors over the port, in the protocol envelope', async () => {
		const { target, parent, connect } = createFrameWindow();
		const bridge = createViewBridge(target);

		bridge.post({ type: 'ready' });
		expect(parent.postMessage).toHaveBeenCalledWith({ ...envelope, type: 'ready' }, '*');

		const { received } = connect();
		bridge.postError(new Error('x'.repeat(5000)));
		await flush();

		expect(parent.postMessage).toHaveBeenCalledOnce();
		expect(received).toHaveLength(1);
		const message = received[0] as { type: string; message: string };
		expect(message.type).toBe('error');
		expect(message.message).toHaveLength(1000);
	});

	it('runs the context listeners once, on the first context', async () => {
		const { target, connect } = createFrameWindow();
		const bridge = createViewBridge(target);
		const listener = vi.fn();

		bridge.whenContext(listener);
		expect(listener).not.toHaveBeenCalled();

		const { sendContext } = connect();
		await sendContext();
		await sendContext();
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
	const start = (factory: unknown, components = {}, doc: Document = document) => {
		document.body.innerHTML = '<div id="app"></div>';
		const frame = createFrameWindow();
		const target = Object.assign(frame.target, { document: doc });
		startViewRuntime(target, components);
		// The view script runs after the runtime script.
		Object.assign(target, { [UI_EXTENSION_VIEW_FACTORY_GLOBAL]: factory });
		return { ...frame, target };
	};

	it('posts ready, then mounts the view with the context on the first context message', async () => {
		const { parent, connect } = start((vue: typeof Vue, n8n: ViewApi) => ({
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

		const { sendContext } = connect();
		await sendContext();
		await Vue.nextTick();
		expect(document.getElementById('out')?.textContent).toBe('workflow:Payroll:Hello');

		await sendContext({
			context: { page: 'workflows', routeName: 'Workflows', projectId: null, totalWorkflows: null },
		});
		await Vue.nextTick();
		expect(document.getElementById('out')?.textContent).toBe('workflows::Hello');
	});

	it('registers the given components for the view', async () => {
		const Shout = { template: '<strong id="shout"><slot /></strong>' };
		const { connect } = start(() => ({ template: '<Shout>hi</Shout>' }), { Shout });

		await connect().sendContext();
		await Vue.nextTick();

		expect(document.getElementById('shout')?.textContent).toBe('hi');
	});

	it('reports a script error of the view script over the port', async () => {
		document.body.innerHTML = '<div id="app"></div>';
		const frame = createFrameWindow();
		const target = Object.assign(frame.target, { document });
		startViewRuntime(target, {});

		target.dispatchEvent(new ErrorEvent('error', { message: 'Unexpected token }' }));
		const { received, sendContext } = frame.connect();
		await sendContext();
		await flush();

		expect(received).toContainEqual(
			expect.objectContaining({
				type: 'error',
				message: 'The view did not load: Unexpected token }',
			}),
		);
	});

	it('reports an error that the view throws while it renders', async () => {
		const { connect } = start(() => ({
			setup() {
				throw new Error('render failed');
			},
		}));

		const { received, sendContext } = connect();
		await sendContext();
		await Vue.nextTick();
		await flush();

		expect(received).toContainEqual(
			expect.objectContaining({ type: 'error', message: 'render failed' }),
		);
	});

	it('waits for the document to load before it mounts', async () => {
		const loading = new EventTarget();
		const doc = Object.assign(loading, {
			readyState: 'loading',
			getElementById: (id: string) => document.getElementById(id),
		}) as unknown as Document;
		const { connect } = start(() => ({ template: '<p id="late">ok</p>' }), {}, doc);

		await connect().sendContext();
		await Vue.nextTick();
		expect(document.getElementById('late')).toBeNull();

		loading.dispatchEvent(new Event('DOMContentLoaded'));
		await Vue.nextTick();
		expect(document.getElementById('late')?.textContent).toBe('ok');
	});
});
