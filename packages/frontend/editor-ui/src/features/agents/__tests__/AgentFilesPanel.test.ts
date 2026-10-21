import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { n8nHtml } from '@n8n/design-system';
import type { AgentFileDto } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import AgentFilesPanel from '../components/AgentFilesPanel.vue';

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ pushRef: 'session-xyz' }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string | number> }) => {
			if (key === 'agents.builder.files.size.bytes') {
				return `${options?.interpolate?.bytes} B`;
			}
			if (key === 'agents.builder.files.size.kilobytes') {
				return `${options?.interpolate?.kilobytes} KB`;
			}
			if (key === 'agents.builder.files.size.megabytes') {
				return `${options?.interpolate?.megabytes} MB`;
			}
			return key;
		},
	}),
}));

const actionDropdownStub = {
	name: 'ActionDropdown',
	template:
		'<button data-testid="agent-files-actions" @click="$emit(\'select\', \'delete\')"></button>',
	props: ['items', 'disabled', 'activatorIcon'],
	emits: ['select'],
};

function mountPanel(props: Partial<InstanceType<typeof AgentFilesPanel>['$props']> = {}) {
	return mount(AgentFilesPanel, {
		props: {
			agentId: 'agent-1',
			files: [] as AgentFileDto[],
			...props,
		},
		global: {
			directives: { n8nHtml },
			stubs: {
				N8nActionDropdown: actionDropdownStub,
				ActionDropdown: actionDropdownStub,
			},
		},
	});
}

const file: AgentFileDto = {
	id: 'file-1',
	agentId: 'agent-1',
	fileName: 'runbook.pdf',
	mimeType: 'application/pdf',
	fileSizeBytes: 1024,
	createdAt: '2025-06-01T10:00:00.000Z',
};

describe('AgentFilesPanel', () => {
	beforeEach(() => vi.clearAllMocks());

	it('enables the upload button with the normal upload tooltip when files exist', () => {
		const wrapper = mountPanel({ files: [file] });

		const uploadButton = wrapper.find('[data-testid="agent-files-upload"]');
		expect(uploadButton.attributes('disabled')).toBeUndefined();
		expect(uploadButton.attributes('aria-label')).toBe('agents.builder.files.addFile');
		expect(wrapper.findComponent({ name: 'N8nEmptyState' }).exists()).toBe(false);
	});

	it('shows the normal empty-state message', () => {
		const wrapper = mountPanel({ files: [] });

		expect(wrapper.text()).toContain('agents.builder.files.empty');
	});

	it.each([
		{ state: 'empty', files: [], selection: [] },
		{ state: 'populated', files: [file], selection: [new File(['Notes'], 'notes.txt')] },
	])(
		'tracks the $state picker click, not file selection or cancellation',
		async ({ files, selection }) => {
			const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
			try {
				const wrapper = mountPanel({ files });
				expect(track).not.toHaveBeenCalled();
				if (files.length > 0) {
					await wrapper.get('[data-testid="agent-files-upload"]').trigger('click');
				} else {
					wrapper.findComponent({ name: 'N8nEmptyState' }).vm.$emit('click:button');
				}
				expect(track).toHaveBeenCalledExactlyOnceWith(
					TELEMETRY_EVENT.AGENTS.USER_CLICKED_KNOWLEDGE_UPLOAD,
					{ agent_id: 'agent-1', session_id: 'session-xyz' },
				);
				const input = wrapper.get('input[type="file"]');
				Object.defineProperty(input.element, 'files', { value: selection });
				await input.trigger('change');

				expect(clickSpy).toHaveBeenCalledOnce();
				expect(track).toHaveBeenCalledExactlyOnceWith(
					TELEMETRY_EVENT.AGENTS.USER_CLICKED_KNOWLEDGE_UPLOAD,
					{ agent_id: 'agent-1', session_id: 'session-xyz' },
				);
				if (selection.length > 0) {
					expect(wrapper.emitted('upload-files')).toEqual([[selection]]);
				} else {
					expect(wrapper.emitted('upload-files')).toBeUndefined();
				}
			} finally {
				clickSpy.mockRestore();
			}
		},
	);

	it.each([
		{ disabled: true },
		{ loading: true },
		{ uploading: true },
		{ deletingFileId: 'file-1' },
	])('does not track disabled upload controls with %j', (overrides) => {
		const empty = mountPanel(overrides);
		const populated = mountPanel({ files: [file], ...overrides });
		if ('loading' in overrides) {
			expect(empty.findComponent({ name: 'N8nEmptyState' }).exists()).toBe(false);
			expect(populated.find('[data-testid="agent-files-upload"]').exists()).toBe(false);
			expect(track).not.toHaveBeenCalled();
			return;
		}
		expect(empty.findComponent({ name: 'N8nEmptyState' }).props('buttonDisabled')).toBe(true);
		empty.findComponent({ name: 'N8nEmptyState' }).vm.$emit('click:button');

		expect(
			populated.get('[data-testid="agent-files-upload"]').attributes('disabled'),
		).toBeDefined();
		populated.findComponent({ name: 'N8nButton' }).vm.$emit('click');
		expect(track).not.toHaveBeenCalled();
	});

	it('shows the add action when files exist', () => {
		const wrapper = mountPanel({ files: [file] });

		const uploadButton = wrapper.findComponent({ name: 'N8nButton' });
		expect(uploadButton.props('variant')).toBe('ghost');
		expect(uploadButton.props('icon')).toBe('plus');
	});

	it('renders uploaded files as table rows with owner, type, size, and date metadata', () => {
		const wrapper = mountPanel({ files: [file] });

		expect(wrapper.find('[data-testid="agent-files-list-row"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-file-name"]').text()).toBe('runbook.pdf');
		expect(wrapper.find('[data-testid="agent-file-origin-pill"]').text()).toContain(
			'agents.builder.files.origin.user',
		);
		expect(wrapper.find('[data-testid="agent-file-type"]').text()).toBe(
			'agents.builder.files.type.pdf',
		);
		expect(wrapper.find('[data-testid="agent-file-size"]').text()).toBe('1.0 KB');
		expect(wrapper.find('[data-testid="agent-file-created-at"]').text()).toContain('2025');
	});

	it('emits delete-file from the row action menu', async () => {
		const wrapper = mountPanel({ files: [file] });

		await wrapper.find('[data-testid="agent-files-actions"]').trigger('click');

		expect(wrapper.emitted('delete-file')).toEqual([[file]]);
	});
});
