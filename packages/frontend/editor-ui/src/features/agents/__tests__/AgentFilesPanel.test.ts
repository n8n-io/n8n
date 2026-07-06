import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { n8nHtml } from '@n8n/design-system/directives';
import type { AgentFileDto } from '@n8n/api-types';

import AgentFilesPanel from '../components/AgentFilesPanel.vue';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

function mountPanel(props: Partial<InstanceType<typeof AgentFilesPanel>['$props']> = {}) {
	return mount(AgentFilesPanel, {
		props: {
			files: [] as AgentFileDto[],
			isPublished: true,
			...props,
		},
		global: { directives: { n8nHtml } },
	});
}

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
		expect(uploadButton.attributes('aria-label')).toBe('agents.builder.files.upload');
	});

	it('shows the publish hint in the empty state when unpublished', () => {
		const wrapper = mountPanel({ isPublished: false, files: [] });

		expect(wrapper.text()).toContain('agents.builder.files.publishRequired');
	});

	it('shows the normal empty-state message when published', () => {
		const wrapper = mountPanel({ isPublished: true, files: [] });

		expect(wrapper.text()).toContain('agents.builder.files.empty');
	});
});
