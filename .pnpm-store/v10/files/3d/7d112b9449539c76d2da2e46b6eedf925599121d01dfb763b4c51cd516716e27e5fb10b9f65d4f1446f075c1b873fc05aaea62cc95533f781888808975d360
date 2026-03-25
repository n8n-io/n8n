import { clearInterval as clearI, setInterval as setI } from 'worker-timers';
import type { TimerVariant } from './shared';
export interface Timer {
    set: typeof setI;
    clear: typeof clearI;
}
declare const getTimer: (variant: TimerVariant) => Timer;
export default getTimer;
