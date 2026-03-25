import {Timer, now} from "./timer.js";

export default function(callback, delay, time) {
  var t = new Timer, total = delay;
  if (delay == null) return t.restart(callback, delay, time), t;
  t._restart = t.restart;
  t.restart = function(callback, delay, time) {
    delay = +delay, time = time == null ? now() : +time;
    t._restart(function tick(elapsed) {
      elapsed += total;
      t._restart(tick, total += delay, time);
      callback(elapsed);
    }, delay, time);
  }
  t.restart(callback, delay, time);
  return t;
}
