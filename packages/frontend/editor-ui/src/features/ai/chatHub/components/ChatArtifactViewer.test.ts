import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import type { ChatArtifact } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import ChatArtifactViewer from './ChatArtifactViewer.vue';

const workflowArtifact: ChatArtifact = {
	title: 'Updated workflow',
	type: 'json',
	content: JSON.stringify({ name: 'Updated workflow', nodes: [], connections: {} }),
};

const renderComponent = createComponentRenderer(ChatArtifactViewer, {
	props: {
		artifacts: [workflowArtifact],
		selectedIndex: 0,
	},
	global: {
		stubs: {
			ChatMarkdownChunk: true,
		},
	},
});

function getDownloadButton(container: HTMLElement) {
	const button = container.querySelector<HTMLButtonElement>(
		'button:has([data-icon="arrow-circle-down"])',
	);
	expect(button).toBeInTheDocument();
	return button!;
}

describe('ChatArtifactViewer', () => {
	it('emits download when the JSON preview download button is clicked', async () => {
		const { container, emitted } = renderComponent();

		await userEvent.click(getDownloadButton(container));

		expect(emitted('download')).toEqual([[]]);
	});

	// N8N-11481: Explain the icon-only action in the JSON preview.
	it('shows a Download JSON tooltip when the download button is hovered', async () => {
		const { container } = renderComponent();

		await hoverTooltipTrigger(getDownloadButton(container));

		await waitFor(() => expect(getTooltip()).toHaveTextContent('Download JSON'));
	});
});
