import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { n8nHtml } from '@n8n/design-system/directives';
import type { AgentFileDto } from '@n8n/api-types';

import AgentFilesPanel from '../components/AgentFilesPanel.vue';

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
			files: [] as AgentFileDto[],
			isPublished: true,
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
	it('disables the upload button with the publish-required tooltip when unpublished', () => {
		const wrapper = mountPanel({ isPublished: false });

		const uploadButton = wrapper.find('[data-testid="agent-files-upload"]');
		expect(uploadButton.attributes('disabled')).toBeDefined();
		expect(uploadButton.attributes('aria-label')).toBe('agents.builder.files.publishRequired');
	});

	it('enables the upload button with the normal upload tooltip when published', () => {
		const wrapper = mountPanel({ isPublished: true });

		const uploadButton = wrapper.find('[data-testid="agent-files-upload"]');
		expect(uploadButton.attributes('disabled')).toBeUndefined();
		expect(uploadButton.attributes('aria-label')).toBe('agents.builder.files.addFile');
	});

	it('shows the publish hint in the empty state when unpublished', () => {
		const wrapper = mountPanel({ isPublished: false, files: [] });

		expect(wrapper.text()).toContain('agents.builder.files.publishRequired');
	});

	it('shows the normal empty-state message when published', () => {
		const wrapper = mountPanel({ isPublished: true, files: [] });

		expect(wrapper.text()).toContain('agents.builder.files.empty');
	});

	it('shows the knowledge base title with a tooltip and icon-only add action', () => {
		const wrapper = mountPanel({ files: [file] });

		expect(wrapper.find('[data-testid="agent-files-title"]').text()).toContain(
			'agents.builder.files.title',
		);

		const uploadButton = wrapper.findComponent({ name: 'N8nButton' });
		expect(uploadButton.props('variant')).toBe('ghost');
		expect(uploadButton.props('iconOnly')).toBe(true);
		expect(uploadButton.props('icon')).toBe('plus');
		expect(wrapper.find('[data-testid="agent-files-upload"]').text()).toBe('');
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
