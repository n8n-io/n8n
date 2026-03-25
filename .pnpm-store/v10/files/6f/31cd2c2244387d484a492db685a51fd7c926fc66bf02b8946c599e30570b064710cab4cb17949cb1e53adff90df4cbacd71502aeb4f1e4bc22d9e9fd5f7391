"use strict";
// this spawns a child process that listens for SIGHUP when the
// parent process exits, and after 200ms, sends a SIGKILL to the
// child, in case it did not terminate.
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchdog = void 0;
const child_process_1 = require("child_process");
const watchdogCode = String.raw `
const pid = parseInt(process.argv[1], 10)
process.title = 'node (foreground-child watchdog pid=' + pid + ')'
if (!isNaN(pid)) {
  let barked = false
  // keepalive
  const interval = setInterval(() => {}, 60000)
  const bark = () => {
    clearInterval(interval)
    if (barked) return
    barked = true
    process.removeListener('SIGHUP', bark)
    setTimeout(() => {
      try {
        process.kill(pid, 'SIGKILL')
        setTimeout(() => process.exit(), 200)
      } catch (_) {}
    }, 500)
  })
  process.on('SIGHUP', bark)
}
`;
/**
 * Pass in a ChildProcess, and this will spawn a watchdog process that
 * will make sure it exits if the parent does, thus preventing any
 * dangling detached zombie processes.
 *
 * If the child ends before the parent, then the watchdog will terminate.
 */
const watchdog = (child) => {
    let dogExited = false;
    const dog = (0, child_process_1.spawn)(process.execPath, ['-e', watchdogCode, String(child.pid)], {
        stdio: 'ignore',
    });
    dog.on('exit', () => (dogExited = true));
    child.on('exit', () => {
        if (!dogExited)
            dog.kill('SIGKILL');
    });
    return dog;
};
exports.watchdog = watchdog;
//# sourceMappingURL=watchdog.js.map