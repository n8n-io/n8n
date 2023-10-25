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
		['/workflow', VIEWS.NEW_WORKFLOW],
		['/workflow/new', VIEWS.NEW_WORKFLOW],
		['/workflow/R9JFXwkUCL1jZBuw', VIEWS.WORKFLOW],
		['/workflow/R9JFXwkUCL1jZBuw/executions/29021', VIEWS.EXECUTION_PREVIEW],
		['/workflow/R9JFXwkUCL1jZBuw/debug/29021', VIEWS.EXECUTION_DEBUG],
		['/workflows/templates/R9JFXwkUCL1jZBuw', VIEWS.TEMPLATE_IMPORT],
		['/workflows/demo', VIEWS.DEMO],
		['/workflow/8IFYawZ9dKqJu8sT/history', VIEWS.WORKFLOW_HISTORY],
		['/workflow/8IFYawZ9dKqJu8sT/history/6513ed960252b846f3792f0c', VIEWS.WORKFLOW_HISTORY],
	])('should resolve %s to %s', async (path, name) => {
		await router.push(path);
		expect(router.currentRoute.value.name).toBe(name);
	});
});
