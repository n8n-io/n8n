import { TimestampProvider } from '../types';

interface DateTimestampProvider extends TimestampProvider {
  delegate: TimestampProvider | undefined;
}

export const dateTimestampProvider: DateTimestampProvider = {
  now() {
    // Use the variable rather than `this` so that the function can be called
    // without being bound to the provider.
    return (dateTimestampProvider.delegate || Date).now();
  },
  delegate: undefined,
};
