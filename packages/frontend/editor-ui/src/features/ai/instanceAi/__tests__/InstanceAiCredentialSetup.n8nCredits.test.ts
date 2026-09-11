import { ref, computed } from 'vue';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { ICredentialType } from 'n8n-workflow';
import type { InstanceAiCredentialRequest } from '@n8n/api-types';

import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import InstanceAiCredentialSetup from '../components/InstanceAiCredentialSetup.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { AI_GATEWAY_MANAGED_TAG } from '../constants';

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

// Give the select a stable label.
vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) => {
			if (key === 'aiGateway.credentialMode.n8nConnect.title') return 'n8n credits';
			if (opts?.interpolate) {
				return Object.entries(opts.interpolate).reduce(
					(str, [k, v]) => str.replace(`{${k}}`, v),
					key,
				);
			}
			return key;
		},
	}),
}));

// Enable the n8n credits option.
vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: vi.fn(() => ({
		isEnabled: ref(true),
		isCredentialTypeSupported: vi.fn((t: string) => t === 'openAiApi'),
		canServeCredentialType: vi.fn((t: string) => t === 'openAiApi'),
		isNodeTypeVersionSupported: vi.fn(() => true),
		isActionSupported: vi.fn(() => true),
		isActionOptionVisible: vi.fn(() => true),
		isNodePropertyHidden: vi.fn(() => false),
		balance: computed(() => 5),
		budget: computed(() => undefined),
		creditsLabelKey: computed(() => 'generic.n8nCredits'),
		fetchConfig: vi.fn().mockResolvedValue(undefined),
		fetchWallet: vi.fn().mockResolvedValue(undefined),
		saveAfterToggle: vi.fn().mockResolvedValue(undefined),
		fetchError: computed(() => null),
	})),
}));

const openAiApiCredType: ICredentialType = {
	name: 'openAiApi',
	displayName: 'OpenAI',
	properties: [{ displayName: 'API Key', name: 'apiKey', type: 'string', default: '' }],
};

const existingCred = {
	id: 'cred-1',
	name: 'OpenAI account',
	type: 'openAiApi',
	isManaged: false,
	createdAt: '2024-01-01',
	updatedAt: '2024-01-01',
} as ICredentialsResponse;

const existingCred2 = {
	...existingCred,
	id: 'cred-2',
	name: 'OpenAI account 2',
} as ICredentialsResponse;
const usableCreds = [existingCred, existingCred2];

const renderComponent = createThreadComponentRenderer(InstanceAiCredentialSetup);

function makeRequest(): InstanceAiCredentialRequest[] {
	// Two credentials prevent auto-selection on init.
	return [
		{
			credentialType: 'openAiApi',
			reason: 'Enter a valid OpenAI API key',
			existingCredentials: usableCreds,
		},
	];
}

describe('InstanceAiCredentialSetup - with real NodeCredentials', () => {
	let thread: ThreadRuntime;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		const store = useInstanceAiStore();
		thread = store.getOrCreateRuntime('thread-1');

		const credentialsStore = useCredentialsStore();
		credentialsStore.state.credentialTypes = { openAiApi: openAiApiCredType };
		credentialsStore.state.credentials = { 'cred-1': existingCred, 'cred-2': existingCred2 };
		// The store getter cannot be spied on or assigned directly.
		Object.defineProperty(credentialsStore, 'getCredentialById', {
			configurable: true,
			get: () => (id: string) => (id === 'cred-2' ? existingCred2 : existingCred),
		});
		vi.spyOn(credentialsStore, 'fetchAllCredentials').mockResolvedValue([]);
		vi.spyOn(credentialsStore, 'fetchUsableCredentials').mockResolvedValue([]);
		vi.spyOn(credentialsStore, 'fetchCredentialTypes').mockResolvedValue(undefined);
		Object.defineProperty(credentialsStore, 'getUsableCredentialByType', {
			configurable: true,
			get: () => (type: string) => (type === 'openAiApi' ? usableCreds : []),
		});
		Object.defineProperty(credentialsStore, 'allUsableCredentialsByType', {
			configurable: true,
			get: () => ({ openAiApi: usableCreds }),
		});
		Object.defineProperty(credentialsStore, 'hasFetchedUsableCredentials', {
			configurable: true,
			get: () => true,
		});
	});

	it('registers n8n credits selection and submits the managed tag', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

		renderComponent({
			props: {
				requestId: 'req-1',
				credentialRequests: makeRequest(),
				message: 'Set up credentials',
				requireUserSelection: true,
			},
		});

		const continueBtn = screen.getByTestId('instance-ai-credential-continue-button');
		const select = screen.getByTestId('node-credentials-select');

		await userEvent.click(select);
		const creditsOption = await screen.findByTestId('node-credentials-select-item-n8n-credits');
		await userEvent.click(creditsOption);

		// The wallet icon shows the managed selection.
		expect(select.querySelector('[data-icon="wallet"]')).not.toBeNull();

		expect(continueBtn).not.toBeDisabled();
		await userEvent.click(continueBtn);
		expect(confirmSpy).toHaveBeenCalledWith('req-1', {
			kind: 'credentialSelection',
			credentials: { openAiApi: AI_GATEWAY_MANAGED_TAG },
		});
	});

	// The picker renders from the payload before the setup fetch has
	// filled the store (or after it failed). Picking a row must resolve the
	// credential from the rows shown, not from a store that does not hold it.
	it('lets the user pick a payload credential the store has not loaded', async () => {
		const credentialsStore = useCredentialsStore();
		credentialsStore.state.credentials = {};
		Object.defineProperty(credentialsStore, 'getCredentialById', {
			configurable: true,
			get: () => () => undefined,
		});
		Object.defineProperty(credentialsStore, 'getUsableCredentialByType', {
			configurable: true,
			get: () => () => [],
		});
		Object.defineProperty(credentialsStore, 'allUsableCredentialsByType', {
			configurable: true,
			get: () => ({}),
		});
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

		renderComponent({
			props: {
				requestId: 'req-1',
				credentialRequests: makeRequest(),
				message: 'Set up credentials',
				requireUserSelection: true,
			},
		});

		const select = screen.getByTestId('node-credentials-select');
		// Real credentials are listed, so the empty-slice path must not have
		// auto-enabled n8n credits behind the user's back.
		expect(select.querySelector('[data-icon="wallet"]')).toBeNull();

		await userEvent.click(select);
		await userEvent.click(await screen.findByTestId('node-credentials-select-item-cred-1'));
		await userEvent.click(screen.getByTestId('instance-ai-credential-continue-button'));

		expect(confirmSpy).toHaveBeenCalledWith('req-1', {
			kind: 'credentialSelection',
			credentials: { openAiApi: 'cred-1' },
		});
	});

	it('auto-selects from the payload before the usable slice has been fetched', async () => {
		const credentialsStore = useCredentialsStore();
		Object.defineProperty(credentialsStore, 'hasFetchedUsableCredentials', {
			configurable: true,
			get: () => false,
		});
		Object.defineProperty(credentialsStore, 'allUsableCredentialsByType', {
			configurable: true,
			get: () => ({}),
		});

		renderComponent({
			props: {
				requestId: 'req-1',
				credentialRequests: [
					{
						credentialType: 'openAiApi',
						reason: 'Enter a valid OpenAI API key',
						existingCredentials: [
							{ id: 'cred-1', name: 'OpenAI account' },
							{ id: 'cred-2', name: 'OpenAI account 2' },
						],
					},
				],
				message: 'Set up credentials',
				requireUserSelection: true,
			},
		});

		// The payload is the whole list; waiting for the slice fetch would leave a
		// multi-credential card unselected until unrelated store activity re-fired.
		await vi.waitFor(() => {
			expect(screen.getByTestId('instance-ai-credential-step-check')).toBeTruthy();
		});
		expect(
			screen.getByTestId('node-credentials-select').querySelector('[data-icon="wallet"]'),
		).toBeNull();
	});

	it('falls back to the store slice when the payload lists no credentials', async () => {
		renderComponent({
			props: {
				requestId: 'req-1',
				credentialRequests: [
					{
						credentialType: 'openAiApi',
						reason: 'Enter a valid OpenAI API key',
						existingCredentials: [],
					},
				],
				message: 'Set up credentials',
				requireUserSelection: true,
			},
		});

		// The card gated on the slice, so the picker must read the slice too —
		// an empty override would render NodeCredentials' empty state instead.
		expect(screen.queryByTestId('node-credentials-empty-state')).toBeNull();
		await userEvent.click(screen.getByTestId('node-credentials-select'));
		expect(await screen.findByTestId('node-credentials-select-item-cred-1')).toBeTruthy();
		expect(screen.getByTestId('node-credentials-select-item-cred-2')).toBeTruthy();
	});
});
