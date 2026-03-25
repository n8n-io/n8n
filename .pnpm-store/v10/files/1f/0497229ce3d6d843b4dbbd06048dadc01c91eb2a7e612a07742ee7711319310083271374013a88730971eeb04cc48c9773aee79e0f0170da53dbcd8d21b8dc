"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = exports.defaultRequest = void 0;
const JsHistogramFactory_1 = require("./JsHistogramFactory");
const wasm_1 = require("./wasm");
exports.defaultRequest = {
    bitBucketSize: 32,
    autoResize: true,
    lowestDiscernibleValue: 1,
    highestTrackableValue: 2,
    numberOfSignificantValueDigits: 3,
    useWebAssembly: false,
};
const build = (request = exports.defaultRequest) => {
    const parameters = Object.assign({}, exports.defaultRequest, request);
    if (request.useWebAssembly && wasm_1.webAssemblyAvailable) {
        return wasm_1.WasmHistogram.build(parameters);
    }
    const histogramConstr = (0, JsHistogramFactory_1.constructorFromBucketSize)(parameters.bitBucketSize);
    const histogram = new histogramConstr(parameters.lowestDiscernibleValue, parameters.highestTrackableValue, parameters.numberOfSignificantValueDigits);
    histogram.autoResize = parameters.autoResize;
    return histogram;
};
exports.build = build;
//# sourceMappingURL=HistogramBuilder.js.map