import { Connectable, ObservableInput, SubjectLike } from '../types';
import { Subject } from '../Subject';
import { Subscription } from '../Subscription';
import { Observable } from '../Observable';
import { defer } from './defer';

export interface ConnectableConfig<T> {
  /**
   * A factory function used to create the Subject through which the source
   * is multicast. By default this creates a {@link Subject}.
   */
  connector: () => SubjectLike<T>;
  /**
   * If true, the resulting observable will reset internal state upon disconnection
   * and return to a "cold" state. This allows the resulting observable to be
   * reconnected.
   * If false, upon disconnection, the connecting subject will remain the
   * connecting subject, meaning the resulting observable will not go "cold" again,
   * and subsequent repeats or resubscriptions will resubscribe to that same subject.
   */
  resetOnDisconnect?: boolean;
}

/**
 * The default configuration for `connectable`.
 */
const DEFAULT_CONFIG: ConnectableConfig<unknown> = {
  connector: () => new Subject<unknown>(),
  resetOnDisconnect: true,
};

/**
 * Creates an observable that multicasts once `connect()` is called on it.
 *
 * @param source The observable source to make connectable.
 * @param config The configuration object for `connectable`.
 * @returns A "connectable" observable, that has a `connect()` method, that you must call to
 * connect the source to all consumers through the subject provided as the connector.
 */
export function connectable<T>(source: ObservableInput<T>, config: ConnectableConfig<T> = DEFAULT_CONFIG): Connectable<T> {
  // The subscription representing the connection.
  let connection: Subscription | null = null;
  const { connector, resetOnDisconnect = true } = config;
  let subject = connector();

  const result: any = new Observable<T>((subscriber) => {
    return subject.subscribe(subscriber);
  });

  // Define the `connect` function. This is what users must call
  // in order to "connect" the source to the subject that is
  // multicasting it.
  result.connect = () => {
    if (!connection || connection.closed) {
      connection = defer(() => source).subscribe(subject);
      if (resetOnDisconnect) {
        connection.add(() => (subject = connector()));
      }
    }
    return connection;
  };

  return result;
}
