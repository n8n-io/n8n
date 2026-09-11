import { createComponentRenderer } from '@/__tests__/render';
import { configure, fireEvent, waitFor } from '@testing-library/vue';
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

configure({ testIdAttribute: 'data-testid' });

import AgentChannelOpenAiCompatibleEditView from './AgentChannelOpenAiCompatibleEditView.vue';
import type { OpenAiCompatibleChannelRuntime } from './useOpenAiCompatibleChannelRuntime';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const writeText = vi.fn().mockResolvedValue(undefined);

function createRuntime(
	overrides: Partial<OpenAiCompatibleChannelRuntime> = {},
): OpenAiCompatibleChannelRuntime {
	const apiKey = ref<string | null>('sk-existing');
	const connectionId = ref<string | null>('conn-1');
	return {
		load: async () => {},
		loading: ref(false),
		apiKey,
		connectionId,
		baseUrl: ref('https://n8n.test/rest/projects/p/agents/v2/a/openai/v1'),
		connect: vi.fn(),
		regenerate: vi.fn(async () => {
			apiKey.value = 'sk-rotated';
			connectionId.value = 'conn-2';
		}),
		...overrides,
	} as OpenAiCompatibleChannelRuntime;
}

function baseProps(runtime: OpenAiCompatibleChannelRuntime, extra: Record<string, unknown> = {}) {
	return {
		mode: 'edit' as const,
		integration: { type: 'openwebui', label: 'OpenWebUI', icon: 'bot', credentialTypes: [] },
		modelValue: '',
		credentials: [],
		credentialPermissions: {},
		credentialsLoading: false,
		loading: false,
		connected: true,
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

const renderComponent = createComponentRenderer(AgentChannelOpenAiCompatibleEditView);

describe('AgentChannelOpenAiCompatibleEditView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Object.assign(navigator, { clipboard: { writeText } });
	});

	it('tracks the copied state per field', async () => {
		const runtime = createRuntime();
		const { getByTestId } = renderComponent({ props: baseProps(runtime) });

		const baseUrlCopy = getByTestId('openai-compatible-copy-base-url');
		const keyCopy = getByTestId('openai-compatible-copy-key');

		await fireEvent.click(baseUrlCopy);

		await waitFor(() =>
			expect(baseUrlCopy.getAttribute('aria-label')).toBe('agents.builder.addTrigger.copied'),
		);
		// Copying the base URL must not flip the API key button to the copied state.
		expect(keyCopy.getAttribute('aria-label')).toBe('agents.builder.addTrigger.copy');
	});

	it('regenerates the key and notifies the modal', async () => {
		const runtime = createRuntime();
		const { getByTestId, emitted } = renderComponent({ props: baseProps(runtime) });

		await fireEvent.click(getByTestId('openai-compatible-regenerate-button'));

		expect(runtime.regenerate).toHaveBeenCalledTimes(1);
		await waitFor(() => expect(emitted().regenerated).toBeTruthy());
	});

	it('surfaces a failed regeneration and stays retryable', async () => {
		const runtime = createRuntime({
			regenerate: vi.fn().mockRejectedValue(new Error('boom')),
		});
		const { getByTestId, getByText, emitted } = renderComponent({ props: baseProps(runtime) });

		await fireEvent.click(getByTestId('openai-compatible-regenerate-button'));

		await waitFor(() =>
			expect(getByText('agents.channels.openaiCompatible.regenerate.error')).toBeVisible(),
		);
		expect(emitted().regenerated).toBeFalsy();
	});

	it('locks the regenerate button while the runtime is busy', () => {
		const runtime = createRuntime({ loading: ref(true) });
		const { getByTestId } = renderComponent({ props: baseProps(runtime) });

		expect(getByTestId('openai-compatible-regenerate-button')).toBeDisabled();
	});
});
