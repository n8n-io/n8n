import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';

import AgentFilesPanel from '../components/AgentFilesPanel.vue';

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

function renderPanel(props: Partial<InstanceType<typeof AgentFilesPanel>['$props']> = {}) {
	const renderComponent = createComponentRenderer(AgentFilesPanel, {
		global: {
			stubs: {
				AgentAiqKnowledgePanel: {
					template: '<div data-testid="agent-aiq-panel" />',
				},
				N8nActionBox: { template: '<div data-testid="agent-files-empty" />' },
				N8nButton: {
					props: ['disabled'],
					template: '<button v-bind="$attrs"><slot /></button>',
				},
				N8nCard: {
					template: '<div><slot name="prepend" /><slot /><slot name="append" /></div>',
				},
				N8nIcon: { template: '<i />' },
				N8nIconButton: {
					props: ['disabled', 'ariaLabel'],
					template: '<button v-bind="$attrs" :aria-label="ariaLabel"><slot /></button>',
				},
				N8nLoading: { template: '<div />' },
				N8nScrollArea: { template: '<div><slot /></div>' },
				N8nText: { template: '<span><slot /></span>' },
				N8nTooltip: { template: '<div><slot /></div>' },
			},
		},
	});

	return renderComponent({
		props: {
			files: [],
			...props,
		},
	});
}

describe('AgentFilesPanel', () => {
	it('renders Add connection before upload and emits add-connection', async () => {
		const { container, emitted } = renderPanel();
		const addConnection = container.querySelector('[data-testid="agent-files-add-connection"]');
		const upload = container.querySelector('[data-testid="agent-files-upload"]');
		expect(addConnection).not.toBeNull();
		expect(upload).not.toBeNull();

		expect(
			(addConnection as Element).compareDocumentPosition(upload as Element) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();

		await fireEvent.click(addConnection as Element);

		expect(emitted()['add-connection']).toHaveLength(1);
		expect(container.querySelector('[data-testid="agent-aiq-panel"]')).not.toBeInTheDocument();
	});

	it('shows the AI-Q panel only when connected', () => {
		const { container } = renderPanel({ aiqBaseUrl: 'https://aiq.example.test' });

		expect(container.querySelector('[data-testid="agent-aiq-panel"]')).toBeInTheDocument();
	});
});
