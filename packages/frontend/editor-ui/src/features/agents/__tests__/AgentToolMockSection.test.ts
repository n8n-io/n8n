/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { defineComponent, nextTick, ref } from 'vue';

import AgentToolMockSection from '../components/AgentToolMockSection.vue';
import type { AgentJsonNodeToolMockConfig } from '../types';

const TRANSLATIONS: Record<string, string> = {
	'agents.builder.toolMock.title': 'Mock this tool',
	'agents.builder.toolMock.explainer':
		"Preview returns sample data instead of calling {service}. Mocked tools don't run for real and block publishing until a credential is connected.",
	'agents.builder.toolMock.generating': 'Generating sample data…',
	'agents.builder.toolMock.regenerate': 'Regenerate',
	'agents.builder.toolMock.fallbackNotice':
		"Couldn't generate realistic examples — edit this placeholder data.",
	'agents.builder.toolMock.size': '{size} KB of {max} KB',
	'agents.builder.toolMock.error.invalidJson': 'Enter valid JSON.',
	'agents.builder.toolMock.error.invalid': "This mock data isn't valid.",
	'agents.builder.toolMock.error.tooLarge': 'Mock data is too large — keep it under {max} KB.',
	'agents.builder.toolMock.error.generate': "Couldn't generate sample data.",
	'agents.builder.toolMock.error.unsavedAgent': 'Save the agent before mocking this tool.',
};

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) => {
			const template = TRANSLATIONS[key] ?? key;
			if (!options?.interpolate) return template;
			return Object.entries(options.interpolate).reduce(
				(acc, [name, value]) => acc.replaceAll(`{${name}}`, value),
				template,
			);
		},
	}),
}));

const generateAgentToolMockDataMock = vi.fn();
vi.mock('../composables/useAgentApi', () => ({
	generateAgentToolMockData: (...args: unknown[]) => generateAgentToolMockDataMock(...args),
}));

interface MockSectionProps {
	mock?: AgentJsonNodeToolMockConfig;
	toolName?: string;
	serviceLabel?: string;
	projectId?: string;
	agentId?: string;
}

/**
 * `AgentToolMockSection` only emits `update:mock` — a real host (the tool
 * config modal) feeds it back in as the `mock` prop. This harness plays that
 * host role so the section's own `v-if="isEnabled"` body reacts the same way
 * it does in production.
 */
function mountSection(overrides: MockSectionProps = {}) {
	const initial: Required<Omit<MockSectionProps, 'mock'>> & Pick<MockSectionProps, 'mock'> = {
		toolName: 'send_email',
		serviceLabel: 'Gmail',
		projectId: 'project-1',
		agentId: 'agent-1',
		...overrides,
	};
	const Harness = defineComponent({
		components: { AgentToolMockSection },
		setup() {
			const mock = ref<AgentJsonNodeToolMockConfig | undefined>(initial.mock);
			return { mock, initial };
		},
		template: `
			<AgentToolMockSection
				:mock="mock"
				:tool-name="initial.toolName"
				:service-label="initial.serviceLabel"
				:project-id="initial.projectId"
				:agent-id="initial.agentId"
				@update:mock="mock = $event"
			/>
		`,
	});

	const wrapper = mount(Harness, {
		global: {
			stubs: {
				AgentMiniEditor: {
					props: ['modelValue'],
					emits: ['update:modelValue'],
					template:
						'<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
				},
				N8nSwitch2: {
					props: ['modelValue', 'disabled'],
					emits: ['update:modelValue'],
					template:
						'<button :disabled="disabled" @click="$emit(\'update:modelValue\', !modelValue)" />',
				},
			},
		},
	});

	return { wrapper, section: () => wrapper.findComponent(AgentToolMockSection) };
}

async function clickToggle(wrapper: ReturnType<typeof mountSection>['wrapper']) {
	await wrapper.find('[data-test-id="agent-tool-mock-toggle"]').trigger('click');
	await nextTick();
	await nextTick();
}

describe('AgentToolMockSection', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		generateAgentToolMockDataMock.mockReset();
	});

	it('renders the toggle off and no body when mocking is not configured', () => {
		const { wrapper } = mountSection();

		expect(wrapper.find('[data-test-id="agent-tool-mock-toggle"]').exists()).toBe(true);
		expect(wrapper.find('[data-test-id="agent-tool-mock-items-editor"]').exists()).toBe(false);
	});

	it('generates and persists a mock when enabled with no stored items', async () => {
		const mock: AgentJsonNodeToolMockConfig = { enabled: true, items: [{ id: 1 }] };
		generateAgentToolMockDataMock.mockResolvedValueOnce({
			toolName: 'send_email',
			mock,
			fallbackUsed: false,
			config: { name: 'Agent', model: '', instructions: '' },
			updatedAt: '2026-01-01T00:00:00.000Z',
			versionId: 'v1',
		});

		const { wrapper, section } = mountSection();
		await clickToggle(wrapper);

		expect(generateAgentToolMockDataMock).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			'agent-1',
			{ toolName: 'send_email', source: 'user' },
		);
		expect(section().emitted('update:mock')?.[0]?.[0]).toEqual(mock);
		expect(section().emitted('generated')?.[0]?.[0]).toEqual({
			name: 'Agent',
			model: '',
			instructions: '',
		});
		expect(wrapper.find('[data-test-id="agent-tool-mock-items-editor"]').exists()).toBe(true);
	});

	it('shows the placeholder-data notice when generation fell back to schema-derived items', async () => {
		generateAgentToolMockDataMock.mockResolvedValueOnce({
			toolName: 'send_email',
			mock: { enabled: true, items: [{}] },
			fallbackUsed: true,
			config: { name: 'Agent', model: '', instructions: '' },
			updatedAt: '2026-01-01T00:00:00.000Z',
			versionId: 'v1',
		});

		const { wrapper } = mountSection();
		await clickToggle(wrapper);

		expect(wrapper.find('[data-test-id="agent-tool-mock-fallback-notice"]').exists()).toBe(true);
	});

	it('enabling with items already stored is a local edit — no generate call', async () => {
		const { wrapper, section } = mountSection({ mock: { enabled: false, items: [{ id: 1 }] } });

		await clickToggle(wrapper);

		expect(generateAgentToolMockDataMock).not.toHaveBeenCalled();
		expect(section().emitted('update:mock')?.[0]?.[0]).toEqual({
			enabled: true,
			items: [{ id: 1 }],
		});
		expect(wrapper.find('[data-test-id="agent-tool-mock-items-editor"]').exists()).toBe(true);
	});

	it('disabling keeps the stored items for a cheap re-enable', async () => {
		const { wrapper, section } = mountSection({ mock: { enabled: true, items: [{ id: 1 }] } });

		await clickToggle(wrapper);

		expect(section().emitted('update:mock')?.[0]?.[0]).toEqual({
			enabled: false,
			items: [{ id: 1 }],
		});
		expect(wrapper.find('[data-test-id="agent-tool-mock-items-editor"]').exists()).toBe(false);
	});

	it('regenerate calls the endpoint again while already enabled', async () => {
		generateAgentToolMockDataMock.mockResolvedValue({
			toolName: 'send_email',
			mock: { enabled: true, items: [{ id: 2 }] },
			fallbackUsed: false,
			config: { name: 'Agent', model: '', instructions: '' },
			updatedAt: '2026-01-01T00:00:00.000Z',
			versionId: 'v2',
		});

		const { wrapper, section } = mountSection({ mock: { enabled: true, items: [{ id: 1 }] } });
		await wrapper.find('[data-test-id="agent-tool-mock-regenerate"]').trigger('click');
		await nextTick();
		await nextTick();

		expect(generateAgentToolMockDataMock).toHaveBeenCalledTimes(1);
		expect(section().emitted('update:mock')?.[0]?.[0]).toEqual({
			enabled: true,
			items: [{ id: 2 }],
		});
	});

	it('rejects invalid JSON edits and reports the section invalid', async () => {
		const { wrapper, section } = mountSection({ mock: { enabled: true, items: [{ id: 1 }] } });

		await wrapper.find('[data-test-id="agent-tool-mock-items-editor"]').setValue('not valid json');

		expect(wrapper.find('[data-test-id="agent-tool-mock-error"]').exists()).toBe(true);
		expect(section().emitted('update:valid')?.at(-1)?.[0]).toBe(false);
		expect(section().emitted('update:mock')).toBeUndefined();
	});

	it('rejects an edit that exceeds the size cap', async () => {
		const { wrapper, section } = mountSection({ mock: { enabled: true, items: [{ id: 1 }] } });
		const oversized = JSON.stringify([{ text: 'x'.repeat(300 * 1024) }]);

		await wrapper.find('[data-test-id="agent-tool-mock-items-editor"]').setValue(oversized);

		expect(wrapper.get('[data-test-id="agent-tool-mock-error"]').text()).toContain('256 KB');
		expect(section().emitted('update:valid')?.at(-1)?.[0]).toBe(false);
	});

	it('accepts a valid edit and emits the updated items', async () => {
		const { wrapper, section } = mountSection({ mock: { enabled: true, items: [{ id: 1 }] } });

		await wrapper
			.find('[data-test-id="agent-tool-mock-items-editor"]')
			.setValue(JSON.stringify([{ id: 2, name: 'updated' }]));

		expect(section().emitted('update:mock')?.at(-1)?.[0]).toEqual({
			enabled: true,
			items: [{ id: 2, name: 'updated' }],
		});
		expect(wrapper.find('[data-test-id="agent-tool-mock-error"]').exists()).toBe(false);
	});

	it('flips the toggle on immediately and shows the generating state while the first generate is in flight', async () => {
		let resolveGenerate: (value: unknown) => void = () => {};
		generateAgentToolMockDataMock.mockReturnValueOnce(
			new Promise((resolve) => (resolveGenerate = resolve)),
		);

		const { wrapper } = mountSection();
		await clickToggle(wrapper);

		// Optimistic: the section body opens with the loading indicator before the
		// endpoint responds, and the switch is guarded against a second toggle.
		expect(wrapper.find('[data-test-id="agent-tool-mock-generating"]').exists()).toBe(true);
		expect(
			wrapper.find('[data-test-id="agent-tool-mock-toggle"]').attributes('disabled'),
		).toBeDefined();

		resolveGenerate({
			toolName: 'send_email',
			mock: { enabled: true, items: [{ id: 1 }] },
			fallbackUsed: false,
			config: { name: 'Agent', model: '', instructions: '' },
			updatedAt: '2026-01-01T00:00:00.000Z',
			versionId: 'v1',
		});
		await nextTick();
		await nextTick();

		expect(wrapper.find('[data-test-id="agent-tool-mock-generating"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="agent-tool-mock-items-editor"]').exists()).toBe(true);
	});

	it('surfaces a generation error and reverts the toggle without enabling the mock', async () => {
		generateAgentToolMockDataMock.mockRejectedValueOnce(new Error('network down'));

		const { wrapper, section } = mountSection();
		await clickToggle(wrapper);

		expect(wrapper.get('[data-test-id="agent-tool-mock-generate-error"]').text()).toContain(
			'network down',
		);
		expect(section().emitted('update:mock')).toBeUndefined();
		// The optimistic enable is rolled back — no body left open on failure.
		expect(wrapper.find('[data-test-id="agent-tool-mock-generating"]').exists()).toBe(false);
		expect(wrapper.find('[data-test-id="agent-tool-mock-items-editor"]').exists()).toBe(false);
	});

	it('disables generation and explains why when the agent has not been saved yet', () => {
		const { wrapper } = mountSection({ projectId: undefined, agentId: undefined });

		expect(wrapper.text()).toContain('Save the agent before mocking this tool.');
	});
});
