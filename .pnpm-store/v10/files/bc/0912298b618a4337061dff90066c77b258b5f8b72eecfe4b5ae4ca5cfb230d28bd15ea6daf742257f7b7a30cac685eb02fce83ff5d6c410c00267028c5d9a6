"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.kill = kill;
const ps_tree_1 = __importDefault(require("ps-tree"));
const cross_spawn_1 = __importDefault(require("cross-spawn"));
const child_process_1 = require("child_process");
let KILL_SIGNAL = '15'; // SIGTERM
let hasPS = true;
const isWindows = process.platform === 'win32';
// discover if the OS has `ps`, and therefore can use psTree
(0, child_process_1.exec)('ps', function (error) {
    if (error) {
        hasPS = false;
    }
});
function kill(child) {
    return new Promise((resolve) => {
        if (isWindows) {
            (0, child_process_1.exec)(`taskkill /pid ${child.pid} /T /F`, () => resolve());
        }
        else {
            if (hasPS) {
                (0, ps_tree_1.default)(child.pid, (err, kids) => {
                    const kidsPIDs = kids.map((p) => p.PID);
                    const args = [`-${KILL_SIGNAL}`, child.pid.toString(), ...kidsPIDs];
                    (0, cross_spawn_1.default)('kill', args).on('close', resolve);
                });
            }
            else {
                (0, child_process_1.exec)(`kill -${KILL_SIGNAL} ${child.pid}`, () => resolve());
            }
        }
    });
}
