"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wait = void 0;
const composite_wait_strategy_1 = require("./composite-wait-strategy");
const health_check_wait_strategy_1 = require("./health-check-wait-strategy");
const host_port_wait_strategy_1 = require("./host-port-wait-strategy");
const http_wait_strategy_1 = require("./http-wait-strategy");
const log_wait_strategy_1 = require("./log-wait-strategy");
const one_shot_startup_startegy_1 = require("./one-shot-startup-startegy");
const shell_wait_strategy_1 = require("./shell-wait-strategy");
class Wait {
    static forAll(waitStrategies) {
        return new composite_wait_strategy_1.CompositeWaitStrategy(waitStrategies);
    }
    static forListeningPorts() {
        return new host_port_wait_strategy_1.HostPortWaitStrategy();
    }
    static forLogMessage(message, times = 1) {
        return new log_wait_strategy_1.LogWaitStrategy(message, times);
    }
    static forHealthCheck() {
        return new health_check_wait_strategy_1.HealthCheckWaitStrategy();
    }
    static forOneShotStartup() {
        return new one_shot_startup_startegy_1.OneShotStartupCheckStrategy();
    }
    static forHttp(path, port, options = { abortOnContainerExit: false }) {
        return new http_wait_strategy_1.HttpWaitStrategy(path, port, options);
    }
    static forSuccessfulCommand(command) {
        return new shell_wait_strategy_1.ShellWaitStrategy(command);
    }
}
exports.Wait = Wait;
//# sourceMappingURL=wait.js.map