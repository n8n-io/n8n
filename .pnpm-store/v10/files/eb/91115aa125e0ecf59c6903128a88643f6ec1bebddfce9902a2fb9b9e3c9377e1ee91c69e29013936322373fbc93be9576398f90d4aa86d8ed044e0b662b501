/**
 * Creates a timer that accepts a `timerCalc` function to perform calculated timeout retries, such as exponential backoff.
 *
 * @example
 *    let reconnectTimer = new Timer(() => this.connect(), function(tries){
 *      return [1000, 5000, 10000][tries - 1] || 10000
 *    })
 *    reconnectTimer.scheduleTimeout() // fires after 1000
 *    reconnectTimer.scheduleTimeout() // fires after 5000
 *    reconnectTimer.reset()
 *    reconnectTimer.scheduleTimeout() // fires after 1000
 */
export default class Timer {
    callback: Function;
    timerCalc: Function;
    timer: number | undefined;
    tries: number;
    constructor(callback: Function, timerCalc: Function);
    reset(): void;
    scheduleTimeout(): void;
}
//# sourceMappingURL=timer.d.ts.map