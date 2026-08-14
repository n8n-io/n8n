import { fireEvent } from '@testing-library/vue';
import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { GenerativeUiLookOnlyKey, GenerativeUiNodesKey } from '../nodeLookup';
import InteractiveSurface from './InteractiveSurface.vue';

const nodes = [
	{
		id: 'node-1',
		name: 'Send Slack message',
		type: 'n8n-nodes-base.slack',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
	},
];

const renderComponent = createComponentRenderer(InteractiveSurface, {
	props: {
		nodeId: 'node-1',
		label: '#incidents',
		pressBound: true,
	},
	slots: {
		default: '<p>body</p>',
	},
});

function getSurface(container: Element) {
	const surface = container.firstElementChild;
	if (!surface) throw new Error('Interactive surface was not rendered');
	return surface;
}

describe('InteractiveSurface', () => {
	it('emits press for click, Enter, and Space when interactive', async () => {
		const { emitted, getByRole } = renderComponent();
		const surface = getByRole('button');

		expect(surface).toHaveAttribute('tabindex', '0');

		await fireEvent.click(surface);
		await fireEvent.keyDown(surface, { key: 'Enter' });
		await fireEvent.keyDown(surface, { key: ' ' });

		expect(emitted().press).toHaveLength(3);
	});

	it('names the surface after the node it opens', () => {
		const { getByRole } = renderComponent({
			global: { provide: { [GenerativeUiNodesKey]: ref(nodes) } },
		});

		expect(getByRole('button', { name: 'Open Send Slack message' })).toBeInTheDocument();
	});

	it('falls back to the operation label when the node is unresolved', () => {
		const { getByRole } = renderComponent();

		expect(getByRole('button', { name: 'Open #incidents' })).toBeInTheDocument();
	});

	it('renders its content without adding visual chrome attributes', () => {
		const { container, getByText } = renderComponent();
		const surface = getSurface(container);

		expect(getByText('body')).toBeInTheDocument();
		expect(surface).not.toHaveAttribute('data-motion');
		expect(surface).not.toHaveAttribute('data-emphasis');
		expect(surface).not.toHaveAttribute('data-tone');
	});

	it('has no interactive behavior in look-only state', async () => {
		const { container, emitted, queryByRole } = renderComponent({
			global: { provide: { [GenerativeUiLookOnlyKey]: ref(true) } },
		});
		const surface = getSurface(container);

		expect(queryByRole('button')).not.toBeInTheDocument();
		expect(surface).not.toHaveAttribute('tabindex');
		expect(surface).not.toHaveAttribute('aria-label');

		await fireEvent.click(surface);
		await fireEvent.keyDown(surface, { key: 'Enter' });

		expect(emitted().press).toBeUndefined();
	});

	it('has no interactive behavior without a node ID', async () => {
		const { container, emitted, queryByRole } = renderComponent({ props: { nodeId: null } });
		const surface = getSurface(container);

		expect(queryByRole('button')).not.toBeInTheDocument();
		await fireEvent.click(surface);

		expect(emitted().press).toBeUndefined();
	});

	it('has no interactive behavior without a press binding', async () => {
		const { container, emitted, queryByRole } = renderComponent({ props: { pressBound: false } });
		const surface = getSurface(container);

		expect(queryByRole('button')).not.toBeInTheDocument();
		expect(surface).not.toHaveAttribute('tabindex');
		await fireEvent.click(surface);

		expect(emitted().press).toBeUndefined();
	});
});
