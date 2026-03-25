import { Connectable, ObservableInput, SubjectLike } from '../types';
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
 * Creates an observable that multicasts once `connect()` is called on it.
 *
 * @param source The observable source to make connectable.
 * @param config The configuration object for `connectable`.
 * @returns A "connectable" observable, that has a `connect()` method, that you must call to
 * connect the source to all consumers through the subject provided as the connector.
 */
export declare function connectable<T>(source: ObservableInput<T>, config?: ConnectableConfig<T>): Connectable<T>;
//# sourceMappingURL=connectable.d.ts.map