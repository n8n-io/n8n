import { beforeEach, describe, expect, it } from 'vitest';
import { waitFor, within } from '@testing-library/vue';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import AutomationProposalSteps from '../AutomationProposalSteps.vue';

const SLACK = 'n8n-nodes-base.slack';

// A plain description without iconUrl, so NodeIcon draws the font icon and no image file.
const slackType: INodeTypeDescription = {
	name: SLACK,
	displayName: 'Slack',
	description: 'Send messages to Slack',
	group: ['output'],
	version: 1,
	icon: 'fa:hashtag',
	defaults: { name: 'Slack' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [],
};

const renderSteps = createComponentRenderer(AutomationProposalSteps);

let pinia: TestingPinia;
let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

beforeEach(() => {
	pinia = createTestingPinia();
	nodeTypesStore = mockedStore(useNodeTypesStore);
	nodeTypesStore.nodeTypes = {};
});

function renderWithSteps(steps: Array<{ name: string; type: string }>, hiddenCount = 0) {
	const result = renderSteps({ pinia, props: { steps, hiddenCount } });
	return { ...result, list: within(result.getByRole('list', { name: 'Steps' })) };
}

describe('AutomationProposalSteps', () => {
	it('loads the node types when the chat has not loaded them yet', () => {
		renderWithSteps([{ name: 'Send digest', type: SLACK }]);

		expect(nodeTypesStore.loadNodeTypesIfNotLoaded).toHaveBeenCalledTimes(1);
	});

	it('shows the node icon and the display name when the node types arrive', async () => {
		nodeTypesStore.loadNodeTypesIfNotLoaded.mockImplementation(async () => {
			nodeTypesStore.nodeTypes = { [SLACK]: { 1: slackType } };
		});

		const { list } = renderWithSteps([
			{ name: '', type: SLACK },
			{ name: 'Send digest', type: SLACK },
		]);

		const nameless = await list.findByRole('img', { name: 'Slack' });
		const named = list.getByRole('img', { name: 'Send digest' });
		// Without its node type, an icon shows the first letter of the node name.
		expect(nameless).not.toHaveTextContent(/\S/);
		expect(named).not.toHaveTextContent(/\S/);
	});

	// Vitest fails the run on an unhandled rejection, so this also checks that the error is caught.
	it('keeps a letter and a readable label for each step when loading fails', async () => {
		nodeTypesStore.loadNodeTypesIfNotLoaded.mockRejectedValue(new Error('Request failed'));

		const { list } = renderWithSteps([{ name: 'Send digest', type: SLACK }]);

		await waitFor(() => expect(nodeTypesStore.loadNodeTypesIfNotLoaded).toHaveBeenCalled());
		const icon = list.getByRole('img', { name: 'Send digest' });
		expect(icon).toHaveTextContent('S');
		expect(icon).toHaveAttribute('title', 'Send digest');
	});

	it('labels a step without a name by its node type until the types load', () => {
		const { list } = renderWithSteps([{ name: '', type: SLACK }]);

		expect(list.getByRole('img', { name: SLACK })).toBeInTheDocument();
	});

	it('shows how many steps have no icon', () => {
		const { list } = renderWithSteps([{ name: 'Send digest', type: SLACK }], 3);

		expect(list.getAllByRole('listitem')).toHaveLength(2);
		expect(list.getByText('+3 more')).toBeInTheDocument();
	});
});
