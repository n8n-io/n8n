import { AsyncScheduler } from './AsyncScheduler';
export class AnimationFrameScheduler extends AsyncScheduler {
    flush(action) {
        this._active = true;
        let flushId;
        if (action) {
            flushId = action.id;
        }
        else {
            flushId = this._scheduled;
            this._scheduled = undefined;
        }
        const { actions } = this;
        let error;
        action = action || actions.shift();
        do {
            if ((error = action.execute(action.state, action.delay))) {
                break;
            }
        } while ((action = actions[0]) && action.id === flushId && actions.shift());
        this._active = false;
        if (error) {
            while ((action = actions[0]) && action.id === flushId && actions.shift()) {
                action.unsubscribe();
            }
            throw error;
        }
    }
}
//# sourceMappingURL=AnimationFrameScheduler.js.map