import type { UiExtensionPageContext } from '@n8n/api-types';
import { fireEvent, render } from '@testing-library/vue';
import { nextTick } from 'vue';

import type { SidePanelView } from '../ui-extensions.types';
import ViewFrame from './ViewFrame.vue';

const workflowContext: UiExtensionPageContext = {
	page: 'workflow',
	routeName: 'NodeViewExisting',
	workflow: { id: 'wf-1', name: 'Payroll', active: false, nodes: [] },
};

const mcpView: SidePanelView = {
	id: 'view-1',
	title: 'Stats',
	source: 'export default {}',
	updatedAt: '2026-01-01T00:00:00.000Z',
	builtin: false,
};

const runtime = { js: 'void 0', css: '' };
const envelope = { source: 'n8n-ui-extension', version: 1 };
const ready = { ...envelope, type: 'ready' };

/** Lets the message ports deliver what is in flight. */
const flush = async () => await new Promise((resolve) => setTimeout(resolve, 0));

function renderFrame(props: Partial<InstanceType<typeof ViewFrame>['$props']> = {}) {
	const result = render(ViewFrame, {
		props: {
			view: mcpView,
			pageContext: workflowContext,
			workflowAvailableInMcp: true,
			runtime,
			...props,
		},
	});
	const iframe = result.getByTestId('ui-extensions-view-frame') as HTMLIFrameElement;
	const frameWindow = iframe.contentWindow!;

	// The runtime's side of the port: what the frame receives over it.
	const received: unknown[] = [];
	let framePort: MessagePort | undefined;
	const postMessage = vi
		.spyOn(frameWindow, 'postMessage')
		.mockImplementation((_message: unknown, _origin: unknown, transfer?: unknown) => {
			const [port] = (transfer as MessagePort[] | undefined) ?? [];
			if (!port) return;
			framePort = port;
			port.onmessage = (event) => received.push(event.data);
		});

	const fromFrame = (data: unknown, source: unknown = frameWindow) =>
		window.dispatchEvent(new MessageEvent('message', { data, source: source as Window }));
	const fromFramePort = (data: unknown) => framePort?.postMessage(data);

	return { ...result, iframe, postMessage, received, fromFrame, fromFramePort };
}

describe('ViewFrame', () => {
	it('sandboxes the frame to scripts only, with a policy that blocks network access', () => {
		const { iframe } = renderFrame();

		expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
		expect(iframe.getAttribute('srcdoc')).toContain("connect-src 'none'");
	});

	it('answers ready with a port, and sends the context over that port only', async () => {
		const { postMessage, received, fromFrame } = renderFrame();

		expect(postMessage).not.toHaveBeenCalled();
		fromFrame(ready);
		await flush();

		expect(postMessage).toHaveBeenCalledOnce();
		expect(postMessage).toHaveBeenCalledWith({ ...envelope, type: 'connect' }, '*', [
			expect.any(MessagePort),
		]);
		await vi.waitFor(() => expect(received).toHaveLength(1));
		expect(received).toEqual([
			{ ...envelope, type: 'context', context: workflowContext, strings: {} },
		]);
	});

	it('connects only once', async () => {
		const { postMessage, fromFrame } = renderFrame();

		fromFrame(ready);
		fromFrame(ready);
		await flush();

		expect(postMessage).toHaveBeenCalledOnce();
	});

	it('sends the redacted context to an MCP view', async () => {
		const { received, fromFrame } = renderFrame({ workflowAvailableInMcp: false });

		fromFrame(ready);
		await vi.waitFor(() => expect(received).toHaveLength(1));

		expect(received[0]).toMatchObject({ context: { page: 'workflow', workflow: null } });
	});

	it('sends the strings of the built-in view, with their placeholders', async () => {
		const { received, fromFrame } = renderFrame({ view: { ...mcpView, builtin: true } });

		fromFrame(ready);
		await vi.waitFor(() => expect(received).toHaveLength(1));

		expect(received[0]).toMatchObject({
			strings: {
				'uiExtensions.pageSummary.workflows.heading': 'Workflows',
				'uiExtensions.pageSummary.workflow.nodeCount': 'Nodes: {count}',
			},
		});
	});

	it('sends the context again when it changes', async () => {
		const { received, fromFrame, rerender } = renderFrame();
		fromFrame(ready);

		await rerender({
			pageContext: {
				page: 'workflows',
				routeName: 'WorkflowsView',
				projectId: null,
				totalWorkflows: 3,
			},
		});
		await nextTick();
		await vi.waitFor(() => expect(received).toHaveLength(2));

		expect(received.at(-1)).toMatchObject({
			context: {
				page: 'workflows',
				routeName: 'WorkflowsView',
				projectId: null,
				totalWorkflows: null,
			},
		});
	});

	it('ignores messages from another window', () => {
		const { postMessage, fromFrame } = renderFrame();

		fromFrame(ready, window);

		expect(postMessage).not.toHaveBeenCalled();
	});

	it('ignores messages that are not in the protocol', () => {
		const { postMessage, fromFrame } = renderFrame();

		fromFrame({ ...ready, source: 'other' });
		fromFrame({ ...ready, version: 2 });

		expect(postMessage).not.toHaveBeenCalled();
	});

	it('shows the error that the view reports over the port', async () => {
		const { fromFrame, fromFramePort, findByTestId } = renderFrame();
		fromFrame(ready);

		fromFramePort({ ...envelope, type: 'error', message: 'boom' });

		const callout = await findByTestId('ui-extensions-view-error');
		expect(callout.textContent).toContain('boom');
		expect(callout.textContent).toContain('MCP client');
	});

	it('tells the user to reload the page when the built-in view fails', async () => {
		const { fromFrame, fromFramePort, findByTestId } = renderFrame({
			view: { ...mcpView, builtin: true },
		});
		fromFrame(ready);

		fromFramePort({ ...envelope, type: 'error', message: 'boom' });

		const callout = await findByTestId('ui-extensions-view-error');
		expect(callout.textContent).toContain('Reload the page');
		expect(callout.textContent).not.toContain('MCP client');
	});

	it('sends nothing more after the view loads another page', async () => {
		const { iframe, received, fromFrame, rerender } = renderFrame();
		fromFrame(ready);
		await vi.waitFor(() => expect(received).toHaveLength(1));

		await fireEvent.load(iframe);
		await fireEvent.load(iframe);
		await rerender({ pageContext: { page: 'other', routeName: 'SettingsPersonalView' } });
		await nextTick();
		await flush();

		expect(received).toHaveLength(1);
	});

	it('shows why a source is not a view, and renders no frame', () => {
		const result = render(ViewFrame, {
			props: {
				view: { ...mcpView, source: 'const x = 1;' },
				pageContext: workflowContext,
				workflowAvailableInMcp: true,
				runtime,
			},
		});

		expect(result.getByTestId('ui-extensions-view-error').textContent).toContain('export default');
		expect(result.queryByTestId('ui-extensions-view-frame')).toBeNull();
	});

	it('removes the frame when the view loads another page', async () => {
		const { iframe, fromFrame, findByTestId, queryByTestId } = renderFrame();
		fromFrame(ready);

		await fireEvent.load(iframe);
		expect(queryByTestId('ui-extensions-view-left')).toBeNull();

		await fireEvent.load(iframe);

		expect(await findByTestId('ui-extensions-view-left')).toBeTruthy();
		expect(queryByTestId('ui-extensions-view-frame')).toBeNull();
	});
});
