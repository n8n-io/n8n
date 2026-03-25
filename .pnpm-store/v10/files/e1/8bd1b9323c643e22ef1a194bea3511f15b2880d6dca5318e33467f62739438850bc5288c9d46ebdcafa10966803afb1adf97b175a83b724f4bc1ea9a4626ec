"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dom_1 = require("./utils/dom");
var date_1 = require("./utils/date");
var register_1 = require("./register");
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
    clear(dom_1.getTimerId(node));
    var relativeDate = opts.relativeDate, minInterval = opts.minInterval;
    // get diff seconds
    var diff = date_1.diffSec(date, relativeDate);
    // render
    node.innerText = date_1.formatDiff(diff, localeFunc);
    var tid = setTimeout(function () {
        run(node, date, localeFunc, opts);
    }, Math.min(Math.max(date_1.nextInterval(diff), minInterval || 1) * 1000, 0x7fffffff));
    // there is no need to save node in object. Just save the key
    TIMER_POOL[tid] = 0;
    dom_1.setTimerId(node, tid);
}
/**
 * cancel a timer or all timers
 * @param node - node hosting the time string
 */
function cancel(node) {
    // cancel one
    if (node)
        clear(dom_1.getTimerId(node));
    // cancel all
    // @ts-ignore
    else
        Object.keys(TIMER_POOL).forEach(clear);
}
exports.cancel = cancel;
/**
 * render a dom realtime
 * @param nodes
 * @param locale
 * @param opts
 */
function render(nodes, locale, opts) {
    // by .length
    // @ts-ignore
    var nodeList = nodes.length ? nodes : [nodes];
    nodeList.forEach(function (node) {
        run(node, dom_1.getDateAttribute(node), register_1.getLocale(locale), opts || {});
    });
    return nodeList;
}
exports.render = render;
//# sourceMappingURL=realtime.js.map