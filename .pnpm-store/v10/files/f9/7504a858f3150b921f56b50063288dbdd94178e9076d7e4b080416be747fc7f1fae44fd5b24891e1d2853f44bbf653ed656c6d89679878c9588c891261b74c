import { setTimerId, getTimerId, getDateAttribute } from './utils/dom';
import { formatDiff, diffSec, nextInterval } from './utils/date';
import { getLocale } from './register';
// all realtime timer
var TIMER_POOL = {};
/**
 * clear a timer from pool
 * @param tid
 */
var clear = function (tid) {
    clearTimeout(tid);
    delete TIMER_POOL[tid];
};
// run with timer(setTimeout)
function run(node, date, localeFunc, opts) {
    // clear the node's exist timer
    clear(getTimerId(node));
    var relativeDate = opts.relativeDate, minInterval = opts.minInterval;
    // get diff seconds
    var diff = diffSec(date, relativeDate);
    // render
    node.innerText = formatDiff(diff, localeFunc);
    var tid = setTimeout(function () {
        run(node, date, localeFunc, opts);
    }, Math.min(Math.max(nextInterval(diff), minInterval || 1) * 1000, 0x7fffffff));
    // there is no need to save node in object. Just save the key
    TIMER_POOL[tid] = 0;
    setTimerId(node, tid);
}
/**
 * cancel a timer or all timers
 * @param node - node hosting the time string
 */
export function cancel(node) {
    // cancel one
    if (node)
        clear(getTimerId(node));
    // cancel all
    // @ts-ignore
    else
        Object.keys(TIMER_POOL).forEach(clear);
}
/**
 * render a dom realtime
 * @param nodes
 * @param locale
 * @param opts
 */
export function render(nodes, locale, opts) {
    // by .length
    // @ts-ignore
    var nodeList = nodes.length ? nodes : [nodes];
    nodeList.forEach(function (node) {
        run(node, getDateAttribute(node), getLocale(locale), opts || {});
    });
    return nodeList;
}
//# sourceMappingURL=realtime.js.map