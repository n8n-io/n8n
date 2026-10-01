import { TypedEmitter } from '../typed-emitter';

type TestEvents = {
	ping: { value: number };
};

describe('TypedEmitter', () => {
	describe('debouncedEmit', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should emit after the debounce delay', () => {
			const emitter = new (class extends TypedEmitter<TestEvents> {
				trigger(value: number) {
					this.debouncedEmit('ping', { value });
				}
			})();
			const listener = vi.fn();
			emitter.on('ping', listener);

			emitter.trigger(1);
			expect(listener).not.toHaveBeenCalled();

			vi.advanceTimersByTime(300);
			expect(listener).toHaveBeenCalledOnce();
			expect(listener).toHaveBeenCalledWith({ value: 1 });
		});

		it('should debounce multiple calls within the delay window', () => {
			const emitter = new (class extends TypedEmitter<TestEvents> {
				trigger(value: number) {
					this.debouncedEmit('ping', { value });
				}
			})();
			const listener = vi.fn();
			emitter.on('ping', listener);

			emitter.trigger(1);
			emitter.trigger(2);
			emitter.trigger(3);

			vi.advanceTimersByTime(300);

			expect(listener).toHaveBeenCalledOnce();
			expect(listener).toHaveBeenCalledWith({ value: 3 });
		});

		it('should emit again after a second call following the delay', () => {
			const emitter = new (class extends TypedEmitter<TestEvents> {
				trigger(value: number) {
					this.debouncedEmit('ping', { value });
				}
			})();
			const listener = vi.fn();
			emitter.on('ping', listener);

			emitter.trigger(1);
			vi.advanceTimersByTime(300);
			expect(listener).toHaveBeenCalledOnce();

			emitter.trigger(2);
			vi.advanceTimersByTime(300);
			expect(listener).toHaveBeenCalledTimes(2);
			expect(listener).toHaveBeenLastCalledWith({ value: 2 });
		});
	});
});
