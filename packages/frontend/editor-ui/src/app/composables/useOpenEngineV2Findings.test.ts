import { useEngineV2FindingsDialog } from '@n8n/frontend-module-engine-v2';
import { reactive } from 'vue';
import type { NavigationFailure, RouteLocationNormalizedLoaded } from 'vue-router';

import { VIEWS } from '@/app/constants';

import { useOpenEngineV2Findings } from './useOpenEngineV2Findings';

const route = reactive<Pick<RouteLocationNormalizedLoaded, 'meta'>>({ meta: {} });
const push = vi.fn<() => Promise<NavigationFailure | undefined>>();

vi.mock('vue-router', () => ({
	useRoute: () => route,
	useRouter: () => ({ push }),
}));

describe('useOpenEngineV2Findings', () => {
	beforeEach(() => {
		push.mockReset().mockResolvedValue(undefined);
		route.meta = {};
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
});
