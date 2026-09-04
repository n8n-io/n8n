import { createComponentRenderer, mockedStore } from '@n8n/frontend-test-utils';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';

import type { OtelSettingsResponse } from './otel.api';
import { useOtelStore } from './otel.store';
import SettingsOpenTelemetryView from './SettingsOpenTelemetryView.vue';

const showMessage = vi.fn();
const showError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

const telemetryTrack = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

let capturedRouteLeaveGuard:
	| Parameters<typeof import('vue-router')['onBeforeRouteLeave']>[0]
	| null = null;
vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<typeof import('vue-router')>();
	return {
		...actual,
		onBeforeRouteLeave: (guard: typeof capturedRouteLeaveGuard) => {
			capturedRouteLeaveGuard = guard;
		},
	};
});

// Typed, so the factory below returns `Promise<unknown>` rather than the `any` a bare
// `vi.fn()` yields — the module package lints `no-unsafe-return` at error level.
type ApiMock = (...args: unknown[]) => Promise<unknown>;

const getOtelSettingsMock = vi.fn<ApiMock>();
const updateOtelSettingsMock = vi.fn<ApiMock>();
const sendOtelTestTraceMock = vi.fn<ApiMock>();

vi.mock('./otel.api', () => ({
	getOtelSettings: async (...args: unknown[]) => await getOtelSettingsMock(...args),
	updateOtelSettings: async (...args: unknown[]) => await updateOtelSettingsMock(...args),
	sendOtelTestTrace: async (...args: unknown[]) => await sendOtelTestTraceMock(...args),
}));

const makeSettings = (overrides: Partial<OtelSettingsResponse> = {}): OtelSettingsResponse => ({
	enabled: false,
	exporterProtocol: 'http/protobuf',
	exporterEndpoint: 'http://localhost:4318',
	exporterTracingPath: '/v1/traces',
	exporterServiceName: 'n8n',
	exporterHeaders: '',
	tracesSampleRate: 1.0,
	startupConnectivityTimeoutMs: 2000,
	includeNodeSpans: true,
	injectOutbound: true,
	productionExecutionsOnly: true,
	envManagedFields: [],
	...overrides,
});

const render = (options = {}) => {
	const pinia = createTestingPinia({ stubActions: false });
	return {
		pinia,
		store: mockedStore(useOtelStore, pinia),
		...createComponentRenderer(SettingsOpenTelemetryView, { pinia })(options),
	};
};

const dirtyEndpoint = async (getByTestId: ReturnType<typeof render>['getByTestId']) => {
	const input = getByTestId('otel-exporter-endpoint');
	await userEvent.type(input, 'x');
};

/** Unit inputs (timeout, sample rate) format on blur, so type then tab away to commit. */
const typeIntoUnitInput = async (input: HTMLElement, value: string) => {
	await userEvent.clear(input);
	await userEvent.type(input, value);
	await userEvent.tab();
};

const selectProtocol = async (optionLabel: string) => {
	const select = screen.getByTestId('otel-exporter-protocol');
	await userEvent.click(select.querySelector('input')!);
	await userEvent.click(await screen.findByText(optionLabel));
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe('SettingsOpenTelemetryView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedRouteLeaveGuard = null;
		getOtelSettingsMock.mockResolvedValue(makeSettings());
		updateOtelSettingsMock.mockResolvedValue(makeSettings());
		sendOtelTestTraceMock.mockResolvedValue({ success: true });
	});

	// ── initial render ────────────────────────────────────────────────────────

	it('shows a loading spinner while fetching', () => {
		getOtelSettingsMock.mockReturnValue(new Promise(() => {}));

		const { getByTestId, queryByTestId } = render();
		expect(getByTestId('otel-loading')).toBeInTheDocument();
		expect(queryByTestId('otel-exporter-endpoint')).not.toBeInTheDocument();
	});

	it('renders all settings fields after fetch completes', async () => {
		const { getByTestId } = render();

		await waitFor(() => {
			expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument();
		});

		expect(getByTestId('otel-exporter-protocol')).toBeInTheDocument();
		expect(getByTestId('otel-service-name')).toBeInTheDocument();
		expect(getByTestId('otel-tracing-path')).toBeInTheDocument();
		expect(getByTestId('otel-sample-rate')).toBeInTheDocument();
		expect(getByTestId('otel-include-node-spans')).toBeInTheDocument();
		expect(getByTestId('otel-inject-outbound')).toBeInTheDocument();
		expect(getByTestId('otel-production-only')).toBeInTheDocument();
	});

	it('hides the save bar when settings are unchanged', async () => {
		const { queryByTestId } = render();

		await waitFor(() => {
			expect(getOtelSettingsMock).toHaveBeenCalled();
			expect(queryByTestId('settings-save-bar')).not.toBeInTheDocument();
		});
	});

	// ── dirty state ───────────────────────────────────────────────────────────

	it('enables save and discard buttons after typing in the endpoint field', async () => {
		const { getByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument());

		await dirtyEndpoint(getByTestId);

		await waitFor(() => {
			expect(getByTestId('settings-save-bar-save')).not.toBeDisabled();
			expect(getByTestId('settings-save-bar-discard')).not.toBeDisabled();
		});
	});

	// ── status control (instant enable/disable) ───────────────────────────────

	it('enables OpenTelemetry immediately when clicking Enable, without the save bar', async () => {
		getOtelSettingsMock.mockResolvedValue(makeSettings({ enabled: false }));
		updateOtelSettingsMock.mockResolvedValue(makeSettings({ enabled: true }));

		const { getByTestId, queryByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-enabled-toggle')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-enabled-toggle'));

		await waitFor(() => {
			expect(updateOtelSettingsMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ enabled: true }),
			);
			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
		expect(queryByTestId('settings-save-bar')).not.toBeInTheDocument();
	});

	it('commits pending form edits when enabling', async () => {
		getOtelSettingsMock.mockResolvedValue(makeSettings({ enabled: false }));
		updateOtelSettingsMock.mockResolvedValue(
			makeSettings({ enabled: true, exporterEndpoint: 'http://localhost:4318x' }),
		);

		const { getByTestId, queryByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument());

		await dirtyEndpoint(getByTestId);
		await waitFor(() => expect(getByTestId('settings-save-bar')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-enabled-toggle'));

		await waitFor(() => {
			expect(updateOtelSettingsMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ enabled: true, exporterEndpoint: 'http://localhost:4318x' }),
			);
			expect(queryByTestId('settings-save-bar')).not.toBeInTheDocument();
		});
	});

	it('rolls the status back when enabling fails', async () => {
		getOtelSettingsMock.mockResolvedValue(makeSettings({ enabled: false }));
		updateOtelSettingsMock.mockRejectedValue(new Error('network error'));

		const { getByTestId, store } = render();
		await waitFor(() => expect(getByTestId('otel-enabled-toggle')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-enabled-toggle'));

		await waitFor(() => {
			expect(showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
			expect(store.settings.enabled).toBe(false);
		});
	});

	it('shows save button after toggling includeNodeSpans checkbox', async () => {
		const { getByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-include-node-spans')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-include-node-spans'));

		await waitFor(() => expect(getByTestId('settings-save-bar-save')).toBeInTheDocument());
	});

	it('shows save button after toggling injectOutbound checkbox', async () => {
		const { getByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-inject-outbound')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-inject-outbound'));

		await waitFor(() => expect(getByTestId('settings-save-bar-save')).toBeInTheDocument());
	});

	it('shows save button after toggling productionExecutionsOnly checkbox', async () => {
		const { getByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-production-only')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-production-only'));

		await waitFor(() => expect(getByTestId('settings-save-bar-save')).toBeInTheDocument());
	});

	// ── save ──────────────────────────────────────────────────────────────────

	it('calls updateOtelSettings and shows success toast when saving', async () => {
		updateOtelSettingsMock.mockResolvedValue(makeSettings());

		const { getByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument());

		await dirtyEndpoint(getByTestId);
		await waitFor(() => expect(getByTestId('settings-save-bar-save')).toBeInTheDocument());
		await userEvent.click(getByTestId('settings-save-bar-save'));

		await waitFor(() => {
			expect(updateOtelSettingsMock).toHaveBeenCalled();
			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
	});

	it('tracks "Activated otel via UI" with props when enabled changes false → true', async () => {
		getOtelSettingsMock.mockResolvedValue(makeSettings({ enabled: false }));
		updateOtelSettingsMock.mockResolvedValue(
			makeSettings({ enabled: true, tracesSampleRate: 0.5 }),
		);

		const { getByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-enabled-toggle')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-enabled-toggle'));

		await waitFor(() => {
			expect(telemetryTrack).toHaveBeenCalledWith(
				'Activated otel via UI',
				expect.objectContaining({ tracesSampleRate: 0.5 }),
			);
		});
	});

	it('tracks "Disabled otel via UI" without props when enabled changes true → false', async () => {
		getOtelSettingsMock.mockResolvedValue(makeSettings({ enabled: true }));
		updateOtelSettingsMock.mockResolvedValue(makeSettings({ enabled: false }));

		const { getByTestId, getByText } = render();
		await waitFor(() => expect(getByTestId('otel-enabled-toggle')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-enabled-toggle'));
		await waitFor(() => expect(getByText('Disable')).toBeInTheDocument());
		await userEvent.click(getByText('Disable'));

		await waitFor(() => {
			expect(telemetryTrack).toHaveBeenCalledWith('Disabled otel via UI');
			expect(telemetryTrack).not.toHaveBeenCalledWith('Activated otel via UI', expect.anything());
		});
	});

	it('tracks "Updated otel via UI" with props when enabled state does not change', async () => {
		getOtelSettingsMock.mockResolvedValue(makeSettings({ enabled: true }));
		updateOtelSettingsMock.mockResolvedValue(
			makeSettings({ enabled: true, tracesSampleRate: 0.5 }),
		);

		const { getByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument());

		await dirtyEndpoint(getByTestId);
		await waitFor(() => expect(getByTestId('settings-save-bar-save')).toBeInTheDocument());
		await userEvent.click(getByTestId('settings-save-bar-save'));

		await waitFor(() => {
			expect(telemetryTrack).toHaveBeenCalledWith(
				'Updated otel via UI',
				expect.objectContaining({
					enabled: true,
					tracesSampleRate: 0.5,
					protocol: 'http/protobuf',
				}),
			);
			expect(telemetryTrack).not.toHaveBeenCalledWith('Activated otel via UI', expect.anything());
			expect(telemetryTrack).not.toHaveBeenCalledWith('Disabled otel via UI');
		});
	});

	it('shows error toast when save fails', async () => {
		updateOtelSettingsMock.mockRejectedValue(new Error('network error'));

		const { getByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument());

		await dirtyEndpoint(getByTestId);
		await waitFor(() => expect(getByTestId('settings-save-bar-save')).toBeInTheDocument());
		await userEvent.click(getByTestId('settings-save-bar-save'));

		await waitFor(() => {
			expect(showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		});
	});

	// ── discard ───────────────────────────────────────────────────────────────

	it('discards changes and disables save/discard buttons when clicking Discard', async () => {
		const { getByTestId, queryByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument());

		await dirtyEndpoint(getByTestId);
		await waitFor(() => expect(getByTestId('settings-save-bar-save')).not.toBeDisabled());
		await userEvent.click(getByTestId('settings-save-bar-discard'));

		await waitFor(() => {
			expect(queryByTestId('settings-save-bar')).not.toBeInTheDocument();
		});
		expect(updateOtelSettingsMock).not.toHaveBeenCalled();
	});

	// ── headers ───────────────────────────────────────────────────────────────

	it('adds a header row when clicking Add header', async () => {
		const { getByTestId, getAllByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-header-add')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-header-add'));

		await waitFor(() => {
			expect(getAllByTestId('otel-header-key').length).toBe(1);
		});
	});

	it('removes a header row when clicking the trash button', async () => {
		const { getByTestId, queryAllByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-header-add')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-header-add'));
		await waitFor(() => expect(getByTestId('otel-header-remove')).toBeInTheDocument());
		await userEvent.click(getByTestId('otel-header-remove'));

		await waitFor(() => {
			expect(queryAllByTestId('otel-header-key').length).toBe(0);
		});
	});

	it('updates exporterHeaders in the store when typing a header key', async () => {
		const { getByTestId, store } = render();
		await waitFor(() => expect(getByTestId('otel-header-add')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-header-add'));
		await waitFor(() => expect(getByTestId('otel-header-key')).toBeInTheDocument());

		const keyInput =
			getByTestId('otel-header-key').querySelector('input') ?? getByTestId('otel-header-key');
		await userEvent.type(keyInput, 'x-api-key');

		await waitFor(() => {
			expect(store.settings.exporterHeaders).toContain('x-api-key');
		});
	});

	it('sends correct payload when user fills in all fields and saves', async () => {
		getOtelSettingsMock.mockResolvedValue(
			makeSettings({
				enabled: false,
				exporterEndpoint: '',
				exporterServiceName: '',
				exporterTracingPath: '',
				exporterHeaders: '',
				startupConnectivityTimeoutMs: 0,
				tracesSampleRate: 0,
				includeNodeSpans: false,
				injectOutbound: false,
				productionExecutionsOnly: false,
			}),
		);
		updateOtelSettingsMock.mockResolvedValue(makeSettings());

		const { getByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument());

		// Endpoint
		await userEvent.type(getByTestId('otel-exporter-endpoint'), 'https://collector.example.com');

		// Service name
		await userEvent.type(getByTestId('otel-service-name'), 'my-n8n');

		// Tracing path
		await userEvent.clear(getByTestId('otel-tracing-path'));
		await userEvent.type(getByTestId('otel-tracing-path'), '/custom/traces');

		// Connectivity timeout
		await typeIntoUnitInput(getByTestId('otel-connectivity-timeout'), '5000');

		// Sample rate
		await typeIntoUnitInput(getByTestId('otel-sample-rate'), '0.5');

		// Add a header
		await userEvent.click(getByTestId('otel-header-add'));
		await waitFor(() => expect(getByTestId('otel-header-key')).toBeInTheDocument());
		const keyInput =
			getByTestId('otel-header-key').querySelector('input') ?? getByTestId('otel-header-key');
		const valueInput =
			getByTestId('otel-header-value').querySelector('input') ?? getByTestId('otel-header-value');
		await userEvent.type(keyInput, 'x-api-key');
		await userEvent.type(valueInput, 'secret');

		// Checkboxes
		await userEvent.click(getByTestId('otel-include-node-spans'));
		await userEvent.click(getByTestId('otel-inject-outbound'));
		await userEvent.click(getByTestId('otel-production-only'));

		// Save
		await waitFor(() => expect(getByTestId('settings-save-bar-save')).toBeInTheDocument());
		await userEvent.click(getByTestId('settings-save-bar-save'));

		await waitFor(() => {
			expect(updateOtelSettingsMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					exporterEndpoint: 'https://collector.example.com',
					exporterServiceName: 'my-n8n',
					exporterTracingPath: '/custom/traces',
					exporterHeaders: 'x-api-key=secret',
					startupConnectivityTimeoutMs: 5000,
					tracesSampleRate: 0.5,
					includeNodeSpans: true,
					injectOutbound: true,
					productionExecutionsOnly: true,
				}),
			);
		});
	});

	it('pre-populates header rows from exporterHeaders string on load', async () => {
		getOtelSettingsMock.mockResolvedValue(makeSettings({ exporterHeaders: 'auth=token,x-id=42' }));

		const { getAllByTestId } = render();

		await waitFor(() => {
			expect(getAllByTestId('otel-header-key').length).toBe(2);
		});
	});

	// ── exporter protocol ─────────────────────────────────────────────────────

	it('shows the saved protocol in the select', async () => {
		getOtelSettingsMock.mockResolvedValue(makeSettings({ exporterProtocol: 'grpc' }));

		const { getByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-protocol')).toBeInTheDocument());

		const input = getByTestId('otel-exporter-protocol').querySelector('input');
		expect(input).toHaveValue('gRPC');
		expect(input).toHaveAttribute('aria-label', 'Protocol');
	});

	it('hides the trace path row and shows gRPC endpoint copy when the protocol is gRPC', async () => {
		getOtelSettingsMock.mockResolvedValue(makeSettings({ exporterProtocol: 'grpc' }));

		const { getByTestId, queryByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument());

		expect(queryByTestId('otel-tracing-path')).not.toBeInTheDocument();
		expect(getByTestId('otel-exporter-endpoint')).toHaveAttribute(
			'placeholder',
			'http://collector.example.com:4317',
		);
	});

	it('hides the trace path row after switching the protocol to gRPC', async () => {
		const { getByTestId, queryByTestId, store } = render();
		await waitFor(() => expect(getByTestId('otel-tracing-path')).toBeInTheDocument());

		await selectProtocol('gRPC');

		await waitFor(() => {
			expect(store.settings.exporterProtocol).toBe('grpc');
			expect(queryByTestId('otel-tracing-path')).not.toBeInTheDocument();
		});
	});

	it('keeps the trace path across a switch to gRPC and back', async () => {
		getOtelSettingsMock.mockResolvedValue(makeSettings({ exporterTracingPath: '/custom/traces' }));

		const { getByTestId, queryByTestId, store } = render();
		await waitFor(() => expect(getByTestId('otel-tracing-path')).toBeInTheDocument());

		await selectProtocol('gRPC');
		await waitFor(() => expect(queryByTestId('otel-tracing-path')).not.toBeInTheDocument());

		await selectProtocol('HTTP (protobuf)');

		await waitFor(() => expect(getByTestId('otel-tracing-path')).toBeInTheDocument());
		expect(getByTestId('otel-tracing-path')).toHaveValue('/custom/traces');
		expect(store.settings.exporterTracingPath).toBe('/custom/traces');
	});

	it('saves the protocol picked in the select', async () => {
		const { getByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-protocol')).toBeInTheDocument());

		await selectProtocol('gRPC');

		await waitFor(() => expect(getByTestId('settings-save-bar-save')).toBeInTheDocument());
		await userEvent.click(getByTestId('settings-save-bar-save'));

		await waitFor(() => {
			expect(updateOtelSettingsMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ exporterProtocol: 'grpc' }),
			);
		});
	});

	it('disables the protocol select when it is managed by an env var', async () => {
		getOtelSettingsMock.mockResolvedValue(makeSettings({ envManagedFields: ['exporterProtocol'] }));

		const { getByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-protocol')).toBeInTheDocument());

		expect(getByTestId('otel-exporter-protocol').querySelector('input')).toBeDisabled();
	});

	it('invalidates a previous test result when the protocol changes', async () => {
		const { getByTestId, getByText, queryByText } = render();
		await waitFor(() => expect(getByTestId('otel-test-trace-button')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-test-trace-button'));
		await waitFor(() => expect(getByText(/span sent to collector at/)).toBeInTheDocument());

		await selectProtocol('gRPC');

		await waitFor(() => {
			expect(queryByText(/span sent to collector at/)).not.toBeInTheDocument();
		});
	});

	// ── test trace ────────────────────────────────────────────────────────────

	it('renders the test trace button after fetch', async () => {
		const { getByTestId } = render();

		await waitFor(() => {
			expect(getByTestId('otel-test-trace-button')).toBeInTheDocument();
		});
	});

	it('sends a test trace and shows the success result when clicking the button', async () => {
		const { getByTestId, getByText } = render();
		await waitFor(() => expect(getByTestId('otel-test-trace-button')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-test-trace-button'));

		await waitFor(() => {
			expect(sendOtelTestTraceMock).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ exporterEndpoint: 'http://localhost:4318' }),
			);
			expect(getByText(/span sent to collector at/)).toBeInTheDocument();
		});
	});

	it('surfaces the collector error when the test trace fails', async () => {
		sendOtelTestTraceMock.mockResolvedValue({ success: false, error: '401 Unauthorized' });

		const { getByTestId, getByText } = render();
		await waitFor(() => expect(getByTestId('otel-test-trace-button')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-test-trace-button'));

		await waitFor(() => {
			expect(getByText(/401 Unauthorized/)).toBeInTheDocument();
			expect(getByTestId('otel-settings-row-error')).toHaveTextContent('401 Unauthorized');
		});
	});

	it('disables the test trace button when the endpoint is empty', async () => {
		getOtelSettingsMock.mockResolvedValue(makeSettings({ exporterEndpoint: '' }));

		const { getByTestId } = render();

		await waitFor(() => {
			expect(getByTestId('otel-test-trace-button')).toBeDisabled();
		});
	});

	it('invalidates a previous test result when a connection field changes', async () => {
		const { getByTestId, getByText, queryByText } = render();
		await waitFor(() => expect(getByTestId('otel-test-trace-button')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-test-trace-button'));
		await waitFor(() => expect(getByText(/span sent to collector at/)).toBeInTheDocument());

		await userEvent.type(getByTestId('otel-service-name'), 'x');

		await waitFor(() => {
			expect(queryByText(/span sent to collector at/)).not.toBeInTheDocument();
		});
	});

	it('invalidates a previous test result when the connectivity timeout changes', async () => {
		const { getByTestId, getByText, queryByText } = render();
		await waitFor(() => expect(getByTestId('otel-test-trace-button')).toBeInTheDocument());

		await userEvent.click(getByTestId('otel-test-trace-button'));
		await waitFor(() => expect(getByText(/span sent to collector at/)).toBeInTheDocument());

		await typeIntoUnitInput(getByTestId('otel-connectivity-timeout'), '5000');

		await waitFor(() => {
			expect(queryByText(/span sent to collector at/)).not.toBeInTheDocument();
		});
	});

	// ── unsaved changes dialog ────────────────────────────────────────────────

	it('shows unsaved changes dialog when navigating away with dirty form', async () => {
		const { getByTestId } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument());

		await dirtyEndpoint(getByTestId);

		const next = vi.fn();
		capturedRouteLeaveGuard!({} as never, {} as never, next);

		await waitFor(() => {
			expect(getByTestId('otel-unsaved-changes-dialog')).toBeInTheDocument();
		});
		expect(next).not.toHaveBeenCalled();
	});

	it('does not show the dialog when navigating away with clean form', async () => {
		const { queryByTestId } = render();
		await waitFor(() => expect(getOtelSettingsMock).toHaveBeenCalled());

		const next = vi.fn();
		capturedRouteLeaveGuard!({} as never, {} as never, next);

		expect(next).toHaveBeenCalledWith();
		expect(queryByTestId('otel-unsaved-changes-dialog')).not.toBeInTheDocument();
	});

	it('calls next(false) when clicking Cancel in the dialog', async () => {
		const { getByTestId, getByText } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument());

		await dirtyEndpoint(getByTestId);

		const next = vi.fn();
		capturedRouteLeaveGuard!({} as never, {} as never, next);
		await waitFor(() => expect(getByTestId('otel-unsaved-changes-dialog')).toBeInTheDocument());

		await userEvent.click(getByText('Cancel'));

		await waitFor(() => {
			expect(next).toHaveBeenCalledWith(false);
		});
	});

	it('calls next() without saving when clicking Leave without saving', async () => {
		const { getByTestId, getByText } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument());

		await dirtyEndpoint(getByTestId);

		const next = vi.fn();
		capturedRouteLeaveGuard!({} as never, {} as never, next);
		await waitFor(() => expect(getByTestId('otel-unsaved-changes-dialog')).toBeInTheDocument());

		await userEvent.click(getByText('Leave without saving'));

		await waitFor(() => {
			expect(next).toHaveBeenCalledWith();
			expect(updateOtelSettingsMock).not.toHaveBeenCalled();
		});
	});

	it('saves and calls next() when clicking Save and leave', async () => {
		updateOtelSettingsMock.mockResolvedValue(makeSettings());

		const { getByTestId, getByText } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument());

		await dirtyEndpoint(getByTestId);

		const next = vi.fn();
		capturedRouteLeaveGuard!({} as never, {} as never, next);
		await waitFor(() => expect(getByTestId('otel-unsaved-changes-dialog')).toBeInTheDocument());

		await userEvent.click(getByText('Save and leave'));

		await waitFor(() => {
			expect(updateOtelSettingsMock).toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith();
		});
	});

	it('does not navigate away when Save and leave fails', async () => {
		updateOtelSettingsMock.mockRejectedValue(new Error('network error'));

		const { getByTestId, getByText } = render();
		await waitFor(() => expect(getByTestId('otel-exporter-endpoint')).toBeInTheDocument());

		await dirtyEndpoint(getByTestId);

		const next = vi.fn();
		capturedRouteLeaveGuard!({} as never, {} as never, next);
		await waitFor(() => expect(getByTestId('otel-unsaved-changes-dialog')).toBeInTheDocument());

		await userEvent.click(getByText('Save and leave'));

		await waitFor(() => {
			expect(showError).toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
		});
	});
});
