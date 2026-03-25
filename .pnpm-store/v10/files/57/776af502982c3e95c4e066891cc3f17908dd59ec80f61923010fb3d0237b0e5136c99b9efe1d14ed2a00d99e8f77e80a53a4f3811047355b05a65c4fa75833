import { dateTimestampProvider } from './scheduler/dateTimestampProvider';
export class Scheduler {
    constructor(schedulerActionCtor, now = Scheduler.now) {
        this.schedulerActionCtor = schedulerActionCtor;
        this.now = now;
    }
    schedule(work, delay = 0, state) {
        return new this.schedulerActionCtor(this, work).schedule(state, delay);
    }
}
Scheduler.now = dateTimestampProvider.now;
//# sourceMappingURL=Scheduler.js.map