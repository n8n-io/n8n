import { TimestampProvider } from '../types';

interface PerformanceTimestampProvider extends TimestampProvider {
  delegate: TimestampProvider | undefined;
}

export const performanceTimestampProvider: PerformanceTimestampProvider = {
  now() {
    // Use the variable rather than `this` so that the function can be called
    // without being bound to the provider.
    return (performanceTimestampProvider.delegate || performance).now();
  },
  delegate: undefined,
};
