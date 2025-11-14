import { SlidingWindow } from '../sliding-window';

describe('SlidingWindow', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('addEvent and getCount', () => {
		it('should count events within the window', () => {
			const window = new SlidingWindow({ maxEvents: 10, durationMs: 5000 });
			const now = Date.now();

			window.addEvent(now);
			window.addEvent(now + 1000);
			window.addEvent(now + 2000);

			expect(window.getCount()).toBe(3);
		});

		it('should exclude events outside the time window', () => {
			const window = new SlidingWindow({ maxEvents: 10, durationMs: 5000 });
			const now = Date.now();

			window.addEvent(now - 6000); // Outside window
			window.addEvent(now - 1000); // Inside window
			window.addEvent(now); // Inside window

			expect(window.getCount()).toBe(2);
		});

		it('should handle empty window', () => {
			const window = new SlidingWindow({ maxEvents: 10, durationMs: 5000 });

			expect(window.getCount()).toBe(0);
		});
	});

	describe('memory management', () => {
		it('should prune events when exceeding 2x maxEvents', () => {
			const window = new SlidingWindow({ maxEvents: 5, durationMs: 10000 });
			const now = Date.now();

			// Add 11 events (more than 2x maxEvents)
			for (let i = 0; i < 11; i++) {
				window.addEvent(now + i * 100);
			}

			// Should keep only the last 10 events (2x maxEvents)
			expect(window.getCount()).toBe(10);
		});
	});

	describe('clear', () => {
		it('should remove all events', () => {
			const window = new SlidingWindow({ maxEvents: 10, durationMs: 5000 });
			const now = Date.now();

			window.addEvent(now);
			window.addEvent(now + 1000);
			expect(window.getCount()).toBe(2);

			window.clear();
			expect(window.getCount()).toBe(0);
		});
	});

	describe('time progression', () => {
		it('should filter out old events as time advances', () => {
			jest.setSystemTime(10000); // Set a specific start time
			const window = new SlidingWindow({ maxEvents: 10, durationMs: 5000 });

			window.addEvent(Date.now());
			window.addEvent(Date.now() + 1000);
			expect(window.getCount()).toBe(2);

			// Advance time beyond the window duration
			jest.setSystemTime(16500);

			expect(window.getCount()).toBe(0);
		});

		it('should maintain count for events within sliding window', () => {
			jest.setSystemTime(10000);
			const window = new SlidingWindow({ maxEvents: 10, durationMs: 5000 });

			window.addEvent(Date.now()); // Event at 10000
			jest.setSystemTime(13000);

			window.addEvent(Date.now()); // Event at 13000
			expect(window.getCount()).toBe(2); // Both within window

			jest.setSystemTime(16000); // 6000ms after first event

			expect(window.getCount()).toBe(1); // Only second event remains
		});
	});
});
