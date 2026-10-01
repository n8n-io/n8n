import { createApp, defineComponent, h, nextTick, ref } from 'vue';
import { installRenderTracker, RENDER_TRACKING_STORAGE_KEY } from '@/app/dev/render-tracker';

/**
 * Mount a root whose render does NOT depend on `value`, so only the child
 * re-renders when `value` changes (the root effect never re-runs). This isolates
 * the count to a single component per change.
 */
function mountAppWithChild() {
	const value = ref(0);
	const TrackedChild = defineComponent({
		name: 'TrackedChild',
		setup() {
			return () => h('div', value.value);
		},
	});
	const app = createApp({ render: () => h(TrackedChild) });
	installRenderTracker(app);
	app.mount(document.createElement('div'));
	return { app, value };
}

describe('installRenderTracker', () => {
	afterEach(() => {
		localStorage.clear();
		delete window.n8nRenderTracker;
	});

	it('does nothing when the tracking flag is absent', () => {
		const app = createApp({ render: () => null });
		installRenderTracker(app);
		expect(window.n8nRenderTracker).toBeUndefined();
	});

	it('counts re-renders within a start/stop window but not the initial mount', async () => {
		localStorage.setItem(RENDER_TRACKING_STORAGE_KEY, 'true');
		const { app, value } = mountAppWithChild();
		const tracker = window.n8nRenderTracker;
		expect(tracker).toBeDefined();

		// Initial mount must not be counted.
		tracker!.start();
		expect(tracker!.total).toBe(0);

		value.value += 1;
		await nextTick();
		value.value += 1;
		await nextTick();

		const snapshot = tracker!.snapshot();
		expect(snapshot.total).toBe(2);
		expect(snapshot.byComponent.TrackedChild).toBe(2);

		app.unmount();
	});

	it('does not count while stopped', async () => {
		localStorage.setItem(RENDER_TRACKING_STORAGE_KEY, 'true');
		const { app, value } = mountAppWithChild();
		const tracker = window.n8nRenderTracker;

		// Defaults to disabled — re-renders before start() are ignored.
		value.value += 1;
		await nextTick();
		expect(tracker!.total).toBe(0);

		tracker!.start();
		value.value += 1;
		await nextTick();
		tracker!.stop();
		value.value += 1;
		await nextTick();

		expect(tracker!.snapshot().total).toBe(1);

		app.unmount();
	});
});
