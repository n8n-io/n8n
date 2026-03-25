"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Set = exports.Map = exports.version = exports.versionMajorMinor = void 0;
// WARNING: The script `configurePrerelease.ts` uses a regexp to parse out these values.
// If changing the text in this section, be sure to test `configurePrerelease` too.
exports.versionMajorMinor = "4.9";
// The following is baselined as a literal template type without intervention
/** The version of the TypeScript compiler release */
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
exports.version = `${exports.versionMajorMinor}.0-dev`;
/* @internal */
var NativeCollections;
(function (NativeCollections) {
    const globals = typeof globalThis !== "undefined" ? globalThis :
        // @ts-ignore node global
        typeof global !== "undefined" ? global :
            typeof self !== "undefined" ? self :
                undefined;
    /**
     * Returns the native Map implementation if it is available and compatible (i.e. supports iteration).
     */
    function tryGetNativeMap() {
        // Internet Explorer's Map doesn't support iteration, so don't use it.
        const gMap = globals?.Map;
        // eslint-disable-next-line local/no-in-operator
        const constructor = typeof gMap !== "undefined" && "entries" in gMap.prototype && new gMap([[0, 0]]).size === 1 ? gMap : undefined;
        if (!constructor) {
            throw new Error("No compatible Map implementation found.");
        }
        return constructor;
    }
    NativeCollections.tryGetNativeMap = tryGetNativeMap;
    /**
     * Returns the native Set implementation if it is available and compatible (i.e. supports iteration).
     */
    function tryGetNativeSet() {
        // Internet Explorer's Set doesn't support iteration, so don't use it.
        const gSet = globals?.Set;
        // eslint-disable-next-line local/no-in-operator
        const constructor = typeof gSet !== "undefined" && "entries" in gSet.prototype && new gSet([0]).size === 1 ? gSet : undefined;
        if (!constructor) {
            throw new Error("No compatible Set implementation found.");
        }
        return constructor;
    }
    NativeCollections.tryGetNativeSet = tryGetNativeSet;
})(NativeCollections || (NativeCollections = {}));
/* @internal */
exports.Map = NativeCollections.tryGetNativeMap();
/* @internal */
exports.Set = NativeCollections.tryGetNativeSet();
//# sourceMappingURL=corePublic.js.map