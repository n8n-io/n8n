import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import ConnectionRow from '../ConnectionRow.vue';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const renderComponent = createComponentRenderer(ConnectionRow);

const baseProps = {
	name: 'Brave',
	subtitle: 'Search the web',
	icon: 'plug' as const,
};

describe('ConnectionRow', () => {
	it('opens settings on row click', async () => {
		const { getByText, emitted } = renderComponent({
			props: { ...baseProps, status: 'connected' as const },
		});

		await fireEvent.click(getByText('Brave'));

		expect(emitted().openSettings).toHaveLength(1);
	});

	it('stays inert when not clickable', async () => {
		const { getByText, emitted } = renderComponent({
			props: { ...baseProps, clickable: false },
		});

		await fireEvent.click(getByText('Brave'));

		expect(emitted().openSettings).toBeUndefined();
	});

	it('reports the status through the indicator tooltip', () => {
		const { getByTestId } = renderComponent({
			props: { ...baseProps, status: 'disconnected' as const },
		});

		expect(getByTestId('instance-ai-connection-row-status')).toHaveAttribute(
			'title',
			'instanceAi.connections.row.status.disconnected',
		);
	});

	it('renders no status indicator for a row with no status', () => {
		const { queryByTestId } = renderComponent({ props: baseProps });

		expect(queryByTestId('instance-ai-connection-row-status')).toBeNull();
	});

	it('renders no actions menu without actions', () => {
		const { queryByTestId } = renderComponent({
			props: { ...baseProps, status: 'connected' as const },
		});

		expect(queryByTestId('instance-ai-connection-row-actions')).toBeNull();
	});

	it.each([
		['settings', 'openSettings'],
		['disconnect', 'disconnect'],
		['remove', 'remove'],
		['connect', 'connect'],
	] as const)('emits %s from the actions menu', async (action, event) => {
		const { getByTestId, findByText, emitted } = renderComponent({
			props: { ...baseProps, status: 'connected' as const, actions: [action] },
		});

		await fireEvent.click(getByTestId('instance-ai-connection-row-actions'));
		await fireEvent.click(await findByText(`instanceAi.connections.row.${action}`));

		expect(emitted()[event]).toHaveLength(1);
	});

	it('lets the action slot replace the status control', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { ...baseProps, status: 'connected' as const, actions: ['settings'] as const },
			slots: { action: '<button data-test-id="slotted-action">Connected</button>' },
		});

		expect(getByTestId('slotted-action')).toBeVisible();
		expect(queryByTestId('instance-ai-connection-row-status')).toBeNull();
		expect(queryByTestId('instance-ai-connection-row-actions')).toBeNull();
	});

	it('does not open settings when interacting with the action slot', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: { ...baseProps, status: 'connected' as const },
			slots: { action: '<button data-test-id="slotted-action">Connected</button>' },
		});

		await fireEvent.click(getByTestId('slotted-action'));

		expect(emitted().openSettings).toBeUndefined();
	});
});
