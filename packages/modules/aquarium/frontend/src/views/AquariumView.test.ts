import { fireEvent, render, waitFor } from '@testing-library/vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import { useAquariumStore } from '../aquarium.store';
import AquariumView from './AquariumView.vue';

/** jsdom's `File` has no `text()`. Browsers have it. */
function jsonFile(content: string): File {
	const file = new File([content], 'set.json', { type: 'application/json' });
	Object.defineProperty(file, 'text', { value: async () => content });
	return file;
}

vi.mock('../engine/renderer', () => ({
	AquariumRenderer: class {
		setViewSize() {}
		setRegions() {}
		render() {}
	},
}));

async function setup() {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [{ path: '/aquarium', component: AquariumView }],
	});
	await router.push('/aquarium?demo=true');
	const store = useAquariumStore();
	const result = render(AquariumView, { global: { plugins: [router] } });
	return { ...result, store };
}

async function pickFile(input: HTMLElement, content: string) {
	Object.defineProperty(input, 'files', { value: [jsonFile(content)], configurable: true });
	await fireEvent.change(input);
}

const datasetJson = JSON.stringify({
	meta: { instance: 'example.app.n8n.cloud', executionWindow: { approxHours: 1 } },
	entities: [
		{
			key: 'workflow:1',
			id: '1',
			kind: 'workflow',
			name: 'From file',
			metrics: { complexity: 3, executionCount: 10, failedCount: 0, averageRunTimeMs: 100 },
		},
	],
});

describe('AquariumView', () => {
	afterEach(() => {
		useAquariumStore().stopLiveUpdates();
	});

	it('loads a data set from a file and shows its label', async () => {
		const { getByTestId, queryByTestId, store } = await setup();

		await pickFile(getByTestId('aquarium-dataset-input'), datasetJson);

		await waitFor(() => expect(store.entities.map((e) => e.name)).toEqual(['From file']));
		expect(getByTestId('aquarium-dataset-label')).toHaveTextContent(
			'example.app.n8n.cloud: 1 of 1 creatures',
		);
		expect(queryByTestId('aquarium-demo-switch')).not.toBeInTheDocument();
	});

	it('goes back to the demo entities on clear', async () => {
		const { getByTestId, queryByTestId, store } = await setup();
		await pickFile(getByTestId('aquarium-dataset-input'), datasetJson);
		await waitFor(() => expect(store.dataset).toBeDefined());

		await fireEvent.click(getByTestId('aquarium-dataset-clear'));

		await waitFor(() => expect(store.entities.map((e) => e.name)).toContain('Slack ping'));
		expect(store.dataset).toBeUndefined();
		expect(queryByTestId('aquarium-dataset-label')).not.toBeInTheDocument();
	});

	it('keeps the current entities when the file is not a data set', async () => {
		const { getByTestId, store } = await setup();
		await waitFor(() => expect(store.hasLoaded).toBe(true));

		await pickFile(getByTestId('aquarium-dataset-input'), '{"hello": "world"}');

		await waitFor(() => expect(store.dataset).toBeUndefined());
		expect(store.entities.map((e) => e.name)).toContain('Slack ping');
	});
});
