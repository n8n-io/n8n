"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WasmHistogram = exports.webAssemblyReady = exports.initWebAssemblySync = exports.initWebAssembly = exports.webAssemblyAvailable = void 0;
const generated_wasm_1 = require("./generated-wasm");
const Histogram_1 = require("../Histogram");
// @ts-ignore
const base64 = require("base64-js");
// @ts-ignore
const pako = require("pako");
// @ts-ignore
const loader_1 = require("@assemblyscript/loader");
const isNode = typeof process !== "undefined" && process.version;
// @ts-ignore
const isWorker = typeof importScripts === "function";
exports.webAssemblyAvailable = (() => {
    let available = false;
    if (isNode) {
        // nodejs
        available = "WebAssembly" in global;
    }
    else {
        // browser
        // @ts-ignore
        available = isWorker || "WebAssembly" in window;
    }
    return available;
})();
let wasm = undefined;
const initWebAssembly = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!exports.webAssemblyAvailable) {
        throw new Error("WebAssembly not available here!");
    }
    if (!!wasm) {
        return;
    }
    return (0, loader_1.instantiate)(pako.inflate(base64.toByteArray(generated_wasm_1.BINARY)))
        .then((w) => (wasm = w.exports || w));
});
exports.initWebAssembly = initWebAssembly;
const initWebAssemblySync = () => {
    if (!!wasm) {
        return;
    }
    const w = (0, loader_1.instantiateSync)(pako.inflate(base64.toByteArray(generated_wasm_1.BINARY)));
    wasm = w.exports || w;
};
exports.initWebAssemblySync = initWebAssemblySync;
const webAssemblyReady = () => !!wasm;
exports.webAssemblyReady = webAssemblyReady;
const defaultRequest = {
    bitBucketSize: 32,
    autoResize: true,
    lowestDiscernibleValue: 1,
    highestTrackableValue: 2,
    numberOfSignificantValueDigits: 3
};
const remoteHistogramClassFor = (size) => size === "packed" ? "PackedHistogram" : `Histogram${size}`;
const destroyedWasmHistogram = new Proxy({}, {
    get: function (obj, prop) {
        throw new Error("Cannot use a destroyed histogram");
    }
});
class WasmHistogram {
    constructor(_wasmHistogram, _remoteHistogramClass) {
        this._wasmHistogram = _wasmHistogram;
        this._remoteHistogramClass = _remoteHistogramClass;
        this.tag = Histogram_1.NO_TAG;
        wasm.__pin(this._wasmHistogram);
    }
    static build(request = defaultRequest) {
        if (!(0, exports.webAssemblyReady)()) {
            throw new Error("WebAssembly is not ready yet!");
        }
        const parameters = Object.assign({}, defaultRequest, request);
        const remoteHistogramClass = remoteHistogramClassFor(parameters.bitBucketSize);
        return new WasmHistogram(new wasm[remoteHistogramClass](parameters.lowestDiscernibleValue, parameters.highestTrackableValue, parameters.numberOfSignificantValueDigits, parameters.autoResize), remoteHistogramClass);
    }
    static decode(data, bitBucketSize = 32, minBarForHighestTrackableValue = 0) {
        if (!(0, exports.webAssemblyReady)()) {
            throw new Error("WebAssembly is not ready yet!");
        }
        const remoteHistogramClass = remoteHistogramClassFor(bitBucketSize);
        const decodeFunc = `decode${remoteHistogramClass}`;
        const ptrArr = wasm.__newArray(wasm.UINT8ARRAY_ID, data);
        const wasmHistogram = new WasmHistogram(wasm[remoteHistogramClass].wrap(wasm[decodeFunc](ptrArr, minBarForHighestTrackableValue)), remoteHistogramClass);
        return wasmHistogram;
    }
    get numberOfSignificantValueDigits() {
        return this._wasmHistogram.numberOfSignificantValueDigits;
    }
    get autoResize() {
        return !!this._wasmHistogram.autoResize;
    }
    set autoResize(resize) {
        this._wasmHistogram.autoResize = resize;
    }
    get highestTrackableValue() {
        return this._wasmHistogram.highestTrackableValue;
    }
    set highestTrackableValue(value) {
        this._wasmHistogram.highestTrackableValue = value;
    }
    get startTimeStampMsec() {
        return this._wasmHistogram.startTimeStampMsec;
    }
    set startTimeStampMsec(value) {
        this._wasmHistogram.startTimeStampMsec = value;
    }
    get endTimeStampMsec() {
        return this._wasmHistogram.endTimeStampMsec;
    }
    set endTimeStampMsec(value) {
        this._wasmHistogram.endTimeStampMsec = value;
    }
    get totalCount() {
        return this._wasmHistogram.totalCount;
    }
    get stdDeviation() {
        return this._wasmHistogram.stdDeviation;
    }
    get mean() {
        return this._wasmHistogram.mean;
    }
    get estimatedFootprintInBytes() {
        return 192 + this._wasmHistogram.estimatedFootprintInBytes;
    }
    get minNonZeroValue() {
        return this._wasmHistogram.minNonZeroValue;
    }
    get maxValue() {
        return this._wasmHistogram.maxValue;
    }
    recordValue(value) {
        this._wasmHistogram.recordValue(value);
    }
    recordValueWithCount(value, count) {
        this._wasmHistogram.recordValueWithCount(value, count);
    }
    recordValueWithExpectedInterval(value, expectedIntervalBetweenValueSamples) {
        this._wasmHistogram.recordValueWithExpectedInterval(value, expectedIntervalBetweenValueSamples);
    }
    getValueAtPercentile(percentile) {
        return this._wasmHistogram.getValueAtPercentile(percentile);
    }
    outputPercentileDistribution(percentileTicksPerHalfDistance = 5, outputValueUnitScalingRatio = 1, useCsvFormat = false) {
        // TODO csv
        if (useCsvFormat) {
            throw new Error("CSV output not supported by wasm histograms");
        }
        return wasm.__getString(this._wasmHistogram.outputPercentileDistribution(percentileTicksPerHalfDistance, outputValueUnitScalingRatio));
    }
    isDestroyed() {
        return this._wasmHistogram === destroyedWasmHistogram;
    }
    get summary() {
        return (0, Histogram_1.toSummary)(this);
    }
    toJSON() {
        return this.summary;
    }
    toString() {
        if (this.isDestroyed()) {
            return "Destroyed WASM histogram";
        }
        return `WASM ${this._remoteHistogramClass} ${JSON.stringify(this, null, 2)}`;
    }
    inspect() {
        return this.toString();
    }
    [Symbol.for("nodejs.util.inspect.custom")]() {
        return this.toString();
    }
    addWhileCorrectingForCoordinatedOmission(otherHistogram, expectedIntervalBetweenValueSamples) {
        this._wasmHistogram.addWhileCorrectingForCoordinatedOmission(otherHistogram, expectedIntervalBetweenValueSamples);
    }
    copyCorrectedForCoordinatedOmission(expectedIntervalBetweenValueSamples) {
        return new WasmHistogram(wasm[this._remoteHistogramClass].wrap(this._wasmHistogram.copyCorrectedForCoordinatedOmission(expectedIntervalBetweenValueSamples)), this._remoteHistogramClass);
    }
    add(otherHistogram) {
        if (!(otherHistogram instanceof WasmHistogram)) {
            // should be impossible to be in this situation but actually
            // TypeScript has some flaws...
            throw new Error("Cannot add a regular JS histogram to a WASM histogram");
        }
        this._wasmHistogram[`add${otherHistogram._remoteHistogramClass}`](otherHistogram._wasmHistogram);
    }
    subtract(otherHistogram) {
        if (!(otherHistogram instanceof WasmHistogram)) {
            // should be impossible to be in this situation but actually
            // TypeScript has some flaws...
            throw new Error("Cannot subtract a regular JS histogram to a WASM histogram");
        }
        this._wasmHistogram[`subtract${otherHistogram._remoteHistogramClass}`](otherHistogram._wasmHistogram);
    }
    encode() {
        const ptrArray = wasm.__pin(this._wasmHistogram.encode());
        const array = wasm.__getUint8Array(ptrArray);
        wasm.__unpin(ptrArray);
        return array;
    }
    reset() {
        this.tag = Histogram_1.NO_TAG;
        this._wasmHistogram.reset();
    }
    destroy() {
        wasm.__unpin(this._wasmHistogram);
        this._wasmHistogram = destroyedWasmHistogram;
    }
}
exports.WasmHistogram = WasmHistogram;
//# sourceMappingURL=index.js.map