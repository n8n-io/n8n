import { createComponentRenderer } from '@/__tests__/render';

import AppPreviewFrame from '../AppPreviewFrame.vue';

const renderComponent = createComponentRenderer(AppPreviewFrame);

describe('AppPreviewFrame', () => {
	it('appends the page path to the built app URL', () => {
		const { getByTestId } = renderComponent({
			props: { namespace: 'greeter', versionId: 'v-1', path: 'clients/:id' },
		});

		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
			'src',
			'/apps/greeter/clients/%3Aid?v=v-1',
		);
	});

	it('appends the page path to the live dev-server URL', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: { namespace: 'greeter', liveUrl: '/apps-preview/tok/', path: 'clients/:id' },
		});

		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
			'src',
			'/apps-preview/tok/clients/%3Aid',
		);

		await rerender({ path: '' });
		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
			'src',
			'/apps-preview/tok/',
		);
	});

	it('keeps the build cache-buster of a built live preview behind the page path', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: { namespace: 'greeter', liveUrl: '/apps-preview/tok/?b=2', path: 'clients/:id' },
		});

		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
			'src',
			'/apps-preview/tok/clients/%3Aid?b=2',
		);

		await rerender({ liveUrl: '/apps-preview/tok/?b=3', path: '' });
		expect(getByTestId('instance-ai-app-preview-iframe')).toHaveAttribute(
			'src',
			'/apps-preview/tok/?b=3',
		);
	});

	describe('messages from the frame', () => {
		const diagnostic = {
			source: 'n8n-app-preview',
			v: 1,
			at: '2026-09-08T10:00:00.000Z',
			kind: 'uncaught',
			message: 'boom',
		};
		const selection = {
			source: 'n8nable',
			type: 'inspect:selected',
			element: { tagName: 'button', text: 'Submit', selector: '#go', route: '/clients' },
		};

		function post(iframe: HTMLIFrameElement, data: unknown, source?: MessageEventSource) {
			window.dispatchEvent(
				new MessageEvent('message', {
					data,
					origin: 'null',
					source: source ?? iframe.contentWindow,
				}),
			);
		}

		it('emits a diagnostic for the dev bridge and a selection for the inspector', () => {
			const { getByTestId, emitted } = renderComponent({
				props: { namespace: 'greeter', liveUrl: '/apps-preview/tok/' },
			});
			const iframe = getByTestId<HTMLIFrameElement>('instance-ai-app-preview-iframe');

			post(iframe, diagnostic);
			post(iframe, selection);

			expect(emitted('diagnostic')).toEqual([
				[{ at: '2026-09-08T10:00:00.000Z', kind: 'uncaught', message: 'boom' }],
			]);
			expect(emitted('element-selected')).toEqual([[selection.element]]);
		});

		it('ignores messages from other windows, other sources and other inspector types', () => {
			const { getByTestId, emitted } = renderComponent({
				props: { namespace: 'greeter', liveUrl: '/apps-preview/tok/' },
			});
			const iframe = getByTestId<HTMLIFrameElement>('instance-ai-app-preview-iframe');

			post(iframe, diagnostic, window);
			post(iframe, selection, window);
			post(iframe, { ...diagnostic, source: 'someone-else' });
			post(iframe, { ...selection, type: 'inspect:enable' });
			post(iframe, { ...diagnostic, source: 'n8nable' });
			post(iframe, 'not an object');

			expect(emitted('diagnostic')).toBeUndefined();
			expect(emitted('element-selected')).toBeUndefined();
		});
	});
});
