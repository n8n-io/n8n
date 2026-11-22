import { createComponentRenderer, mockedStore, waitAllPromises } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { useCustomNodesStore } from '../custom-nodes.store';
import NodeIconUpload from './NodeIconUpload.vue';

const { showMessage, showError } = vi.hoisted(() => ({ showMessage: vi.fn(), showError: vi.fn() }));

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage, showError }) }));

const renderUpload = createComponentRenderer(NodeIconUpload);

const setup = () => {
	const pinia = createTestingPinia();
	const store = mockedStore(useCustomNodesStore);
	store.setNodeIcon.mockResolvedValue();
	return { store, ...renderUpload({ pinia, props: { nodeId: 'node-1' } }) };
};

describe('NodeIconUpload', () => {
	beforeEach(() => vi.clearAllMocks());

	it('rejects a file over 256 KiB without sending it', async () => {
		const { store, getByTestId } = setup();
		const file = new File([new Uint8Array(256 * 1024 + 1)], 'big.png', { type: 'image/png' });

		await userEvent.upload(getByTestId('custom-nodes-icon-input'), file);
		await waitAllPromises();

		expect(store.setNodeIcon).not.toHaveBeenCalled();
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ title: expect.stringContaining('too large'), type: 'error' }),
		);
	});

	it('sends a valid file as a data URI', async () => {
		const { store, emitted, getByTestId } = setup();
		const file = new File([new Uint8Array([1, 2, 3])], 'icon.png', { type: 'image/png' });

		await userEvent.upload(getByTestId('custom-nodes-icon-input'), file);
		await waitAllPromises();

		expect(store.setNodeIcon).toHaveBeenCalledWith('node-1', {
			iconDataUri: 'data:image/png;base64,AQID',
		});
		expect(emitted('uploaded')).toHaveLength(1);
	});

	it('shows the server reason and the PNG hint on a 400', async () => {
		const { store, getByTestId } = setup();
		store.setNodeIcon.mockRejectedValue(
			Object.assign(new Error('SVG contains a script'), { httpStatusCode: 400 }),
		);
		const file = new File(['<svg/>'], 'icon.svg', { type: 'image/svg+xml' });

		await userEvent.upload(getByTestId('custom-nodes-icon-input'), file);
		await waitAllPromises();

		const call = showMessage.mock.calls[0][0];
		expect(call.message).toContain('SVG contains a script');
		expect(call.message).toContain('Use PNG instead.');
		expect(showError).not.toHaveBeenCalled();
	});

	it('escapes the server reason, so the toast keeps the element name', async () => {
		const { store, getByTestId } = setup();
		store.setNodeIcon.mockRejectedValue(
			Object.assign(new Error('The SVG icon has the element <script>.'), { httpStatusCode: 400 }),
		);
		const file = new File(['<svg/>'], 'icon.svg', { type: 'image/svg+xml' });

		await userEvent.upload(getByTestId('custom-nodes-icon-input'), file);
		await waitAllPromises();

		const call = showMessage.mock.calls[0][0];
		expect(call.message).toContain('The SVG icon has the element &lt;script&gt;.');
		expect(call.message).not.toContain('<script>');
	});
});
