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
});
