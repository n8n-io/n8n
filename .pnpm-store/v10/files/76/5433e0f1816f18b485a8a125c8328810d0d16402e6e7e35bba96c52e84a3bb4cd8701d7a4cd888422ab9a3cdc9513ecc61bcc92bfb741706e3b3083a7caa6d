import type { TimerHandle } from './timerHandle';
type SetIntervalFunction = (handler: () => void, timeout?: number, ...args: any[]) => TimerHandle;
type ClearIntervalFunction = (handle: TimerHandle) => void;

interface IntervalProvider {
  setInterval: SetIntervalFunction;
  clearInterval: ClearIntervalFunction;
  delegate:
    | {
        setInterval: SetIntervalFunction;
        clearInterval: ClearIntervalFunction;
      }
    | undefined;
}

export const intervalProvider: IntervalProvider = {
  // When accessing the delegate, use the variable rather than `this` so that
  // the functions can be called without being bound to the provider.
  setInterval(handler: () => void, timeout?: number, ...args) {
    const { delegate } = intervalProvider;
    if (delegate?.setInterval) {
      return delegate.setInterval(handler, timeout, ...args);
    }
    return setInterval(handler, timeout, ...args);
  },
  clearInterval(handle) {
    const { delegate } = intervalProvider;
    return (delegate?.clearInterval || clearInterval)(handle as any);
  },
  delegate: undefined,
};
