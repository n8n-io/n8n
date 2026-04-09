/**
 * Calls `unref` on a timer, if the method is available on @param timer.
 *
 * `unref()` is used to allow processes to exit immediately, even if the timer
 * is still running and hasn't resolved yet.
 *
 * Use this in places where code can run on browser or server, since browsers
 * do not support `unref`.
 */
function safeUnref(timer) {
  if (typeof timer === 'object' && typeof timer.unref === 'function') {
    timer.unref();
  }
  return timer;
}

export { safeUnref };
//# sourceMappingURL=timer.js.map
