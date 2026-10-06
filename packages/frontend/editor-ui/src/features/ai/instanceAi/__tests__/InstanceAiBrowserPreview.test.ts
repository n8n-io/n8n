import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { IconBodyLoaderKey } from '@n8n/design-system';
import { reactive } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiBrowserPreview from '../components/InstanceAiBrowserPreview.vue';
import type { BrowserTab } from '../useCanvasPreview';

const storeState = reactive({ sendTaskCorrection: vi.fn(async () => {}) });

vi.mock('../instanceAi.store', () => ({ useThread: vi.fn(() => storeState) }));

const renderComponent = createComponentRenderer(InstanceAiBrowserPreview, {
	pinia: createTestingPinia(),
	global: { provide: { [IconBodyLoaderKey as symbol]: async () => '<path d="M1 1"/>' } },
});

function browserTab(overrides: Partial<BrowserTab> = {}): BrowserTab {
	return {
		id: 'browser:agent-1',
		type: 'browser',
		name: 'Match inbound leads',
		icon: 'globe',
		url: 'https://live.example/session',
		pageUrl: 'https://app.ledgerly.test/login?next=%2F',
		taskId: 'browser-1',
		waitingForUser: false,
		...overrides,
	};
}

describe('InstanceAiBrowserPreview', () => {
	beforeEach(() => storeState.sendTaskCorrection.mockClear());

	it('shows the Live View with the current page in the address bar', () => {
		const { getByTestId, getByTitle } = renderComponent({ props: { tab: browserTab() } });

		expect(getByTestId('instance-ai-browser-preview-address')).toHaveTextContent(
			'app.ledgerly.test/login',
		);
		// Embedded without Browserbase's own bar: the preview draws its own.
		expect(getByTitle('Cloud browser Live View')).toHaveAttribute(
			'src',
			'https://live.example/session?navbar=false',
		);
	});

	it('is view-only until the user takes control', async () => {
		const { getByTestId } = renderComponent({ props: { tab: browserTab() } });
		const frame = getByTestId('instance-ai-browser-preview-frame');
		expect(frame).toHaveAttribute('tabindex', '-1');

		await fireEvent.click(getByTestId('instance-ai-browser-preview-control'));
		expect(frame).toHaveAttribute('tabindex', '0');
		expect(getByTestId('instance-ai-browser-preview-control')).toHaveTextContent(
			'Stop controlling',
		);
	});

	it('gives the user control straight away while the task waits for them', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: { tab: browserTab({ waitingForUser: true }) },
		});
		expect(getByTestId('instance-ai-browser-preview-frame')).toHaveAttribute('tabindex', '0');

		// The hand-off ends: back to view-only.
		await rerender({ tab: browserTab({ waitingForUser: false }) });
		expect(getByTestId('instance-ai-browser-preview-frame')).toHaveAttribute('tabindex', '-1');
	});

	it('offers "I\'m done" only while the task waits for the user', async () => {
		const { queryByTestId, rerender, getByTestId } = renderComponent({
			props: { tab: browserTab() },
		});
		expect(queryByTestId('instance-ai-browser-preview-done')).not.toBeInTheDocument();

		await rerender({ tab: browserTab({ waitingForUser: true }) });
		await fireEvent.click(getByTestId('instance-ai-browser-preview-done'));

		expect(storeState.sendTaskCorrection).toHaveBeenCalledWith(
			'browser-1',
			expect.stringContaining('finished the step'),
			{ rememberLogin: false },
		);
	});

	it('offers to remember the login for the site and sends the choice with "I\'m done"', async () => {
		const { getByTestId, getByText } = renderComponent({
			props: { tab: browserTab({ waitingForUser: true, loginSite: 'example.com' }) },
		});

		expect(getByText('Remember this login for example.com')).toBeInTheDocument();
		await fireEvent.click(getByText('Remember this login for example.com'));
		await fireEvent.click(getByTestId('instance-ai-browser-preview-done'));

		expect(storeState.sendTaskCorrection).toHaveBeenCalledWith(
			'browser-1',
			expect.stringContaining('finished the step'),
			{ rememberLogin: true },
		);
	});

	it('does not offer to remember a browser that already uses a saved login', () => {
		const { queryByTestId } = renderComponent({
			props: { tab: browserTab({ waitingForUser: true }) },
		});

		expect(queryByTestId('instance-ai-browser-preview-remember-login')).not.toBeInTheDocument();
	});
});
