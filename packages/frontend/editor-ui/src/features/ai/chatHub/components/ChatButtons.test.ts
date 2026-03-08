import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/vue';
import ChatButtons from './ChatButtons.vue';
import type { ChatHubMessageButton } from '@n8n/api-types';

describe('ChatButtons', () => {
	const mockButtons: ChatHubMessageButton[] = [
		{ text: 'Approve', link: 'https://example.com/approve', type: 'primary' },
		{ text: 'Reject', link: 'https://example.com/reject', type: 'secondary' },
	];

	let fetchMock: ReturnType<typeof vi.fn>;
	const originalFetch = global.fetch;

	beforeEach(() => {
		fetchMock = vi.fn().mockResolvedValue({ ok: true });
		global.fetch = fetchMock;
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it('should render all buttons when isDisabled is false', () => {
		const { getByText } = render(ChatButtons, {
			props: {
				buttons: mockButtons,
				isDisabled: false,
			},
		});

		expect(getByText('Approve')).toBeTruthy();
		expect(getByText('Reject')).toBeTruthy();
	});

	it('should have enabled buttons when isDisabled is false', () => {
		const { getByText } = render(ChatButtons, {
			props: {
				buttons: mockButtons,
				isDisabled: false,
			},
		});

		const approveButton = getByText('Approve').closest('button');
		const rejectButton = getByText('Reject').closest('button');

		expect(approveButton?.disabled).toBe(false);
		expect(rejectButton?.disabled).toBe(false);
	});

	it('should have disabled buttons when isDisabled is true', () => {
		const { getByText } = render(ChatButtons, {
			props: {
				buttons: mockButtons,
				isDisabled: true,
			},
		});

		const approveButton = getByText('Approve').closest('button');
		const rejectButton = getByText('Reject').closest('button');

		expect(approveButton?.disabled).toBe(true);
		expect(rejectButton?.disabled).toBe(true);
	});

	it('should make fetch request when button is clicked', async () => {
		const { getByText } = render(ChatButtons, {
			props: {
				buttons: mockButtons,
				isDisabled: false,
			},
		});

		await fireEvent.click(getByText('Approve'));

		expect(fetchMock).toHaveBeenCalledWith('https://example.com/approve');
	});

	it('should show only clicked button after successful click', async () => {
		const { getByText, queryByText } = render(ChatButtons, {
			props: {
				buttons: mockButtons,
				isDisabled: false,
			},
		});

		await fireEvent.click(getByText('Approve'));

		await waitFor(() => {
			expect(getByText('Approve')).toBeTruthy();
			expect(queryByText('Reject')).toBeNull();
		});
	});

	it('should disable clicked button after successful click', async () => {
		const { getByText } = render(ChatButtons, {
			props: {
				buttons: mockButtons,
				isDisabled: false,
			},
		});

		await fireEvent.click(getByText('Approve'));

		await waitFor(() => {
			const approveButton = getByText('Approve').closest('button');
			expect(approveButton?.disabled).toBe(true);
		});
	});

	it('should not make fetch request when button is already clicked', async () => {
		const { getByText } = render(ChatButtons, {
			props: {
				buttons: mockButtons,
				isDisabled: false,
			},
		});

		await fireEvent.click(getByText('Approve'));
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

		// Try clicking again
		await fireEvent.click(getByText('Approve'));

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('should not make fetch request when isDisabled is true', async () => {
		const { getByText } = render(ChatButtons, {
			props: {
				buttons: mockButtons,
				isDisabled: true,
			},
		});

		// Force click even though button is disabled
		await fireEvent.click(getByText('Approve'));

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('should not hide buttons when fetch fails', async () => {
		fetchMock.mockResolvedValue({ ok: false });

		const { getByText } = render(ChatButtons, {
			props: {
				buttons: mockButtons,
				isDisabled: false,
			},
		});

		await fireEvent.click(getByText('Approve'));

		await waitFor(() => {
			// Both buttons should still be visible
			expect(getByText('Approve')).toBeTruthy();
			expect(getByText('Reject')).toBeTruthy();
		});
	});

	it('should render single button correctly', () => {
		const singleButton: ChatHubMessageButton[] = [
			{ text: 'Continue', link: 'https://example.com/continue', type: 'primary' },
		];

		const { getByText } = render(ChatButtons, {
			props: {
				buttons: singleButton,
				isDisabled: false,
			},
		});

		expect(getByText('Continue')).toBeTruthy();
	});

	it('should not make multiple fetch requests while loading', async () => {
		// Create a delayed fetch that we can control
		let resolveFirstFetch: (value: { ok: boolean }) => void;
		const firstFetchPromise = new Promise<{ ok: boolean }>((resolve) => {
			resolveFirstFetch = resolve;
		});
		fetchMock.mockReturnValueOnce(firstFetchPromise);

		const { getByText } = render(ChatButtons, {
			props: {
				buttons: mockButtons,
				isDisabled: false,
			},
		});

		// First click starts loading
		await fireEvent.click(getByText('Approve'));
		expect(fetchMock).toHaveBeenCalledTimes(1);

		// Try clicking other button while first request is in-flight
		await fireEvent.click(getByText('Reject'));
		expect(fetchMock).toHaveBeenCalledTimes(1); // Should still be 1

		// Try clicking same button again while loading
		await fireEvent.click(getByText('Approve'));
		expect(fetchMock).toHaveBeenCalledTimes(1); // Should still be 1

		// Resolve the first fetch
		resolveFirstFetch!({ ok: true });

		await waitFor(() => {
			// Now the request is complete, fetch should still have been called only once
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
	});

	it('should disable buttons while loading', async () => {
		// Create a delayed fetch
		let resolveFirstFetch: (value: { ok: boolean }) => void;
		const firstFetchPromise = new Promise<{ ok: boolean }>((resolve) => {
			resolveFirstFetch = resolve;
		});
		fetchMock.mockReturnValueOnce(firstFetchPromise);

		const { getByText } = render(ChatButtons, {
			props: {
				buttons: mockButtons,
				isDisabled: false,
			},
		});

		// Click to start loading
		await fireEvent.click(getByText('Approve'));

		// Both buttons should be disabled while loading
		const approveButton = getByText('Approve').closest('button');
		const rejectButton = getByText('Reject').closest('button');
		expect(approveButton?.disabled).toBe(true);
		expect(rejectButton?.disabled).toBe(true);

		// Resolve the fetch
		resolveFirstFetch!({ ok: true });

		await waitFor(() => {
			// After resolution, only Approve should be visible and disabled
			expect(getByText('Approve').closest('button')?.disabled).toBe(true);
		});
	});
});
