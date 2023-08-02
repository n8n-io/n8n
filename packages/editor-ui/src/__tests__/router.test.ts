import { createPinia, setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import router from '@/router';
import { VIEWS } from '@/constants';

const App = {
	template: '<div />',
};
const renderComponent = createComponentRenderer(App);

describe('router', () => {
	beforeAll(() => {
		const pinia = createPinia();
		setActivePinia(pinia);
		renderComponent({ pinia });
	});

	test.each([
		['/', VIEWS.WORKFLOWS],
		['/workflow/R9JFXwkUCL1jZBuw/executions/29021', VIEWS.EXECUTION_PREVIEW],
		['/workflow/R9JFXwkUCL1jZBuw/debug/29021', VIEWS.EXECUTION_DEBUG],
	])('should resolve %s to %s', async (path, expected) => {
		await router.push(path);
		expect(router.currentRoute.value.name).toBe(expected);
	});
});
