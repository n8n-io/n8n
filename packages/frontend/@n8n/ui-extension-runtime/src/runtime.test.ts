import type { UiExtensionPageContext } from '@n8n/api-types';
import { nextTick } from 'vue';
import * as Vue from 'vue';

import {
	createViewBridge,
	evaluateViewSource,
	readViewSource,
	startViewRuntime,
	type RuntimeWindow,
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
		parent,
	} as unknown as RuntimeWindow & { parent: { postMessage: ReturnType<typeof vi.fn> } };
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

describe('evaluateViewSource', () => {
	const globals = () => ({ Vue, n8n: createViewBridge(createFrameWindow().target).api });

	it('returns the default export and passes the globals in', () => {
		const component = evaluateViewSource(
			'const label = typeof Vue.ref + typeof n8n.useContext;\nexport default { name: label };',
			globals(),
		);

		expect(component).toEqual({ name: 'functionfunction' });
	});

	it.each([
		['an import statement', "import { ref } from 'vue';\nexport default {};"],
		['no default export', 'const x = 1;'],
		['two default exports', 'export default {};\nexport default {};'],
	])('rejects a source with %s', (_case, source) => {
		expect(() => evaluateViewSource(source, globals())).toThrow();
	});

	it('rejects a default export that is not a component', () => {
		expect(() => evaluateViewSource('export default 42;', globals())).toThrow(
			'must be a Vue component options object',
		);
	});

	it('throws the error of a source that throws', () => {
		expect(() =>
			evaluateViewSource('throw new Error("boom");\nexport default {};', globals()),
		).toThrow('boom');
	});
});

describe('readViewSource', () => {
	it('reads a JSON-encoded source', () => {
		document.body.innerHTML = `<script type="application/json" id="view-source">${JSON.stringify(
			'export default { template: "<p>\\u003c/script></p>" }',
		)}</script>`;

		expect(readViewSource(document)).toContain('export default');
	});

	it('rejects a value that is not a string', () => {
		document.body.innerHTML = '<script type="application/json" id="view-source">42</script>';

		expect(() => readViewSource(document)).toThrow('not a string');
	});
});

describe('startViewRuntime', () => {
	const setDocument = (source: string) => {
		document.body.innerHTML = `<div id="app"></div><script type="application/json" id="view-source">${JSON.stringify(source).replace(/</g, '\\u003c')}</script>`;
	};

	const start = (components = {}) => {
		const frame = createFrameWindow();
		const target = Object.assign(frame.target, { document });
		startViewRuntime(target, components);
		return frame;
	};

	it('posts ready, then mounts the view with the context on the first context message', async () => {
		setDocument(
			'export default { setup() { const c = n8n.useContext(); return { c }; }, template: `<p id="out">{{ c.page }}:{{ c.workflow?.name }}:{{ n8n.t("greeting.hello") }}</p>`, computed: { n8n: () => n8n } };',
		);
		const { parent, send } = start();

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
		setDocument('export default { template: "<Shout>hi</Shout>" };');
		const Shout = { template: '<strong id="shout"><slot /></strong>' };
		const { send } = start({ Shout });

		send(contextMessage());
		await nextTick();

		expect(document.getElementById('shout')?.textContent).toBe('hi');
	});

	it('posts an error when the source does not load', () => {
		setDocument('export default {};\nexport default {};');
		const { parent, send } = start();

		send(contextMessage());

		expect(parent.postMessage).toHaveBeenLastCalledWith(
			expect.objectContaining({
				type: 'error',
				message: expect.stringContaining('export default'),
			}),
			'*',
		);
	});

	it('posts an error when the view throws while it renders', async () => {
		setDocument('export default { setup() { throw new Error("render failed"); } };');
		const { parent, send } = start();

		send(contextMessage());
		await nextTick();

		expect(parent.postMessage).toHaveBeenLastCalledWith(
			expect.objectContaining({ type: 'error', message: 'render failed' }),
			'*',
		);
	});
});
