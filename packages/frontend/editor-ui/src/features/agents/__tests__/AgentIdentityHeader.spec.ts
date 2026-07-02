/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.agent.name.placeholder': 'Name your agent',
			})[key] ?? key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nIcon: { template: '<i v-bind="$attrs" :data-icon="icon" />', props: ['icon', 'size'] },
	N8nInlineTextEdit: {
		name: 'N8nInlineTextEdit',
		template:
			'<input data-testid="agent-name-inline-edit" :value="modelValue" :placeholder="placeholder" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
		props: ['modelValue', 'placeholder', 'disabled', 'maxWidth', 'minWidth'],
		emits: ['update:modelValue'],
	},
}));

const componentSource = readFileSync(
	resolve(dirname(fileURLToPath(import.meta.url)), '../components/AgentIdentityHeader.vue'),
	'utf8',
);

async function mountHeader() {
	const { default: AgentIdentityHeader } = await import('../components/AgentIdentityHeader.vue');

	return mount(AgentIdentityHeader, {
		props: {
			config: {
				name: 'Support agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
			},
		},
	});
}

describe('AgentIdentityHeader', () => {
	it('renders the personalisation icon above the agent name editor', async () => {
		const wrapper = await mountHeader();

		const icon = wrapper.find('[data-testid="agent-personalisation-icon"]');
		const nameEditor = wrapper.find('[data-testid="agent-name-inline-edit"]');

		expect(icon.exists()).toBe(true);
		expect(nameEditor.exists()).toBe(true);
		expect(
			icon.element.compareDocumentPosition(nameEditor.element) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it('left-aligns the identity stack and allows the name editor to use the full header width', async () => {
		const wrapper = await mountHeader();
		const nameEditor = wrapper.findComponent({ name: 'N8nInlineTextEdit' });

		expect(componentSource).toContain('align-items: flex-start;');
		expect(componentSource).toContain('gap: var(--spacing--sm);');
		expect(nameEditor.props('maxWidth')).toBe('100%');
	});
});
