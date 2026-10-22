import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import type { ChatArtifact } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import ChatArtifactViewer from './ChatArtifactViewer.vue';

const jsonArtifact: ChatArtifact = {
	title: 'Updated workflow',
	type: 'json',
	content: JSON.stringify({ name: 'Updated workflow', nodes: [], connections: {} }),
};

const renderComponent = createComponentRenderer(ChatArtifactViewer, {
	props: {
		artifacts: [jsonArtifact],
		selectedIndex: 0,
	},
	global: {
		stubs: {
			ChatMarkdownChunk: true,
		},
	},
});

describe('ChatArtifactViewer', () => {
	it('emits download when the download icon button is clicked', async () => {
		const { getAllByRole, emitted } = renderComponent({ pinia: createTestingPinia() });
		const downloadButton = getAllByRole('button').find((button) =>
			button.querySelector('[data-icon="arrow-circle-down"]'),
		)!;

		expect(downloadButton).toBeVisible();
		await userEvent.click(downloadButton);

		expect(emitted().download).toEqual([[]]);
	});

	// AST-1746: Identify the download action when a user hovers its icon in the JSON preview.
	it('shows a Download JSON tooltip when the download icon button is hovered', async () => {
		const { getAllByRole } = renderComponent({ pinia: createTestingPinia() });
		const downloadButton = getAllByRole('button').find((button) =>
			button.querySelector('[data-icon="arrow-circle-down"]'),
		)!;

		expect(downloadButton).toBeVisible();
		await userEvent.hover(downloadButton);
		await hoverTooltipTrigger(downloadButton);

		await waitFor(() => {
			expect(getTooltip()).toBeVisible();
			expect(getTooltip()).toHaveTextContent('Download JSON');
		});
	});
});
