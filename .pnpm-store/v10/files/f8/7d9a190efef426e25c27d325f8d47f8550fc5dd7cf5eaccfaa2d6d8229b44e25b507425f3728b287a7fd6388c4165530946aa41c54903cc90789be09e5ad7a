"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExclusiveParametersError = exports.CronError = void 0;
class CronError extends Error {
}
exports.CronError = CronError;
class ExclusiveParametersError extends CronError {
    constructor(param1, param2) {
        super(`You can't specify both ${param1} and ${param2}`);
    }
}
exports.ExclusiveParametersError = ExclusiveParametersError;
