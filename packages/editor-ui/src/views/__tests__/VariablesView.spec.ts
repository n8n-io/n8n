import { afterAll, beforeAll } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { setupServer } from '@/__tests__/server';
import { render } from '@testing-library/vue';
import VariablesView from '@/views/VariablesView.vue';
import { useSettingsStore } from '@/stores';

describe('store', () => {
	let server: ReturnType<typeof setupServer>;
	const seedRecordsCount = 3;

	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		setActivePinia(createPinia());
		await useSettingsStore().getSettings();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render empty state', () => {
		const wrapper = render(VariablesView);

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render variable entries', () => {
		server.createList('variable', seedRecordsCount);

		const wrapper = render(VariablesView);

		expect(wrapper.html()).toMatchSnapshot();
	});
});
