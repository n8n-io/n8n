"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OneShotStartupCheckStrategy = void 0;
const startup_check_strategy_1 = require("./startup-check-strategy");
class OneShotStartupCheckStrategy extends startup_check_strategy_1.StartupCheckStrategy {
    DOCKER_TIMESTAMP_ZERO = "0001-01-01T00:00:00Z";
    isDockerTimestampNonEmpty(dockerTimestamp) {
        return dockerTimestamp !== "" && dockerTimestamp !== this.DOCKER_TIMESTAMP_ZERO && Date.parse(dockerTimestamp) > 0;
    }
    isContainerStopped({ State: state }) {
        if (state.Running || state.Paused) {
            return false;
        }
        return this.isDockerTimestampNonEmpty(state.StartedAt) && this.isDockerTimestampNonEmpty(state.FinishedAt);
    }
    async checkStartupState(dockerClient, containerId) {
        const info = await dockerClient.getContainer(containerId).inspect();
        if (!this.isContainerStopped(info)) {
            return "PENDING";
        }
        if (info.State.ExitCode === 0) {
            return "SUCCESS";
        }
        return "FAIL";
    }
}
exports.OneShotStartupCheckStrategy = OneShotStartupCheckStrategy;
//# sourceMappingURL=one-shot-startup-startegy.js.map