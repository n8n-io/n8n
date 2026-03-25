import { Subject } from '../Subject';
import { multicast } from './multicast';
import { connect } from './connect';
export function publish(selector) {
    return selector ? function (source) { return connect(selector)(source); } : function (source) { return multicast(new Subject())(source); };
}
//# sourceMappingURL=publish.js.map