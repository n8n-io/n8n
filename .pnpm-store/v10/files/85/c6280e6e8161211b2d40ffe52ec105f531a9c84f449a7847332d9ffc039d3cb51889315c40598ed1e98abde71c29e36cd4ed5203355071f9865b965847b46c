"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var logger_1 = require("../logger");
var root_1 = require("../logger/root");
var target_mock_1 = require("./target-mock");
exports.LogTargetMock = target_mock_1.LogTargetMock;
exports.extendArray = target_mock_1.extendArray;
var setupForTesting = function (target) {
    if (target === void 0) { target = new target_mock_1.LogTargetMock(); }
    root_1.setup(function () { return createLoggerMock(undefined, target); });
};
exports.setup = setupForTesting;
var createLoggerMock = function (options, target) {
    if (target === void 0) { target = new target_mock_1.LogTargetMock(); }
    var opt = __assign({}, options, { targets: [target] });
    return Object.assign(logger_1.createLogger(opt), { target: target });
};
exports.createLoggerMock = createLoggerMock;
