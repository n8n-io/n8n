import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import MCPAccessTokenPopoverTab from './MCPAccessTokenPopoverTab.vue';

const mockCopy = vi.fn();
const mockCopied = { value: false };

vi.mock('@/app/composables/useClipboard', () => ({
	useClipboard: () => ({
		copy: mockCopy,
		copied: mockCopied,
		isSupported: { value: true },
	}),
}));

const mockGetOrCreateApiKey = vi.fn();
const mockGenerateNewApiKey = vi.fn();
const mockResetCurrentUserMCPKey = vi.fn();
let mockCurrentUserMCPKey: { apiKey: string } | null = { apiKey: 'test-api-key-12345' };

vi.mock('@/features/ai/mcpAccess/mcp.store', () => ({
	useMCPStore: () => ({
		get currentUserMCPKey() {
			return mockCurrentUserMCPKey;
		},
		getOrCreateApiKey: mockGetOrCreateApiKey,
		generateNewApiKey: mockGenerateNewApiKey,
		resetCurrentUserMCPKey: mockResetCurrentUserMCPKey,
	}),
}));

vi.mock('./ConnectionParameter.vue', () => ({
	default: {
		name: 'ConnectionParameter',
		template: `
			<div :data-test-id="'connection-parameter-' + id">
				<span data-test-id="connection-parameter-label">{{ label }}</span>
				<span data-test-id="connection-parameter-value">{{ value }}</span>
				<button data-test-id="connection-parameter-copy-button" @click="$emit('copy', value)">Copy</button>
			</div>
		`,
		props: ['id', 'label', 'value', 'infoTip', 'maxWidth', 'allowCopy'],
		emits: ['copy'],
	},
}));

const renderComponent = createComponentRenderer(MCPAccessTokenPopoverTab, {
	pinia: createTestingPinia(),
});

describe('MCPAccessTokenPopoverTab', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		mockCurrentUserMCPKey = { apiKey: 'test-api-key-12345' };
		mockGetOrCreateApiKey.mockResolvedValue({ apiKey: 'test-api-key-12345' });
		mockGenerateNewApiKey.mockResolvedValue({ apiKey: 'new-api-key-67890' });
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	describe('Rendering', () => {
		it('should render server URL connection parameter', () => {
			const serverUrl = 'http://localhost:5678/mcp';
			const { getByTestId } = renderComponent({
				props: {
					serverUrl,
				},
			});

			expect(getByTestId('mcp-access-token-popover-tab')).toBeVisible();
			const serverUrlParam = getByTestId('connection-parameter-oauth-server-url');
			expect(serverUrlParam).toBeVisible();
			expect(
				serverUrlParam.querySelector('[data-test-id="connection-parameter-value"]'),
			).toHaveTextContent(serverUrl);
		});

		it('should render access token connection parameter when API key is loaded', async () => {
			const { getByTestId } = renderComponent({
				props: {
					serverUrl: 'http://localhost:5678/mcp',
				},
			});

			// Advance timers to complete loading timeout
			await vi.runAllTimersAsync();

			await waitFor(() => {
				const accessTokenParam = getByTestId('connection-parameter-access-token');
				expect(accessTokenParam).toBeVisible();
				expect(
					accessTokenParam.querySelector('[data-test-id="connection-parameter-value"]'),
				).toHaveTextContent('test-api-key-12345');
			});
		});

		it('should render JSON configuration block when loaded', async () => {
			const { getByTestId } = renderComponent({
				props: {
					serverUrl: 'http://localhost:5678/mcp',
				},
			});

			await vi.runAllTimersAsync();

			await waitFor(() => {
				expect(getByTestId('mcp-access-token-json')).toBeVisible();
			});
		});
	});

	describe('Events', () => {
		it('should emit copy event with serverUrl type when server URL is copied', async () => {
			const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
			const serverUrl = 'http://localhost:5678/mcp';
			const { getByTestId, emitted } = renderComponent({
				props: {
					serverUrl,
				},
			});

			const serverUrlParam = getByTestId('connection-parameter-oauth-server-url');
			const copyButton = serverUrlParam.querySelector(
				'[data-test-id="connection-parameter-copy-button"]',
			) as HTMLButtonElement;

			await user.click(copyButton);

			expect(emitted().copy).toBeTruthy();
			expect(emitted().copy[0]).toEqual(['serverUrl', serverUrl]);
		});

		it('should emit copy event with accessToken type when access token is copied', async () => {
			const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
			const { getByTestId, emitted } = renderComponent({
				props: {
					serverUrl: 'http://localhost:5678/mcp',
				},
			});

			await vi.runAllTimersAsync();

			await waitFor(() => {
				expect(getByTestId('connection-parameter-access-token')).toBeVisible();
			});

			const accessTokenParam = getByTestId('connection-parameter-access-token');
			const copyButton = accessTokenParam.querySelector(
				'[data-test-id="connection-parameter-copy-button"]',
			) as HTMLButtonElement;

			await user.click(copyButton);

			expect(emitted().copy).toBeTruthy();
			expect(emitted().copy[0]).toEqual(['accessToken', 'test-api-key-12345']);
		});

		it('should emit copy event with mcpJson type when JSON config is copied', async () => {
			const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
			const { getByTestId, emitted } = renderComponent({
				props: {
					serverUrl: 'http://localhost:5678/mcp',
				},
			});

			await vi.runAllTimersAsync();

			await waitFor(() => {
				expect(getByTestId('mcp-json-copy-button')).toBeVisible();
			});

			const copyButton = getByTestId('mcp-json-copy-button');

			await user.click(copyButton);

			expect(emitted().copy).toBeTruthy();
			const copyEvent = emitted().copy[0];
			expect(Array.isArray(copyEvent)).toBe(true);
			if (Array.isArray(copyEvent)) {
				expect(copyEvent[0]).toEqual('mcpJson');
				expect(copyEvent[1]).toContain('mcpServers');
			}
		});
	});

	describe('API Key handling', () => {
		it('should call getOrCreateApiKey on mount when no API key exists', async () => {
			mockCurrentUserMCPKey = null;

			renderComponent({
				props: {
					serverUrl: 'http://localhost:5678/mcp',
				},
			});

			await vi.runAllTimersAsync();

			expect(mockGetOrCreateApiKey).toHaveBeenCalled();
		});

		it('should not call getOrCreateApiKey on mount when API key already exists', async () => {
			mockCurrentUserMCPKey = { apiKey: 'existing-key' };

			renderComponent({
				props: {
					serverUrl: 'http://localhost:5678/mcp',
				},
			});

			await vi.runAllTimersAsync();

			expect(mockGetOrCreateApiKey).not.toHaveBeenCalled();
		});
	});
});
