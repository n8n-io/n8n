import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useHeartbeat } from '../useHeartbeat';

describe('useHeartbeat', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.clearAllTimers();
	});

	it('should start heartbeat and call onHeartbeat at specified intervals', () => {
		const onHeartbeat = vi.fn();
		const interval = 1000;

		const heartbeat = useHeartbeat({ interval, onHeartbeat });
		heartbeat.startHeartbeat();

		// Initially, the callback should not be called
		expect(onHeartbeat).not.toHaveBeenCalled();

		// Advance timer by interval
		vi.advanceTimersByTime(interval);
		expect(onHeartbeat).toHaveBeenCalledTimes(1);

		// Advance timer by another interval
		vi.advanceTimersByTime(interval);
		expect(onHeartbeat).toHaveBeenCalledTimes(2);
	});

	it('should stop heartbeat when stopHeartbeat is called', () => {
		const onHeartbeat = vi.fn();
		const interval = 1000;

		const heartbeat = useHeartbeat({ interval, onHeartbeat });
		heartbeat.startHeartbeat();

		// Advance timer by interval
		vi.advanceTimersByTime(interval);
		expect(onHeartbeat).toHaveBeenCalledTimes(1);

		// Stop the heartbeat
		heartbeat.stopHeartbeat();

		// Advance timer by multiple intervals
		vi.advanceTimersByTime(interval * 3);
		expect(onHeartbeat).toHaveBeenCalledTimes(1); // Should still be 1
	});

	it('should be safe to call stopHeartbeat multiple times', () => {
		const onHeartbeat = vi.fn();
		const interval = 1000;

		const heartbeat = useHeartbeat({ interval, onHeartbeat });
		heartbeat.startHeartbeat();

		// Stop multiple times
		heartbeat.stopHeartbeat();
		heartbeat.stopHeartbeat();
		heartbeat.stopHeartbeat();

		vi.advanceTimersByTime(interval * 2);
		expect(onHeartbeat).not.toHaveBeenCalled();
	});

	it('should restart heartbeat after stopping', () => {
		const onHeartbeat = vi.fn();
		const interval = 1000;

		const heartbeat = useHeartbeat({ interval, onHeartbeat });

		// First start
		heartbeat.startHeartbeat();
		vi.advanceTimersByTime(interval);
		expect(onHeartbeat).toHaveBeenCalledTimes(1);

		// Stop
		heartbeat.stopHeartbeat();
		vi.advanceTimersByTime(interval);
		expect(onHeartbeat).toHaveBeenCalledTimes(1);

		// Restart
		heartbeat.startHeartbeat();
		vi.advanceTimersByTime(interval);
		expect(onHeartbeat).toHaveBeenCalledTimes(2);
	});
});
