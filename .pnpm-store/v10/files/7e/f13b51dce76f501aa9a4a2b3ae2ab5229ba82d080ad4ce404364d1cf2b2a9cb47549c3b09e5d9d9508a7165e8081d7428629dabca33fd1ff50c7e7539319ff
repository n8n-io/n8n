import { AsyncAction } from './AsyncAction';
import { AsyncScheduler } from './AsyncScheduler';

export class AnimationFrameScheduler extends AsyncScheduler {
  public flush(action?: AsyncAction<any>): void {
    this._active = true;
    // The async id that effects a call to flush is stored in _scheduled.
    // Before executing an action, it's necessary to check the action's async
    // id to determine whether it's supposed to be executed in the current
    // flush.
    // Previous implementations of this method used a count to determine this,
    // but that was unsound, as actions that are unsubscribed - i.e. cancelled -
    // are removed from the actions array and that can shift actions that are
    // scheduled to be executed in a subsequent flush into positions at which
    // they are executed within the current flush.
    let flushId;
    if (action) {
      flushId = action.id;
    } else {
      flushId = this._scheduled;
      this._scheduled = undefined;
    }

    const { actions } = this;
    let error: any;
    action = action || actions.shift()!;

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
