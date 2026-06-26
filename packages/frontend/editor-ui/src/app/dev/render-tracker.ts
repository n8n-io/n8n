import type { App, ComponentPublicInstance } from 'vue';

/**
 * localStorage key that switches on app-wide component re-render counting.
 *
 * Set by the canvas performance benchmark (packages/testing/playwright) before
 * the SPA boots. Real users never set it, so the global mixin below is never
 * installed in normal use and the feature carries no runtime cost for them.
 */
export const RENDER_TRACKING_STORAGE_KEY = 'N8N_RENDER_TRACKING';

export interface RenderTrackerSnapshot {
	/** Total component re-renders counted in the current window. */
	total: number;
	/** Re-renders broken down by component name (best-effort; for diagnosis). */
	byComponent: Record<string, number>;
}

export interface RenderTracker {
	/** While false the mixin hook returns immediately and counts nothing. */
	enabled: boolean;
	total: number;
	byComponent: Record<string, number>;
	/** Zero the counters and begin counting (opens a fresh measurement window). */
	start: () => void;
	/** Stop counting. Leaves the counts intact for a final read. */
	stop: () => void;
	/** Read the current counts without mutating them. */
	snapshot: () => RenderTrackerSnapshot;
}

declare global {
	interface Window {
		n8nRenderTracker?: RenderTracker;
	}
}

function isTrackingEnabled(): boolean {
	try {
		return window.localStorage?.getItem(RENDER_TRACKING_STORAGE_KEY) === 'true';
	} catch {
		// localStorage access can throw in locked-down browser contexts.
		return false;
	}
}

function resolveComponentName(instance: ComponentPublicInstance): string {
	// `<script setup>` SFCs expose the filename-derived name as `__name`
	// (preserved in production builds); explicitly-named components use `name`.
	const options = instance.$options as { name?: string; __name?: string };
	return options.name ?? options.__name ?? 'Anonymous';
}

/**
 * Install an app-wide component re-render counter, gated behind the
 * {@link RENDER_TRACKING_STORAGE_KEY} localStorage flag.
 *
 * A global mixin's `beforeUpdate` hook fires exactly once per component
 * re-render — it is not called on the initial mount — so counting these
 * invocations yields an accurate app-wide re-render count. The benchmark uses
 * it to measure how many re-renders an execution or a canvas change triggers; a
 * high count for a given interaction is a reactivity-thrash signal.
 *
 * No-op unless the flag is set, so it is safe to call unconditionally from
 * `main.ts`.
 */
export function installRenderTracker(app: App): void {
	if (!isTrackingEnabled()) return;

	const tracker: RenderTracker = {
		// Starts disabled: counting only happens inside an explicit start()/stop()
		// window opened by the benchmark, so unrelated measurements (e.g. frame
		// stats during pan/zoom) aren't charged for the per-update hook beyond a
		// single boolean check.
		enabled: false,
		total: 0,
		byComponent: {},
		start() {
			this.total = 0;
			this.byComponent = {};
			this.enabled = true;
		},
		stop() {
			this.enabled = false;
		},
		snapshot() {
			return { total: this.total, byComponent: { ...this.byComponent } };
		},
	};

	window.n8nRenderTracker = tracker;

	app.mixin({
		beforeUpdate(this: ComponentPublicInstance) {
			if (!tracker.enabled) return;
			tracker.total += 1;
			const name = resolveComponentName(this);
			tracker.byComponent[name] = (tracker.byComponent[name] ?? 0) + 1;
		},
	});
}
