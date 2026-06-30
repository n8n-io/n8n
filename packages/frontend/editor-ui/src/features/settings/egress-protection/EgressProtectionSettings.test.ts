import { createPinia, setActivePinia } from 'pinia';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import type { EgressPolicyStateResponse } from '@n8n/api-types';
import * as egressApi from '@n8n/rest-api-client/api/egress-protection';
import { createComponentRenderer } from '@/__tests__/render';
import EgressProtectionSettings from './EgressProtectionSettings.vue';
import { useEgressProtectionStore } from './egressProtection.store';

vi.mock('@n8n/rest-api-client/api/egress-protection', () => ({
	getEgressPolicy: vi.fn(),
	updateEgressPolicy: vi.fn(),
	getEgressCalibration: vi.fn(),
	clearEgressCalibration: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: 'http://localhost', pushRef: '' },
	})),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({ showMessage: vi.fn(), showError: vi.fn() })),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: vi.fn(() => ({ set: vi.fn() })),
}));

// onBeforeRouteLeave needs a router; the page only registers a guard, so a no-op
// is enough. Keep the rest of vue-router (RouterLink etc.) intact.
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	onBeforeRouteLeave: vi.fn(),
}));

const getPolicyMock = vi.mocked(egressApi.getEgressPolicy);
const updatePolicyMock = vi.mocked(egressApi.updateEgressPolicy);
const getCalibrationMock = vi.mocked(egressApi.getEgressCalibration);

// The built-in default blocklist is long; this is what used to bury the Save button.
const DEFAULT_BLOCKED = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8'];

const makePolicy = (
	overrides: Partial<EgressPolicyStateResponse> = {},
): EgressPolicyStateResponse => ({
	mode: 'log',
	editable: true,
	managedByEnv: false,
	defaultBlockedIpRanges: DEFAULT_BLOCKED,
	blockedIpRanges: [],
	allowedIpRanges: [],
	allowedHostnames: [],
	blockedHostnames: [],
	...overrides,
});

const renderComponent = createComponentRenderer(EgressProtectionSettings);

describe('EgressProtectionSettings', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		getPolicyMock.mockReset();
		updatePolicyMock.mockReset();
		getCalibrationMock.mockReset();
		getCalibrationMock.mockResolvedValue({ mode: 'log', destinations: [] });
	});

	it('collapses read-only built-in default blocked ranges by default', async () => {
		getPolicyMock.mockResolvedValue(makePolicy());

		renderComponent();

		// The collapsed summary is shown, but the individual baseline ranges are not.
		await screen.findByTestId('egress-baseline-toggle-blockedIpRanges');
		expect(screen.queryByText('10.0.0.0/8')).not.toBeInTheDocument();

		// Expanding reveals them.
		await userEvent.click(screen.getByTestId('egress-baseline-toggle-blockedIpRanges'));
		expect(screen.getByText('10.0.0.0/8')).toBeInTheDocument();
	});

	it('auto-saves a mode change and surfaces a save status, with no manual Save bar', async () => {
		getPolicyMock.mockResolvedValue(makePolicy({ mode: 'log' }));
		updatePolicyMock.mockResolvedValue(makePolicy({ mode: 'enforce' }));

		renderComponent();
		await screen.findByTestId('egress-mode-select');

		// The Save/Discard footer is gone — changes persist as they are made.
		expect(screen.queryByTestId('egress-footer')).not.toBeInTheDocument();
		expect(screen.queryByTestId('egress-save-button')).not.toBeInTheDocument();

		const store = useEgressProtectionStore();
		await store.updateMode('enforce');

		expect(updatePolicyMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ mode: 'enforce' }),
		);
		await waitFor(() => expect(screen.getByTestId('egress-save-status')).toBeInTheDocument());
	});

	it('auto-saves when an entry is added through the UI', async () => {
		getPolicyMock.mockResolvedValue(makePolicy());
		updatePolicyMock.mockResolvedValue(makePolicy({ allowedHostnames: ['api.example.com'] }));

		renderComponent();
		const input = await screen.findByTestId('egress-input-allowedHostnames');

		await userEvent.type(input, 'api.example.com');
		await userEvent.click(screen.getByTestId('egress-add-allowedHostnames'));

		expect(updatePolicyMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ allowedHostnames: ['api.example.com'] }),
		);
	});
});
