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
			metrics: {
				complexity: 3,
				executionCount: 10,
				failedCount: 0,
				averageRunTimeMs: 100,
				waitingCount: 0,
				finishedCount: 0,
			},
		},
	],
});

describe('AquariumView', () => {
	afterEach(() => {
		useAquariumStore().stopLiveUpdates();
	});

	it('loads a data set from a file', async () => {
		const { getByTestId, queryByTestId, store } = await setup();

		await pickFile(getByTestId('aquarium-dataset-input'), datasetJson);

		await waitFor(() => expect(store.entities.map((e) => e.name)).toEqual(['From file']));
		expect(getByTestId('aquarium-dataset-clear')).toBeInTheDocument();
		expect(queryByTestId('aquarium-demo-switch')).not.toBeInTheDocument();
	});

	it('goes back to the demo entities on clear', async () => {
		const { getByTestId, queryByTestId, store } = await setup();
		await pickFile(getByTestId('aquarium-dataset-input'), datasetJson);
		await waitFor(() => expect(store.dataset).toBeDefined());

		await fireEvent.click(getByTestId('aquarium-dataset-clear'));

		await waitFor(() => expect(store.entities.map((e) => e.name)).toContain('Slack ping'));
		expect(store.dataset).toBeUndefined();
		expect(queryByTestId('aquarium-dataset-clear')).not.toBeInTheDocument();
	});

	it('keeps the current entities when the file is not a data set', async () => {
		const { getByTestId, store } = await setup();
		await waitFor(() => expect(store.hasLoaded).toBe(true));

		await pickFile(getByTestId('aquarium-dataset-input'), '{"hello": "world"}');

		await waitFor(() => expect(store.dataset).toBeUndefined());
		expect(store.entities.map((e) => e.name)).toContain('Slack ping');
	});

	it('shows only the projects of the account when "My projects" is on', async () => {
		const { findByTestId, getByTestId, store } = await setup();
		await waitFor(() => expect(store.hasLoaded).toBe(true));
		const canvas = () => getByTestId('aquarium-canvas').getAttribute('aria-label');
		const all = store.entities.length;
		const mine = store.entities.filter((e) => e.project?.isMember).length;
		expect(canvas()).toBe(`Aquarium with ${all} creatures`);

		await fireEvent.click(await findByTestId('aquarium-my-projects'));

		await waitFor(() => expect(canvas()).toBe(`Aquarium with ${mine} creatures`));
		expect(mine).toBeGreaterThan(0);
		expect(mine).toBeLessThan(all);
	});
});
