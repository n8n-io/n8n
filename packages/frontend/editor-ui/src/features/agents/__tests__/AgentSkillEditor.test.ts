import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { configure, fireEvent } from '@testing-library/vue';

import AgentSkillEditor, { type AgentSkillEditorData } from '../components/AgentSkillEditor.vue';
import type { AgentSkill } from '../types';
import { AgentModalTestStub } from './utils/AgentModalTestStub';

configure({ testIdAttribute: 'data-testid' });

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

vi.mock('../composables/useAgentApi', () => ({
	listAttachableSkills: vi.fn(),
	getHubSkill: vi.fn(),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: vi.fn(), showError: vi.fn() }),
}));

vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackImportedSkill: vi.fn() }),
}));

const { confirm } = vi.hoisted(() => ({ confirm: vi.fn() }));
vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm }),
}));

type LeaveGuard = () => Promise<boolean>;
const routeGuards: { leave?: LeaveGuard } = {};
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ resolve: vi.fn(() => ({ href: '#' })) }),
	onBeforeRouteLeave: (guard: LeaveGuard) => {
		routeGuards.leave = guard;
	},
}));

const SAVED_SKILL: AgentSkill = {
	name: 'brand-voice',
	description: 'Write clear customer-facing copy.',
	instructions: 'Keep it short.',
};

function renderEditor({
	layout = 'page',
	onConfirm = vi.fn(),
}: {
	layout?: 'modal' | 'page';
	onConfirm?: AgentSkillEditorData['onConfirm'];
} = {}) {
	const renderComponent = createComponentRenderer(AgentSkillEditor, {
		global: {
			stubs: {
				AgentModal: AgentModalTestStub,
				MarkdownEditor: {
					props: ['modelValue'],
					emits: ['update:modelValue'],
					template: `<textarea :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
				},
				N8nButton: {
					template: '<button v-bind="$attrs" :disabled="disabled"><slot /></button>',
					props: ['variant', 'disabled'],
				},
				N8nIcon: { template: '<i />' },
			},
		},
	});
	return renderComponent({
		props: {
			layout,
			exitLabel: 'Back to agent',
			data: {
				projectId: 'p1',
				agentId: 'a1',
				skill: SAVED_SKILL,
				skillId: 's1',
				onConfirm,
			},
		},
	});
}

async function editDescription(getByTestId: (id: string) => HTMLElement) {
	await fireEvent.update(
		getByTestId('agent-skill-description-input').querySelector('input')!,
		'Write short customer-facing copy.',
	);
}

describe('AgentSkillEditor page layout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete routeGuards.leave;
		createTestingPinia({ stubActions: false });
	});

	it('renders the page shell and closes from the back link', async () => {
		const { getByTestId, queryByTestId, emitted } = renderEditor();

		expect(queryByTestId('agent-skill-modal')).not.toBeInTheDocument();
		expect(getByTestId('agent-skill-page-back')).toHaveTextContent('Back to agent');

		await fireEvent.click(getByTestId('agent-skill-page-back'));

		expect(emitted('close')).toHaveLength(1);
	});

	it('closes from Cancel without saving', async () => {
		const onConfirm = vi.fn();
		const { getByTestId, emitted } = renderEditor({ onConfirm });

		await fireEvent.click(getByTestId('agent-skill-page-cancel'));

		expect(onConfirm).not.toHaveBeenCalled();
		expect(emitted('close')).toHaveLength(1);
	});

	it('closes after a successful save', async () => {
		const onConfirm = vi.fn();
		const { getByTestId, emitted } = renderEditor({ onConfirm });

		await editDescription(getByTestId);
		await fireEvent.click(getByTestId('agent-skill-create-save'));

		expect(onConfirm).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 's1',
				skill: expect.objectContaining({ description: 'Write short customer-facing copy.' }),
			}),
		);
		expect(emitted('close')).toHaveLength(1);
		await expect(routeGuards.leave?.()).resolves.toBe(true);
		expect(confirm).not.toHaveBeenCalled();
	});

	it('leaves the route without asking when nothing changed', async () => {
		renderEditor();

		await expect(routeGuards.leave?.()).resolves.toBe(true);
		expect(confirm).not.toHaveBeenCalled();
	});

	it('asks before a route change discards unsaved edits', async () => {
		const { getByTestId } = renderEditor();
		await editDescription(getByTestId);

		confirm.mockResolvedValueOnce('cancel');
		await expect(routeGuards.leave?.()).resolves.toBe(false);

		confirm.mockResolvedValueOnce('confirm');
		await expect(routeGuards.leave?.()).resolves.toBe(true);
		expect(confirm).toHaveBeenCalledTimes(2);
	});

	it('does not guard route changes in the modal layout', () => {
		renderEditor({ layout: 'modal' });

		expect(routeGuards.leave).toBeUndefined();
	});
});
