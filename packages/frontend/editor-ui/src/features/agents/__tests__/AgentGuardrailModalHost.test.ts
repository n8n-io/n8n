import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { mount } from '@vue/test-utils';
import type { AgentToolGuardrailConfig, AgentToolGuardrailKind } from '@n8n/api-types';

import AgentGuardrailModalHost from '../components/AgentGuardrailModalHost.vue';
import type { AgentJsonToolRef } from '../types';

vi.mock('../components/AgentGuardrailModal.vue', () => ({
	default: {
		name: 'AgentGuardrailModal',
		props: ['open', 'guardrail', 'kind', 'tools', 'existingIds', 'disabled'],
		emits: ['update:open', 'save', 'remove'],
		template: '<div data-testid="agent-guardrail-modal-stub" />',
	},
}));

const SAVED_GUARDRAIL: AgentToolGuardrailConfig = {
	kind: 'keywords',
	id: 'g1',
	stage: 'before',
	keywords: ['secret'],
};

const OTHER_GUARDRAIL: AgentToolGuardrailConfig = {
	kind: 'nsfw',
	id: 'g2',
	stage: 'before',
};

function mountHost(
	overrides: Partial<{
		guardrail: AgentToolGuardrailConfig | null;
		kind: AgentToolGuardrailKind;
	}> = {},
) {
	const guardrails: AgentToolGuardrailConfig[] = [SAVED_GUARDRAIL, OTHER_GUARDRAIL];
	const onUpdateGuardrails = vi.fn((next: AgentToolGuardrailConfig[]) => {
		// Keep the list live, as the host's config write does.
		guardrails.splice(0, guardrails.length, ...next);
	});
	const onExit = vi.fn();
	const wrapper = mount(AgentGuardrailModalHost, {
		global: { plugins: [createTestingPinia()] },
		props: {
			modalName: 'agentGuardrailModal',
			data: {
				guardrail: overrides.guardrail ?? null,
				...(overrides.kind ? { kind: overrides.kind } : {}),
				getGuardrails: () => guardrails,
				getTools: () => [] as AgentJsonToolRef[],
				onUpdateGuardrails,
				onExit,
			},
		},
	});
	return { wrapper, onUpdateGuardrails, onExit };
}

describe('AgentGuardrailModalHost', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('passes the entry, kind, tools, and existing ids to the modal', () => {
		const { wrapper } = mountHost({ guardrail: SAVED_GUARDRAIL });

		const modal = wrapper.getComponent({ name: 'AgentGuardrailModal' });
		expect(modal.props('open')).toBe(false);
		expect(modal.props('guardrail')).toEqual(SAVED_GUARDRAIL);
		expect(modal.props('kind')).toBe('keywords');
		expect(modal.props('tools')).toEqual([]);
		expect(modal.props('existingIds')).toEqual(['g1', 'g2']);
	});

	it('replaces the edited guardrail by id on save', () => {
		const { wrapper, onUpdateGuardrails, onExit } = mountHost({
			guardrail: SAVED_GUARDRAIL,
		});
		const replacement = { ...SAVED_GUARDRAIL, keywords: ['secret', 'token'] };
		wrapper.getComponent({ name: 'AgentGuardrailModal' }).vm.$emit('save', replacement);

		expect(onUpdateGuardrails).toHaveBeenCalledTimes(1);
		const next = onUpdateGuardrails.mock.calls[0]?.[0] as AgentToolGuardrailConfig[];
		expect(next).toHaveLength(2);
		expect(next).toContainEqual(replacement);
		expect(onExit).not.toHaveBeenCalled();
	});

	it('appends a created guardrail on save', () => {
		const { wrapper, onUpdateGuardrails } = mountHost();
		const created: AgentToolGuardrailConfig = { kind: 'jailbreak', id: 'g-new', stage: 'before' };
		wrapper.getComponent({ name: 'AgentGuardrailModal' }).vm.$emit('save', created);

		const next = onUpdateGuardrails.mock.calls[0]?.[0] as AgentToolGuardrailConfig[];
		expect(next).toHaveLength(3);
		expect(next.at(-1)).toEqual(created);
	});

	it('removes the edited guardrail on remove, without closing itself', () => {
		const { wrapper, onUpdateGuardrails, onExit } = mountHost({
			guardrail: SAVED_GUARDRAIL,
		});

		wrapper.getComponent({ name: 'AgentGuardrailModal' }).vm.$emit('remove');

		expect(onUpdateGuardrails).toHaveBeenCalledTimes(1);
		const next = onUpdateGuardrails.mock.calls[0]?.[0] as AgentToolGuardrailConfig[];
		expect(next).toEqual([OTHER_GUARDRAIL]);
		// The modal's own update:open-false path closes the host; remove must not.
		expect(onExit).not.toHaveBeenCalled();
	});

	it('closes and exits through the onExit callback on any close', () => {
		const { wrapper, onExit } = mountHost();

		// Save, cancel, and Escape all arrive as update:open false.
		wrapper.getComponent({ name: 'AgentGuardrailModal' }).vm.$emit('update:open', false);

		expect(onExit).toHaveBeenCalledTimes(1);
	});
});
