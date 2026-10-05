/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { ImportResult } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';

import { makePackageImportResult } from './utils/packageFixtures';

const closeModalMock = vi.fn();

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({
		closeModal: closeModalMock,
		modalsById: { agentPackageImportModal: { open: true } },
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string | number> }) =>
			[key, ...Object.values(options?.interpolate ?? {})].join(' '),
	}),
}));

vi.mock('../components/modals/AgentModal.vue', async () => ({
	default: (await import('./utils/AgentModalTestStub')).AgentModalTestStub,
}));

vi.mock('@n8n/design-system', () => ({
	N8nButton: {
		template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
		props: ['disabled', 'label'],
		emits: ['click'],
	},
	N8nCallout: { template: '<div :data-theme="theme"><slot /></div>', props: ['theme'] },
	N8nText: { template: '<span><slot /></span>' },
}));

async function mountModal(
	onConfirm = vi
		.fn<(file: File) => Promise<ImportResult>>()
		.mockResolvedValue(makePackageImportResult()),
	onImported = vi.fn<(result: ImportResult) => Promise<void>>().mockResolvedValue(undefined),
) {
	const { default: AgentPackageImportModal } = await import(
		'../components/AgentPackageImportModal.vue'
	);
	return mount(AgentPackageImportModal, {
		props: { modalName: 'agentPackageImportModal', data: { onConfirm, onImported } },
	});
}

async function selectFile(wrapper: Awaited<ReturnType<typeof mountModal>>, file: File) {
	const input = wrapper.get<HTMLInputElement>('[data-testid="agent-package-import-file-input"]');
	Object.defineProperty(input.element, 'files', { value: [file], configurable: true });
	await input.trigger('change');
}

const packageFile = () => new File([new Uint8Array([31, 139, 8])], 'agent.n8np');

describe('AgentPackageImportModal', () => {
	beforeEach(() => vi.clearAllMocks());

	it('uploads the file once, blocks dismissal while importing, and shows the result', async () => {
		let finish!: (result: ImportResult) => void;
		const onConfirm = vi.fn().mockReturnValue(
			new Promise<ImportResult>((resolve) => {
				finish = resolve;
			}),
		);
		const onImported = vi.fn().mockResolvedValue(undefined);
		const wrapper = await mountModal(onConfirm, onImported);
		const file = packageFile();
		await selectFile(wrapper, file);
		await wrapper.get('[data-testid="agent-package-import-confirm"]').trigger('click');
		await wrapper.get('[data-testid="agent-package-import-confirm"]').trigger('click');
		await wrapper.get('[data-testid="dialog-close-button"]').trigger('click');

		expect(onConfirm).toHaveBeenCalledExactlyOnceWith(file);
		expect(closeModalMock).not.toHaveBeenCalled();
		expect(onImported).not.toHaveBeenCalled();
		const result = makePackageImportResult();
		finish(result);
		await flushPromises();

		expect(onImported).toHaveBeenCalledWith(result);
		expect(
			wrapper.get('[data-testid="agent-package-import-result"]').attributes('data-theme'),
		).toBe('success');
		expect(wrapper.text()).toContain('Imported agent');
		expect(wrapper.find('[data-testid="agent-package-import-confirm"]').exists()).toBe(false);
		await wrapper.get('[data-testid="dialog-close-button"]').trigger('click');
		expect(closeModalMock).toHaveBeenCalledWith('agentPackageImportModal');
	});

	it('rejects legacy JSON and clears a valid selection on cancel', async () => {
		const onConfirm = vi.fn();
		const wrapper = await mountModal(onConfirm);
		await selectFile(wrapper, new File(['{}'], 'agent.json'));
		expect(wrapper.find('[data-testid="agent-package-import-error"]').exists()).toBe(true);
		expect(wrapper.get('[data-testid="agent-package-import-confirm"]').attributes('disabled')).toBe(
			'',
		);
		await selectFile(wrapper, packageFile());
		expect(wrapper.find('[data-testid="agent-package-import-error"]').exists()).toBe(false);
		await wrapper.get('[data-testid="agent-modal-cancel"]').trigger('click');
		expect(wrapper.get('[data-testid="agent-package-import-confirm"]').attributes('disabled')).toBe(
			'',
		);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('shows the source identity conflict and allows retry without refreshing the editor', async () => {
		const error = new ResponseError('Import blocked', {
			meta: { issues: [{ type: 'agent-id-conflict', sourceAgentId: 'occupied-agent' }] },
		});
		const onImported = vi.fn();
		const wrapper = await mountModal(vi.fn().mockRejectedValue(error), onImported);
		await selectFile(wrapper, packageFile());
		await wrapper.get('[data-testid="agent-package-import-confirm"]').trigger('click');
		await flushPromises();
		expect(wrapper.get('[data-testid="agent-package-import-error"]').text()).toContain(
			'occupied-agent',
		);
		expect(
			wrapper.get('[data-testid="agent-package-import-confirm"]').attributes('disabled'),
		).toBeUndefined();
		expect(onImported).not.toHaveBeenCalled();
		expect(wrapper.find('[data-testid="agent-package-import-result"]').exists()).toBe(false);
	});

	it('keeps completed imports visible with publication and refresh failures', async () => {
		const result = makePackageImportResult();
		result.agents[0].publishing = { state: 'failed', error: 'Channel setup failed' };
		result.credentials.stubbed = ['credential-1'];
		result.workflows = [
			{
				sourceWorkflowId: 'source-workflow',
				localId: 'workflow-1',
				name: 'Imported workflow',
				projectId: 'p2',
				parentFolderId: null,
				activeVersionId: 'old-version',
				isArchived: false,
				status: 'updated',
				publishing: { state: 'unchanged', skippedPublishReason: 'missing-node-type' },
			},
		];
		const onConfirm = vi.fn().mockResolvedValue(result);
		const wrapper = await mountModal(
			onConfirm,
			vi.fn().mockRejectedValue(new Error('Refresh failed')),
		);
		await selectFile(wrapper, packageFile());
		await wrapper.get('[data-testid="agent-package-import-confirm"]').trigger('click');
		await flushPromises();
		expect(
			wrapper.get('[data-testid="agent-package-import-result"]').attributes('data-theme'),
		).toBe('warning');
		expect(wrapper.text()).toContain('Channel setup failed');
		expect(wrapper.text()).toContain('Imported workflow');
		expect(wrapper.text()).toContain('agents.builder.importPackageModal.refreshError');
		expect(wrapper.find('[data-testid="agent-package-import-error"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-package-import-confirm"]').exists()).toBe(false);
		expect(onConfirm).toHaveBeenCalledTimes(1);
	});
});
