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
	const postMessage = vi.spyOn(frameWindow, 'postMessage').mockImplementation(() => {});
	const fromFrame = (data: unknown, source: unknown = frameWindow) =>
		window.dispatchEvent(new MessageEvent('message', { data, source: source as Window }));
	return { ...result, iframe, postMessage, fromFrame };
}

const ready = { source: 'n8n-ui-extension', version: 1, type: 'ready' };

describe('ViewFrame', () => {
	it('sandboxes the frame to scripts only, with a policy that blocks network access', () => {
		const { iframe } = renderFrame();

		expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
		expect(iframe.getAttribute('srcdoc')).toContain("connect-src 'none'");
	});

	it('sends the context after the frame is ready, and not before', async () => {
		const { postMessage, fromFrame } = renderFrame();

		expect(postMessage).not.toHaveBeenCalled();
		fromFrame(ready);

		expect(postMessage).toHaveBeenCalledWith(
			{
				source: 'n8n-ui-extension',
				version: 1,
				type: 'context',
				context: workflowContext,
				strings: {},
			},
			'*',
		);
	});

	it('sends the redacted context to an MCP view', () => {
		const { postMessage, fromFrame } = renderFrame({ workflowAvailableInMcp: false });

		fromFrame(ready);

		expect(postMessage.mock.calls[0][0]).toMatchObject({
			context: { page: 'workflow', workflow: null },
		});
	});

	it('sends the strings of the built-in view', () => {
		const { postMessage, fromFrame } = renderFrame({
			view: { ...mcpView, builtin: true },
		});

		fromFrame(ready);

		expect(postMessage.mock.calls[0][0]).toMatchObject({
			strings: { 'uiExtensions.pageSummary.workflows.heading': 'Workflows' },
		});
	});

	it('sends the context again when it changes', async () => {
		const { postMessage, fromFrame, rerender } = renderFrame();
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

		expect(postMessage).toHaveBeenLastCalledWith(
			expect.objectContaining({
				context: {
					page: 'workflows',
					routeName: 'WorkflowsView',
					projectId: null,
					totalWorkflows: null,
				},
			}),
			'*',
		);
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

	it('shows the error that the view reports', async () => {
		const { fromFrame, findByTestId } = renderFrame();

		fromFrame({ source: 'n8n-ui-extension', version: 1, type: 'error', message: 'boom' });

		expect((await findByTestId('ui-extensions-view-error')).textContent).toContain('boom');
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
		const { iframe, postMessage, fromFrame, findByTestId, queryByTestId } = renderFrame();
		fromFrame(ready);
		postMessage.mockClear();

		await fireEvent.load(iframe);
		expect(queryByTestId('ui-extensions-view-left')).toBeNull();

		await fireEvent.load(iframe);

		expect(await findByTestId('ui-extensions-view-left')).toBeTruthy();
		expect(queryByTestId('ui-extensions-view-frame')).toBeNull();
	});
});
