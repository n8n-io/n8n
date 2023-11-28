import { createPinia, setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import router from '@/router';
import { VIEWS } from '@/constants';
import { setupServer } from '@/__tests__/server';
import { useSettingsStore } from '@/stores/settings.store';

const App = {
	template: '<div />',
};
const renderComponent = createComponentRenderer(App);

describe('router', () => {
	let server: ReturnType<typeof setupServer>;

	beforeAll(async () => {
		server = setupServer();

		const pinia = createPinia();
		setActivePinia(pinia);

		renderComponent({ pinia });
	});

	afterAll(() => {
		server.shutdown();
	});

	test.each([
		['/', VIEWS.WORKFLOWS],
		['/workflow', VIEWS.NEW_WORKFLOW],
		['/workflow/new', VIEWS.NEW_WORKFLOW],
		['/workflow/R9JFXwkUCL1jZBuw', VIEWS.WORKFLOW],
		['/workflow/R9JFXwkUCL1jZBuw/executions/29021', VIEWS.EXECUTION_PREVIEW],
		['/workflows/templates/R9JFXwkUCL1jZBuw', VIEWS.TEMPLATE_IMPORT],
		['/workflows/demo', VIEWS.DEMO],
	])(
		'should resolve %s to %s',
		async (path, name) => {
			await router.push(path);
			expect(router.currentRoute.value.name).toBe(name);
		},
		10000,
	);

	test.each([
		['/workflow/R9JFXwkUCL1jZBuw/debug/29021', VIEWS.WORKFLOWS],
		['/workflow/8IFYawZ9dKqJu8sT/history', VIEWS.WORKFLOWS],
		['/workflow/8IFYawZ9dKqJu8sT/history/6513ed960252b846f3792f0c', VIEWS.WORKFLOWS],
	])(
		'should redirect %s to %s if user does not have permissions',
		async (path, name) => {
			await router.push(path);
			expect(router.currentRoute.value.name).toBe(name);
		},
		10000,
	);

	test.each([
		['/workflow/R9JFXwkUCL1jZBuw/debug/29021', VIEWS.EXECUTION_DEBUG],
		['/workflow/8IFYawZ9dKqJu8sT/history', VIEWS.WORKFLOW_HISTORY],
		['/workflow/8IFYawZ9dKqJu8sT/history/6513ed960252b846f3792f0c', VIEWS.WORKFLOW_HISTORY],
	])(
		'should resolve %s to %s if user has permissions',
		async (path, name) => {
			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();
			settingsStore.settings.enterprise.debugInEditor = true;
			settingsStore.settings.enterprise.workflowHistory = true;

			await router.push(path);
			expect(router.currentRoute.value.name).toBe(name);
		},
		10000,
	);
});
