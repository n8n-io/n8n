import { Subject } from '../Subject';
import { Observable } from '../Observable';
import { defer } from './defer';
var DEFAULT_CONFIG = {
    connector: function () { return new Subject(); },
    resetOnDisconnect: true,
};
export function connectable(source, config) {
    if (config === void 0) { config = DEFAULT_CONFIG; }
    var connection = null;
    var connector = config.connector, _a = config.resetOnDisconnect, resetOnDisconnect = _a === void 0 ? true : _a;
    var subject = connector();
    var result = new Observable(function (subscriber) {
        return subject.subscribe(subscriber);
    });
    result.connect = function () {
        if (!connection || connection.closed) {
            connection = defer(function () { return source; }).subscribe(subject);
            if (resetOnDisconnect) {
                connection.add(function () { return (subject = connector()); });
            }
        }
        return connection;
    };
    return result;
}
//# sourceMappingURL=connectable.js.map