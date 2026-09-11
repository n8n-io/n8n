import { createComponentRenderer } from '@/__tests__/render';
import { configure, fireEvent, waitFor } from '@testing-library/vue';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

configure({ testIdAttribute: 'data-testid' });

import AgentChannelOpenAiCompatibleSetup from './AgentChannelOpenAiCompatibleSetup.vue';
import type { OpenAiCompatibleChannelRuntime } from './useOpenAiCompatibleChannelRuntime';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

// Render every step's slot so the whole flow is assertable, unlike the real
// stepper which we do not exercise here.
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal()),
	N8nStepper: {
		props: ['steps'],
		template: `<div><div v-for="step in steps" :key="step.id"><slot :step="step" /></div></div>`,
	},
}));

const writeText = vi.fn().mockResolvedValue(undefined);

function createRuntime(
	overrides: Partial<OpenAiCompatibleChannelRuntime> = {},
): OpenAiCompatibleChannelRuntime {
	const apiKey = ref<string | null>(null);
	const connectionId = ref<string | null>(null);
	return {
		load: async () => {},
		loading: ref(false),
		apiKey,
		connectionId,
		baseUrl: ref('https://n8n.test/rest/projects/p/agents/v2/a/openai/v1'),
		connect: vi.fn(async () => {
			apiKey.value = 'sk-generated';
			connectionId.value = 'conn-1';
		}),
		regenerate: vi.fn(),
		...overrides,
	} as OpenAiCompatibleChannelRuntime;
}

function baseProps(runtime: OpenAiCompatibleChannelRuntime, extra: Record<string, unknown> = {}) {
	return {
		mode: 'setup' as const,
		integration: {
			type: 'openwebui',
			label: 'OpenWebUI',
			icon: 'bot',
			credentialTypes: [],
		},
		modelValue: '',
		credentials: [],
		credentialPermissions: {},
		credentialsLoading: false,
		loading: false,
		connected: false,
		connectedDescription: '',
		errorMessage: '',
		errorIsConflict: false,
		isPublished: false,
		agentName: 'Agent',
		projectId: 'p',
		agentId: 'a',
		forceNewCredential: false,
		simpleSetup: false,
		runtime,
		...extra,
	};
}

const renderComponent = createComponentRenderer(AgentChannelOpenAiCompatibleSetup);

describe('AgentChannelOpenAiCompatibleSetup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.assign(navigator, { clipboard: { writeText } });
	});

	it('generates a key and reports the connection id', async () => {
		const runtime = createRuntime();
		const { getByTestId, emitted } = renderComponent({ props: baseProps(runtime) });

		await fireEvent.click(getByTestId('openai-compatible-connect-button'));

		expect(runtime.connect).toHaveBeenCalledTimes(1);
		await waitFor(() => expect(emitted().generated).toBeTruthy());
		expect(emitted().generated[0]).toEqual(['conn-1']);
	});

	it('reveals the key fields and confirms', async () => {
		const runtime = createRuntime({ apiKey: ref('sk-existing'), connectionId: ref('conn-1') });
		const { getByTestId, emitted } = renderComponent({ props: baseProps(runtime) });

		expect(getByTestId('openai-compatible-base-url')).toBeVisible();
		expect(getByTestId('openai-compatible-api-key')).toBeVisible();

		await fireEvent.click(getByTestId('openai-compatible-confirm-button'));
		expect(emitted().connected).toBeTruthy();
	});

	it('emits cancel from the cancel action', async () => {
		const runtime = createRuntime({ apiKey: ref('sk-existing'), connectionId: ref('conn-1') });
		const { getByTestId, emitted } = renderComponent({ props: baseProps(runtime) });

		await fireEvent.click(getByTestId('openai-compatible-cancel-button'));
		expect(emitted().cancel).toBeTruthy();
	});

	it('tracks the copied state per field', async () => {
		const runtime = createRuntime({ apiKey: ref('sk-existing'), connectionId: ref('conn-1') });
		const { getByTestId } = renderComponent({ props: baseProps(runtime) });

		const baseUrlCopy = getByTestId('openai-compatible-copy-base-url');
		const keyCopy = getByTestId('openai-compatible-copy-key');

		await fireEvent.click(baseUrlCopy);

		await waitFor(() =>
			expect(baseUrlCopy.getAttribute('aria-label')).toBe('agents.builder.addTrigger.copied'),
		);
		// The other field must stay in the un-copied state.
		expect(keyCopy.getAttribute('aria-label')).toBe('agents.builder.addTrigger.copy');
	});

	it('surfaces a failed generation and stays retryable', async () => {
		const runtime = createRuntime({ connect: vi.fn().mockRejectedValue(new Error('boom')) });
		const { getByTestId, getByText, emitted } = renderComponent({ props: baseProps(runtime) });

		await fireEvent.click(getByTestId('openai-compatible-connect-button'));

		await waitFor(() =>
			expect(getByText('agents.channels.openaiCompatible.generate.error')).toBeVisible(),
		);
		expect(emitted().generated).toBeFalsy();
		// The button stays available so the user can retry.
		expect(getByTestId('openai-compatible-connect-button')).toBeVisible();
	});

	it('locks the flow while the runtime is generating', () => {
		const runtime = createRuntime({
			apiKey: ref('sk-existing'),
			connectionId: ref('conn-1'),
			loading: ref(true),
		});
		const { getByTestId } = renderComponent({ props: baseProps(runtime) });

		expect(getByTestId('openai-compatible-confirm-button')).toBeDisabled();
		expect(getByTestId('openai-compatible-cancel-button')).toBeDisabled();
	});

	it('shows connection errors below the stepper', () => {
		const runtime = createRuntime();
		const { getByText } = renderComponent({
			props: baseProps(runtime, { errorMessage: 'Something went wrong' }),
		});

		expect(getByText('Something went wrong')).toBeVisible();
	});
});
