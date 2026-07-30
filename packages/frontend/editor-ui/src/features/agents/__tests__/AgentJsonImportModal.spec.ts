/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

import type { AgentJsonConfig } from '../types';

const closeModalMock = vi.fn();

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		closeModal: closeModalMock,
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.importJsonModal.title': 'Import JSON',
				'agents.builder.importJsonModal.description': 'Select a JSON file to import.',
				'agents.builder.importJsonModal.fileLabel': 'Agent JSON file',
				'agents.builder.importJsonModal.invalidJson':
					'Agent JSON could not be read. Choose a valid JSON file.',
				'agents.builder.importJsonModal.import': 'Import JSON',
				'generic.cancel': 'Cancel',
			})[key] ?? key,
	}),
}));

vi.mock('@/app/components/Modal.vue', () => ({
	default: {
		name: 'Modal',
		template:
			'<section data-testid="agent-json-import-modal"><slot name="header" /><slot name="content" /><slot name="footer" /></section>',
		props: ['name', 'width', 'customClass'],
	},
}));

vi.mock('@n8n/design-system', () => ({
	N8nButton: {
		template:
			'<button :disabled="disabled" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
		props: ['disabled', 'variant'],
		emits: ['click'],
	},
	N8nCallout: { template: '<div data-testid="agent-json-import-error"><slot /></div>' },
	N8nHeading: { template: '<h2><slot /></h2>', props: ['tag', 'size'] },
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
}));

async function mountModal(onConfirm = vi.fn()) {
	const { default: AgentJsonImportModal } = await import('../components/AgentJsonImportModal.vue');
	return mount(AgentJsonImportModal, {
		props: {
			modalName: 'agentJsonImportModal',
			data: {
				onConfirm,
			},
		},
	});
}

async function selectFile(wrapper: Awaited<ReturnType<typeof mountModal>>, file: File) {
	const input = wrapper.find<HTMLInputElement>('[data-testid="agent-json-import-file-input"]');
	Object.defineProperty(input.element, 'files', {
		value: [file],
		configurable: true,
	});
	await input.trigger('change');
	await flushPromises();
}

function makeJsonFile(content: string) {
	const file = new File([content], 'agent.json', { type: 'application/json' });
	Object.defineProperty(file, 'text', {
		value: vi.fn().mockResolvedValue(content),
		configurable: true,
	});
	return file;
}

describe('AgentJsonImportModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('imports a selected JSON file', async () => {
		const onConfirm = vi.fn();
		const config: AgentJsonConfig = {
			name: 'Imported agent',
			model: 'openai/gpt-4o-mini',
			credential: 'cred-openai',
			instructions: 'Use imported settings.',
		};
		const wrapper = await mountModal(onConfirm);

		await selectFile(wrapper, makeJsonFile(JSON.stringify(config)));
		await vi.waitFor(() => {
			expect(wrapper.find('[data-testid="agent-json-import-confirm"]').attributes('disabled')).toBe(
				undefined,
			);
		});
		await wrapper.find('[data-testid="agent-json-import-confirm"]').trigger('click');

		expect(onConfirm).toHaveBeenCalledWith(config);
		expect(closeModalMock).toHaveBeenCalledWith('agentJsonImportModal');
	});

	it('clears selected file state when the modal is cancelled', async () => {
		const onConfirm = vi.fn();
		const config: AgentJsonConfig = {
			name: 'Imported agent',
			model: 'openai/gpt-4o-mini',
			credential: 'cred-openai',
			instructions: 'Use imported settings.',
		};
		const wrapper = await mountModal(onConfirm);

		await selectFile(wrapper, makeJsonFile(JSON.stringify(config)));
		await vi.waitFor(() => {
			expect(wrapper.find('[data-testid="agent-json-import-confirm"]').attributes('disabled')).toBe(
				undefined,
			);
		});

		await wrapper.findAll('button')[0].trigger('click');

		expect(wrapper.text()).not.toContain('agent.json');
		expect(wrapper.find('[data-testid="agent-json-import-confirm"]').attributes('disabled')).toBe(
			'',
		);
		await wrapper.find('[data-testid="agent-json-import-confirm"]').trigger('click');
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('shows an error and disables import when the file is not valid JSON', async () => {
		const onConfirm = vi.fn();
		const wrapper = await mountModal(onConfirm);

		await selectFile(wrapper, makeJsonFile('not json'));

		await vi.waitFor(() => {
			expect(wrapper.find('[data-testid="agent-json-import-error"]').text()).toContain(
				'Agent JSON could not be read',
			);
		});
		expect(wrapper.find('[data-testid="agent-json-import-confirm"]').attributes('disabled')).toBe(
			'',
		);
	});
});
