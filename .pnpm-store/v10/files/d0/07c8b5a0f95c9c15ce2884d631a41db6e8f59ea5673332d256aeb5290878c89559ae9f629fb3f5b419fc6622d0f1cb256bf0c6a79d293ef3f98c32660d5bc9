import { Observable } from '../Observable';
import { Subscription } from '../Subscription';
import { refCount as higherOrderRefCount } from '../operators/refCount';
import { createOperatorSubscriber } from '../operators/OperatorSubscriber';
import { hasLift } from '../util/lift';
export class ConnectableObservable extends Observable {
    constructor(source, subjectFactory) {
        super();
        this.source = source;
        this.subjectFactory = subjectFactory;
        this._subject = null;
        this._refCount = 0;
        this._connection = null;
        if (hasLift(source)) {
            this.lift = source.lift;
        }
    }
    _subscribe(subscriber) {
        return this.getSubject().subscribe(subscriber);
    }
    getSubject() {
        const subject = this._subject;
        if (!subject || subject.isStopped) {
            this._subject = this.subjectFactory();
        }
        return this._subject;
    }
    _teardown() {
        this._refCount = 0;
        const { _connection } = this;
        this._subject = this._connection = null;
        _connection === null || _connection === void 0 ? void 0 : _connection.unsubscribe();
    }
    connect() {
        let connection = this._connection;
        if (!connection) {
            connection = this._connection = new Subscription();
            const subject = this.getSubject();
            connection.add(this.source.subscribe(createOperatorSubscriber(subject, undefined, () => {
                this._teardown();
                subject.complete();
            }, (err) => {
                this._teardown();
                subject.error(err);
            }, () => this._teardown())));
            if (connection.closed) {
                this._connection = null;
                connection = Subscription.EMPTY;
            }
        }
        return connection;
    }
    refCount() {
        return higherOrderRefCount()(this);
    }
}
//# sourceMappingURL=ConnectableObservable.js.map