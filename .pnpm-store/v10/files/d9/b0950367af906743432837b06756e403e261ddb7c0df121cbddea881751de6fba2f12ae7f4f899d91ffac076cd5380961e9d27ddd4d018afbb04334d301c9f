import { AsyncAction } from './AsyncAction';
import { immediateProvider } from './immediateProvider';
export class AsapAction extends AsyncAction {
    constructor(scheduler, work) {
        super(scheduler, work);
        this.scheduler = scheduler;
        this.work = work;
    }
    requestAsyncId(scheduler, id, delay = 0) {
        if (delay !== null && delay > 0) {
            return super.requestAsyncId(scheduler, id, delay);
        }
        scheduler.actions.push(this);
        return scheduler._scheduled || (scheduler._scheduled = immediateProvider.setImmediate(scheduler.flush.bind(scheduler, undefined)));
    }
    recycleAsyncId(scheduler, id, delay = 0) {
        var _a;
        if (delay != null ? delay > 0 : this.delay > 0) {
            return super.recycleAsyncId(scheduler, id, delay);
        }
        const { actions } = scheduler;
        if (id != null && ((_a = actions[actions.length - 1]) === null || _a === void 0 ? void 0 : _a.id) !== id) {
            immediateProvider.clearImmediate(id);
            if (scheduler._scheduled === id) {
                scheduler._scheduled = undefined;
            }
        }
        return undefined;
    }
}
//# sourceMappingURL=AsapAction.js.map