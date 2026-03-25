import { __extends } from "tslib";
import { Subject } from '../Subject';
import { Subscription } from '../Subscription';
import { SubscriptionLoggable } from './SubscriptionLoggable';
import { applyMixins } from '../util/applyMixins';
import { observeNotification } from '../Notification';
var HotObservable = (function (_super) {
    __extends(HotObservable, _super);
    function HotObservable(messages, scheduler) {
        var _this = _super.call(this) || this;
        _this.messages = messages;
        _this.subscriptions = [];
        _this.scheduler = scheduler;
        return _this;
    }
    HotObservable.prototype._subscribe = function (subscriber) {
        var subject = this;
        var index = subject.logSubscribedFrame();
        var subscription = new Subscription();
        subscription.add(new Subscription(function () {
            subject.logUnsubscribedFrame(index);
        }));
        subscription.add(_super.prototype._subscribe.call(this, subscriber));
        return subscription;
    };
    HotObservable.prototype.setup = function () {
        var subject = this;
        var messagesLength = subject.messages.length;
        var _loop_1 = function (i) {
            (function () {
                var _a = subject.messages[i], notification = _a.notification, frame = _a.frame;
                subject.scheduler.schedule(function () {
                    observeNotification(notification, subject);
                }, frame);
            })();
        };
        for (var i = 0; i < messagesLength; i++) {
            _loop_1(i);
        }
    };
    return HotObservable;
}(Subject));
export { HotObservable };
applyMixins(HotObservable, [SubscriptionLoggable]);
//# sourceMappingURL=HotObservable.js.map