import { describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';

import ModalRoot from '@/app/components/ModalRoot.vue';
import { useUIStore } from '@/app/stores/ui.store';
import AgentGuardrailModalHost from '../components/AgentGuardrailModalHost.vue';
import { AGENT_GUARDRAIL_MODAL_KEY } from '../constants';
import type { AgentToolGuardrailConfig } from '@n8n/api-types';

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const SAVED: AgentToolGuardrailConfig = {
	kind: 'keywords',
	id: 'g1',
	stage: 'before',
	keywords: ['secret'],
};

describe('scratch: real ModalRoot + host render', () => {
	it('renders the guardrail modal through the real modal root plumbing', async () => {
		const wrapper = mount(ModalRoot, {
			props: { name: AGENT_GUARDRAIL_MODAL_KEY },
			global: { plugins: [createTestingPinia({ stubActions: false })] },
			slots: {
				default: `
					<template #default="{ modalName, data }">
						<AgentGuardrailModalHost :modal-name="modalName" :data="data" />
					</template>
				`,
			},
		});

		const uiStore = useUIStore();
		expect(wrapper.text()).toBe('');

		uiStore.openModalWithData({
			name: AGENT_GUARDRAIL_MODAL_KEY,
			data: {
				guardrail: SAVED,
				getGuardrails: () => [SAVED],
				getTools: () => [],
				onUpdateGuardrails: vi.fn(),
				onExit: vi.fn(),
			},
		});
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();

		// The dialog teleports to the body; check both the wrapper and the document.
		console.log('wrapper html:', wrapper.html().slice(0, 400));
		console.log(
			'body has dialog:',
			Boolean(document.body.querySelector('[role="dialog"]')),
			'body has modal host testid:',
			Boolean(document.body.querySelector('[data-testid="agent-guardrail-modal-host"]')),
		);
		expect(true).toBe(true);
	});
});
