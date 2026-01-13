import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineComponent } from 'vue';
import { useProvideViewportSync, useInjectViewportSync } from './useViewportSync';
import type { ViewportSyncReturn } from './useViewportSync';
import { render } from '@testing-library/vue';

describe('useViewportSync', () => {
	let requestAnimationFrameSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.useFakeTimers();
		requestAnimationFrameSpy = vi.spyOn(global, 'requestAnimationFrame') as ReturnType<
			typeof vi.spyOn
		>;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	const createProviderWrapper = (): ViewportSyncReturn => {
		let result: ViewportSyncReturn | undefined;

		const TestComponent = defineComponent({
			setup() {
				result = useProvideViewportSync();
				return {};
			},
			template: '<div></div>',
		});

		render(TestComponent);

		if (!result) {
			throw new Error('Failed to initialize viewport sync provider');
		}

		return result;
	};

	describe('useProvideViewportSync', () => {
		it('should provide viewport sync state and functions', () => {
			const result = createProviderWrapper();

			expect(result).toHaveProperty('onViewportChange');
			expect(result).toHaveProperty('triggerViewportChange');
			expect(result).toHaveProperty('selectedDetailId');
			expect(result).toHaveProperty('syncIsEnabled');
			expect(typeof result.onViewportChange).toBe('function');
			expect(typeof result.triggerViewportChange).toBe('function');
			expect(result.selectedDetailId.value).toBeUndefined();
			expect(result.syncIsEnabled.value).toBe(true);
		});

		it('should allow setting selectedDetailId', () => {
			const { selectedDetailId } = createProviderWrapper();

			selectedDetailId.value = 'detail-123';

			expect(selectedDetailId.value).toBe('detail-123');
		});

		it('should allow toggling syncIsEnabled', () => {
			const { syncIsEnabled } = createProviderWrapper();

			expect(syncIsEnabled.value).toBe(true);

			syncIsEnabled.value = false;

			expect(syncIsEnabled.value).toBe(false);
		});
	});

	describe('useInjectViewportSync', () => {
		it('should throw error when called without provider', () => {
			const TestComponent = defineComponent({
				setup() {
					expect(() => {
						useInjectViewportSync();
					}).toThrow('Please call "useProvideViewportSync" on the appropriate parent component');
					return {};
				},
				template: '<div></div>',
			});

			render(TestComponent);
		});
	});

	describe('triggerViewportChange', () => {
		it('should trigger viewport change when sync is enabled', () => {
			const { onViewportChange, triggerViewportChange } = createProviderWrapper();
			const mockListener = vi.fn();

			onViewportChange(mockListener);

			const update = {
				from: 'test-source',
				viewport: { x: 100, y: 200, zoom: 1.5 },
			};

			triggerViewportChange(update);

			expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);

			const frameCallback = requestAnimationFrameSpy.mock.calls[0][0] as (time: number) => void;
			frameCallback(0);

			expect(mockListener).toHaveBeenCalledWith(update);
		});

		it('should not trigger viewport change when sync is disabled', () => {
			const { onViewportChange, triggerViewportChange, syncIsEnabled } = createProviderWrapper();
			const mockListener = vi.fn();

			onViewportChange(mockListener);
			syncIsEnabled.value = false;

			const update = {
				from: 'test-source',
				viewport: { x: 100, y: 200, zoom: 1.5 },
			};

			triggerViewportChange(update);

			expect(requestAnimationFrameSpy).not.toHaveBeenCalled();
			expect(mockListener).not.toHaveBeenCalled();
		});

		it('should batch multiple viewport changes in single frame', () => {
			const { onViewportChange, triggerViewportChange } = createProviderWrapper();
			const mockListener = vi.fn();

			onViewportChange(mockListener);

			const update1 = {
				from: 'test-source-1',
				viewport: { x: 100, y: 200, zoom: 1.5 },
			};
			const update2 = {
				from: 'test-source-2',
				viewport: { x: 300, y: 400, zoom: 2.0 },
			};

			triggerViewportChange(update1);
			triggerViewportChange(update2);

			expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);

			const frameCallback = requestAnimationFrameSpy.mock.calls[0][0] as (time: number) => void;
			frameCallback(0);

			expect(mockListener).toHaveBeenCalledTimes(1);
			expect(mockListener).toHaveBeenCalledWith(update2);
		});

		it('should reset scheduledFrameId after frame execution', () => {
			const { onViewportChange, triggerViewportChange } = createProviderWrapper();
			const mockListener = vi.fn();

			onViewportChange(mockListener);

			const update1 = {
				from: 'test-source-1',
				viewport: { x: 100, y: 200, zoom: 1.5 },
			};
			const update2 = {
				from: 'test-source-2',
				viewport: { x: 300, y: 400, zoom: 2.0 },
			};

			triggerViewportChange(update1);

			const frameCallback = requestAnimationFrameSpy.mock.calls[0][0] as (time: number) => void;
			frameCallback(0);

			expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);

			triggerViewportChange(update2);

			expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(2);
		});

		it('should handle case when no pending update exists during frame callback', () => {
			const { onViewportChange, triggerViewportChange } = createProviderWrapper();
			const mockListener = vi.fn();

			onViewportChange(mockListener);

			const update = {
				from: 'test-source',
				viewport: { x: 100, y: 200, zoom: 1.5 },
			};

			triggerViewportChange(update);

			const frameCallback = requestAnimationFrameSpy.mock.calls[0][0] as (time: number) => void;

			frameCallback(0);

			expect(mockListener).toHaveBeenCalledTimes(1);

			frameCallback(0);

			expect(mockListener).toHaveBeenCalledTimes(1);
		});
	});

	describe('multiple listeners', () => {
		it('should notify all listeners when viewport changes', () => {
			const { onViewportChange, triggerViewportChange } = createProviderWrapper();
			const mockListener1 = vi.fn();
			const mockListener2 = vi.fn();

			onViewportChange(mockListener1);
			onViewportChange(mockListener2);

			const update = {
				from: 'test-source',
				viewport: { x: 100, y: 200, zoom: 1.5 },
			};

			triggerViewportChange(update);

			const frameCallback = requestAnimationFrameSpy.mock.calls[0][0] as (time: number) => void;
			frameCallback(0);

			expect(mockListener1).toHaveBeenCalledWith(update);
			expect(mockListener2).toHaveBeenCalledWith(update);
		});
	});
});
