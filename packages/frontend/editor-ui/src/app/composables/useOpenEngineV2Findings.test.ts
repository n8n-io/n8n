import { useEngineV2FindingsDialog } from '@n8n/frontend-module-engine-v2';
import { reactive, shallowRef } from 'vue';
import type { NavigationFailure, RouteLocationNormalizedLoaded } from 'vue-router';

import { VIEWS } from '@/app/constants';

import { useOpenEngineV2Findings } from './useOpenEngineV2Findings';

const route = reactive<Pick<RouteLocationNormalizedLoaded, 'meta'>>({ meta: {} });
const push = vi.fn<() => Promise<NavigationFailure | undefined>>();
type Location = Pick<RouteLocationNormalizedLoaded, 'meta' | 'params'>;
const currentRoute = shallowRef<Location>({ meta: {}, params: {} });
const editorOf = (workflowId: string): Location => ({
	meta: { nodeView: true },
	params: { workflowId },
});

vi.mock('vue-router', () => ({
	useRoute: () => route,
	useRouter: () => ({ push, currentRoute }),
}));

describe('useOpenEngineV2Findings', () => {
	beforeEach(() => {
		// By default the move reaches the editor of the workflow it asks for.
		push.mockReset().mockImplementation(async () => {
			currentRoute.value = editorOf('w1');
			return undefined;
		});
		route.meta = {};
		currentRoute.value = { meta: {}, params: {} };
	});

	afterEach(() => useEngineV2FindingsDialog().close());

	it('opens the findings in place on the canvas', async () => {
		route.meta = { nodeView: true };

		await useOpenEngineV2Findings()('w1');

		expect(push).not.toHaveBeenCalled();
		expect(useEngineV2FindingsDialog().isOpen.value).toBe(true);
	});

	it('goes to the editor tab first from another tab', async () => {
		await useOpenEngineV2Findings()('w1');

		expect(push).toHaveBeenCalledWith({ name: VIEWS.WORKFLOW, params: { workflowId: 'w1' } });
		expect(useEngineV2FindingsDialog().isOpen.value).toBe(true);
	});

	it('opens nothing when a guard refuses the move', async () => {
		push.mockResolvedValue(new Error('Navigation aborted') as NavigationFailure);

		await useOpenEngineV2Findings()('w1');

		expect(useEngineV2FindingsDialog().isOpen.value).toBe(false);
	});

	it('opens nothing when a guard redirects the move to another page', async () => {
		push.mockImplementation(async () => {
			currentRoute.value = { meta: {}, params: {} };
			return undefined;
		});

		await useOpenEngineV2Findings()('w1');

		expect(useEngineV2FindingsDialog().isOpen.value).toBe(false);
	});

	it('opens nothing when a guard redirects the move to another workflow', async () => {
		push.mockImplementation(async () => {
			currentRoute.value = editorOf('w2');
			return undefined;
		});

		await useOpenEngineV2Findings()('w1');

		expect(useEngineV2FindingsDialog().isOpen.value).toBe(false);
	});
});
