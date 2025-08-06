import { useBeforeUnload } from '@/composables/useBeforeUnload';
import { STORES } from '@n8n/stores';
import { VIEWS } from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useCanvasStore } from '@/stores/canvas.store';
import type { useRoute } from 'vue-router';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import { describe } from 'vitest';

describe('useBeforeUnload', () => {
	const defaultRoute = mock<ReturnType<typeof useRoute>>({ name: 'someRoute' });

	let uiStore: ReturnType<typeof useUIStore>;
	let canvasStore: ReturnType<typeof useCanvasStore>;

	beforeEach(() => {
		const pinia = createTestingPinia({
			initialState: {
				[STORES.UI]: {
					stateIsDirty: false,
				},
			},
		});
		setActivePinia(pinia);

		uiStore = useUIStore();
		canvasStore = useCanvasStore();
	});

	describe('onBeforeUnload', () => {
		it('should do nothing if route is demo', () => {
			const route = mock<ReturnType<typeof useRoute>>({ name: VIEWS.DEMO });
			const { onBeforeUnload } = useBeforeUnload({ route });
			const event = new Event('beforeunload');

			const result = onBeforeUnload(event);

			expect(result).toBeUndefined();
		});

		it('should prompt user if state is dirty', () => {
			uiStore.stateIsDirty = true;
			const { onBeforeUnload } = useBeforeUnload({ route: defaultRoute });
			const event = new Event('beforeunload');

			const result = onBeforeUnload(event);

			expect(result).toBe(true);
		});

		it('should start loading if state is not dirty', () => {
			uiStore.stateIsDirty = false;
			const startLoadingSpy = vi.spyOn(canvasStore, 'startLoading');
			const { onBeforeUnload } = useBeforeUnload({ route: defaultRoute });
			const event = new Event('beforeunload');

			const result = onBeforeUnload(event);

			expect(startLoadingSpy).toHaveBeenCalledWith(expect.any(String));
			expect(result).toBeUndefined();
		});
	});

	describe('addBeforeUnloadHandler', () => {
		it('should add additional handlers', () => {
			const { addBeforeUnloadHandler, onBeforeUnload } = useBeforeUnload({ route: defaultRoute });
			const event = new Event('beforeunload');
			const handler = vi.fn();
			addBeforeUnloadHandler(handler);
			onBeforeUnload(event);
			expect(handler).toHaveBeenCalled();
		});
	});

	describe('addBeforeUnloadEventBindings', () => {
		it('should add beforeunload event listener', () => {
			const { addBeforeUnloadEventBindings } = useBeforeUnload({ route: defaultRoute });
			const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

			addBeforeUnloadEventBindings();

			expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
		});
	});

	describe('removeBeforeUnloadEventBindings', () => {
		it('should remove beforeunload event listener', () => {
			const { removeBeforeUnloadEventBindings } = useBeforeUnload({ route: defaultRoute });
			const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

			removeBeforeUnloadEventBindings();

			expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
		});
	});
});
