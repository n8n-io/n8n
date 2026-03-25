import { __extends } from "tslib";
import { Observable } from '../Observable';
import { Subscription } from '../Subscription';
import { SubscriptionLoggable } from './SubscriptionLoggable';
import { applyMixins } from '../util/applyMixins';
import { observeNotification } from '../Notification';
var ColdObservable = (function (_super) {
    __extends(ColdObservable, _super);
    function ColdObservable(messages, scheduler) {
        var _this = _super.call(this, function (subscriber) {
            var observable = this;
            var index = observable.logSubscribedFrame();
            var subscription = new Subscription();
            subscription.add(new Subscription(function () {
                observable.logUnsubscribedFrame(index);
            }));
            observable.scheduleMessages(subscriber);
            return subscription;
        }) || this;
        _this.messages = messages;
        _this.subscriptions = [];
        _this.scheduler = scheduler;
        return _this;
    }
    ColdObservable.prototype.scheduleMessages = function (subscriber) {
        var messagesLength = this.messages.length;
        for (var i = 0; i < messagesLength; i++) {
            var message = this.messages[i];
            subscriber.add(this.scheduler.schedule(function (state) {
                var _a = state, notification = _a.message.notification, destination = _a.subscriber;
                observeNotification(notification, destination);
            }, message.frame, { message: message, subscriber: subscriber }));
        }
    };
    return ColdObservable;
}(Observable));
export { ColdObservable };
applyMixins(ColdObservable, [SubscriptionLoggable]);
//# sourceMappingURL=ColdObservable.js.map