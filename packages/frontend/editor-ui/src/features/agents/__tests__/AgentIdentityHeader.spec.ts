/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentJsonConfig } from '../types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.agent.name.placeholder': 'Name your agent',
				'agents.builder.agent.personalisation.change': 'Change agent icon',
			})[key] ?? key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nIcon: { template: '<i v-bind="$attrs" :data-icon="icon" />', props: ['icon', 'size'] },
	N8nIconPicker: {
		name: 'N8nIconPicker',
		template:
			'<div v-bind="$attrs"><button data-testid="agent-personalisation-picker" :data-icon="modelValue.value" :data-icons-only="String(iconsOnly)" :class="buttonClass" @click="$emit(\'update:modelValue\', { type: \'icon\', value: \'mail\' })" /></div>',
		props: {
			modelValue: Object,
			buttonTooltip: String,
			buttonSize: String,
			isReadOnly: Boolean,
			iconsOnly: Boolean,
			containerClass: String,
			buttonClass: String,
		},
		emits: ['update:modelValue'],
	},
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

type TestAgentConfig = {
	name: string;
	model: string;
	instructions: string;
	personalisation?: {
		icon: string;
		gradient: Pick<NonNullable<AgentJsonConfig['personalisation']>['gradient'], 'from' | 'to'> &
			Partial<
				Pick<
					NonNullable<AgentJsonConfig['personalisation']>['gradient'],
					'angle' | 'fromStop' | 'toStop'
				>
			>;
	};
};

async function mountHeader(
	config: TestAgentConfig = {
		name: 'Support agent',
		model: 'anthropic/claude-sonnet-4-5',
		instructions: 'Help the user.',
	},
) {
	const { default: AgentIdentityHeader } = await import('../components/AgentIdentityHeader.vue');

	return mount(AgentIdentityHeader, {
		props: {
			config: config as AgentJsonConfig,
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

	it('renders the saved personalisation icon and gradient as a 64px superellipse squircle', async () => {
		const wrapper = await mountHeader({
			name: 'Support agent',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Help the user.',
			personalisation: {
				icon: 'search',
				gradient: { from: '#111111', to: '#222222' },
			},
		});

		const avatar = wrapper.find('[data-testid="agent-personalisation-icon"]');
		const picker = wrapper.find('[data-testid="agent-personalisation-picker"]');

		expect(picker.attributes('data-icon')).toBe('search');
		expect(picker.attributes('data-icons-only')).toBe('true');
		expect(avatar.attributes('style')).toContain('--agent-personalisation-gradient-from: #111111');
		expect(avatar.attributes('style')).toContain('--agent-personalisation-gradient-to: #222222');
		expect(avatar.attributes('style')).toContain('--agent-personalisation-gradient-angle: 135deg');
		expect(avatar.attributes('style')).toContain('--agent-personalisation-gradient-from-stop: 0%');
		expect(avatar.attributes('style')).toContain('--agent-personalisation-gradient-to-stop: 100%');
		expect(componentSource).toContain('width: 64px;');
		expect(componentSource).toContain('height: 64px;');
		expect(componentSource).toContain('width: 36px;');
		expect(componentSource).toContain('height: 36px;');
		expect(componentSource).toContain('border-radius: 16px;');
		expect(componentSource).toContain('--agent-personalisation-squircle-mask');
		expect(componentSource).toContain('mask: var(--agent-personalisation-squircle-mask)');
	});

	it('emits the picked icon while preserving the saved gradient', async () => {
		const wrapper = await mountHeader({
			name: 'Support agent',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Help the user.',
			personalisation: {
				icon: 'search',
				gradient: { from: '#111111', to: '#222222' },
			},
		});

		await wrapper.find('[data-testid="agent-personalisation-picker"]').trigger('click');

		expect(wrapper.emitted('update:config')?.at(-1)).toEqual([
			{
				personalisation: {
					icon: 'mail',
					gradient: {
						from: '#111111',
						to: '#222222',
						angle: 135,
						fromStop: 0,
						toStop: 100,
					},
				},
			},
		]);
	});
});
