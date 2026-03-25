import { Subject } from './Subject';
import { Subscriber } from './Subscriber';

/**
 * A variant of Subject that only emits a value when it completes. It will emit
 * its latest value to all its observers on completion.
 *
 * @class AsyncSubject<T>
 */
export class AsyncSubject<T> extends Subject<T> {
  private _value: T | null = null;
  private _hasValue = false;
  private _isComplete = false;

  /** @internal */
  protected _checkFinalizedStatuses(subscriber: Subscriber<T>) {
    const { hasError, _hasValue, _value, thrownError, isStopped, _isComplete } = this;
    if (hasError) {
      subscriber.error(thrownError);
    } else if (isStopped || _isComplete) {
      _hasValue && subscriber.next(_value!);
      subscriber.complete();
    }
  }

  next(value: T): void {
    if (!this.isStopped) {
      this._value = value;
      this._hasValue = true;
    }
  }

  complete(): void {
    const { _hasValue, _value, _isComplete } = this;
    if (!_isComplete) {
      this._isComplete = true;
      _hasValue && super.next(_value!);
      super.complete();
    }
  }
}
