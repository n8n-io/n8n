import { MonoTypeOperatorFunction, SubjectLike, ObservableInput } from '../types';
export interface ShareConfig<T> {
    /**
     * The factory used to create the subject that will connect the source observable to
     * multicast consumers.
     */
    connector?: () => SubjectLike<T>;
    /**
     * If `true`, the resulting observable will reset internal state on error from source and return to a "cold" state. This
     * allows the resulting observable to be "retried" in the event of an error.
     * If `false`, when an error comes from the source it will push the error into the connecting subject, and the subject
     * will remain the connecting subject, meaning the resulting observable will not go "cold" again, and subsequent retries
     * or resubscriptions will resubscribe to that same subject. In all cases, RxJS subjects will emit the same error again, however
     * {@link ReplaySubject} will also push its buffered values before pushing the error.
     * It is also possible to pass a notifier factory returning an `ObservableInput` instead which grants more fine-grained
     * control over how and when the reset should happen. This allows behaviors like conditional or delayed resets.
     */
    resetOnError?: boolean | ((error: any) => ObservableInput<any>);
    /**
     * If `true`, the resulting observable will reset internal state on completion from source and return to a "cold" state. This
     * allows the resulting observable to be "repeated" after it is done.
     * If `false`, when the source completes, it will push the completion through the connecting subject, and the subject
     * will remain the connecting subject, meaning the resulting observable will not go "cold" again, and subsequent repeats
     * or resubscriptions will resubscribe to that same subject.
     * It is also possible to pass a notifier factory returning an `ObservableInput` instead which grants more fine-grained
     * control over how and when the reset should happen. This allows behaviors like conditional or delayed resets.
     */
    resetOnComplete?: boolean | (() => ObservableInput<any>);
    /**
     * If `true`, when the number of subscribers to the resulting observable reaches zero due to those subscribers unsubscribing, the
     * internal state will be reset and the resulting observable will return to a "cold" state. This means that the next
     * time the resulting observable is subscribed to, a new subject will be created and the source will be subscribed to
     * again.
     * If `false`, when the number of subscribers to the resulting observable reaches zero due to unsubscription, the subject
     * will remain connected to the source, and new subscriptions to the result will be connected through that same subject.
     * It is also possible to pass a notifier factory returning an `ObservableInput` instead which grants more fine-grained
     * control over how and when the reset should happen. This allows behaviors like conditional or delayed resets.
     */
    resetOnRefCountZero?: boolean | (() => ObservableInput<any>);
}
export declare function share<T>(): MonoTypeOperatorFunction<T>;
export declare function share<T>(options: ShareConfig<T>): MonoTypeOperatorFunction<T>;
//# sourceMappingURL=share.d.ts.map