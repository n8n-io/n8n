import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import InstanceAiChannelSetup from '../components/InstanceAiChannelSetup.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';

const mocks = vi.hoisted(() => {
	const slackIntegration = {
		type: 'slack',
		label: 'Slack',
		icon: 'slack',
		credentialTypes: ['slackOAuth2Api'],
	};

	return {
		slackIntegration,
		ensureLoaded: vi.fn(),
		fetchStatus: vi.fn(),
		connect: vi.fn(),
		createSlackAgentApp: vi.fn(),
	};
});

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) => {
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

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: {},
	}),
}));

vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: () => ({
		credential: {
			create: true,
			read: true,
			update: true,
			delete: true,
			share: true,
			move: true,
		},
	}),
}));

vi.mock('@/features/agents/composables/useAgentIntegrationsCatalog', async () => {
	const { ref } = await import('vue');

	return {
		useAgentIntegrationsCatalog: () => ({
			catalog: ref([mocks.slackIntegration]),
			ensureLoaded: mocks.ensureLoaded,
		}),
	};
});

vi.mock('@/features/agents/composables/useAgentIntegrationStatus', async () => {
	const { ref } = await import('vue');

	return {
		useAgentIntegrationStatus: () => ({
			connectedCredentials: ref<Record<string, string>>({}),
			integrationSettings: ref({}),
			loadingMap: ref<Record<string, boolean>>({}),
			errorMessages: ref<Record<string, string>>({}),
			errorIsConflict: ref<Record<string, boolean>>({}),
			fetchStatus: mocks.fetchStatus,
			connect: mocks.connect,
			isConnected: () => false,
		}),
	};
});

vi.mock('@/features/agents/composables/useAgentApi', () => ({
	createSlackAgentApp: mocks.createSlackAgentApp,
	getAgent: vi.fn(),
}));

vi.mock('@/features/agents/components/AgentChannelModal.vue', () => ({
	default: {
		template: '<div data-test-id="agent-channel-modal" />',
	},
}));

vi.mock('@/features/agents/components/AgentChannelSlackSetup.vue', async () => {
	const { ref } = await import('vue');

	return {
		default: {
			props: [
				'modelValue',
				'mode',
				'connected',
				'isPublished',
				'setupSlackApp',
				'projectId',
				'agentId',
				'integration',
				'credentials',
				'credentialPermissions',
				'credentialsLoading',
				'loading',
				'errorMessage',
				'errorIsConflict',
				'forceNewCredential',
				'setupMode',
			],
			emits: ['update:modelValue', 'connect', 'create', 'edit'],
			setup(props: { setupSlackApp?: (appConfigurationToken: string) => Promise<boolean> }) {
				const setupStatus = ref('idle');
				const runSlackAppSetup = async () => {
					setupStatus.value = 'loading';
					try {
						await props.setupSlackApp?.('app-token');
						setupStatus.value = 'connected';
					} catch {
						setupStatus.value = 'error';
					}
				};

				return { setupStatus, runSlackAppSetup };
			},
			template: `
			<div data-test-id="mock-slack-setup" :data-setup-mode="setupMode">
				<button
					data-test-id="mock-slack-connect"
					@click="$emit('update:modelValue', 'cred-1'); $emit('connect')"
				>
					Connect Slack
				</button>
				<button
					data-test-id="mock-slack-connect-twice"
					@click="$emit('update:modelValue', 'cred-1'); $emit('connect'); $emit('connect')"
				>
					Connect Slack Twice
				</button>
				<button
					data-test-id="mock-slack-app-setup"
					@click="runSlackAppSetup"
				>
					Install Slack app
				</button>
				<span data-test-id="mock-slack-app-setup-status">{{ setupStatus }}</span>
			</div>
		`,
		},
	};
});

const renderComponent = createThreadComponentRenderer(InstanceAiChannelSetup);

const defaultProps = {
	requestId: 'req-channel',
	integrationType: 'slack',
	agentId: 'agent-1',
	projectId: 'project-1',
};

describe('InstanceAiChannelSetup', () => {
	let thread: ThreadRuntime;

	beforeEach(() => {
		vi.clearAllMocks();
		mocks.ensureLoaded.mockResolvedValue([mocks.slackIntegration]);
		mocks.fetchStatus.mockResolvedValue(undefined);
		mocks.connect.mockResolvedValue({ status: 'connected' });
		mocks.createSlackAgentApp.mockResolvedValue({
			installUrl: 'https://slack.com/oauth/install',
		});

		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		thread = useInstanceAiStore().getOrCreateRuntime('thread-1');
		thread.messages = [];
		thread.resolvedConfirmationIds.clear();
	});

	it('renders Slack setup inline and resumes the confirmation when connected', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

		const { getByTestId, queryByTestId } = renderComponent({
			props: defaultProps,
		});

		expect(getByTestId('instance-ai-channel-setup')).toBeInTheDocument();
		expect(getByTestId('mock-slack-setup')).toHaveAttribute('data-setup-mode', 'simple');
		expect(queryByTestId('agent-channel-modal')).toBeNull();

		await userEvent.click(getByTestId('mock-slack-connect'));

		await waitFor(() => expect(mocks.connect).toHaveBeenCalledWith('slack', 'cred-1', undefined));
		expect(confirmSpy).toHaveBeenCalledWith('req-channel', {
			kind: 'approval',
			approved: true,
		});
		expect(resolveSpy).toHaveBeenCalledWith('req-channel', 'approved');
	});

	it('submits deferred when the user skips setup', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('instance-ai-channel-setup-skip'));

		expect(confirmSpy).toHaveBeenCalledWith('req-channel', {
			kind: 'approval',
			approved: false,
		});
		expect(resolveSpy).toHaveBeenCalledWith('req-channel', 'deferred');
	});

	it('does not submit twice when setup emits connect twice', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-slack-connect-twice'));

		await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
		expect(mocks.connect).toHaveBeenCalledTimes(1);
		expect(confirmSpy).toHaveBeenCalledTimes(1);
		expect(confirmSpy).toHaveBeenCalledWith('req-channel', {
			kind: 'approval',
			approved: true,
		});
	});

	it('keeps skip disabled while channel connection is in flight', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
		let resolveConnect: (value: { status: string }) => void = () => {};
		mocks.connect.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveConnect = resolve;
			}),
		);

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-slack-connect'));

		await waitFor(() => expect(mocks.connect).toHaveBeenCalledTimes(1));
		expect(getByTestId('instance-ai-channel-setup-skip')).toBeDisabled();

		await userEvent.click(getByTestId('instance-ai-channel-setup-skip'));
		expect(confirmSpy).not.toHaveBeenCalledWith('req-channel', {
			kind: 'approval',
			approved: false,
		});

		resolveConnect({ status: 'connected' });
		await waitFor(() =>
			expect(confirmSpy).toHaveBeenCalledWith('req-channel', {
				kind: 'approval',
				approved: true,
			}),
		);
	});

	it('fails Slack app setup immediately when the authorization popup is blocked', async () => {
		vi.spyOn(window, 'open').mockReturnValueOnce(null);
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-slack-app-setup'));

		await waitFor(() =>
			expect(getByTestId('mock-slack-app-setup-status')).toHaveTextContent('error'),
		);
		expect(confirmSpy).not.toHaveBeenCalled();
	});

	it('retries a failed confirmAction once before resolving', async () => {
		const confirmSpy = vi
			.spyOn(thread, 'confirmAction')
			.mockResolvedValueOnce(false)
			.mockResolvedValueOnce(true);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-slack-connect'));

		await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('req-channel', 'approved'));
		expect(confirmSpy).toHaveBeenCalledTimes(2);
	});

	it('resolves locally without reopening setup when every confirmAction attempt fails', async () => {
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(false);
		const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

		const { getByTestId, queryByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-slack-connect'));

		await waitFor(() => expect(resolveSpy).toHaveBeenCalledWith('req-channel', 'approved'));
		expect(confirmSpy).toHaveBeenCalledTimes(2);
		expect(queryByTestId('instance-ai-channel-setup')).toBeNull();
	});

	it('ignores submit when request is already resolved', async () => {
		thread.resolveConfirmation('req-channel', 'approved');
		const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

		const { getByTestId } = renderComponent({ props: defaultProps });

		await userEvent.click(getByTestId('mock-slack-connect'));

		expect(mocks.connect).not.toHaveBeenCalled();
		expect(confirmSpy).not.toHaveBeenCalled();
	});
});
