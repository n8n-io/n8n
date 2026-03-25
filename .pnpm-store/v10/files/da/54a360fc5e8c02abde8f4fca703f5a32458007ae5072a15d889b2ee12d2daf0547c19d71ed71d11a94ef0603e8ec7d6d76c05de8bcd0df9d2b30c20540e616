"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHash = getHash;
exports.createCurve = createCurve;
/**
 * Utilities for short weierstrass curves, combined with noble-hashes.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const weierstrass_ts_1 = require("./abstract/weierstrass.js");
/** connects noble-curves to noble-hashes */
function getHash(hash) {
    return { hash };
}
/** @deprecated use new `weierstrass()` and `ecdsa()` methods */
function createCurve(curveDef, defHash) {
    const create = (hash) => (0, weierstrass_ts_1.weierstrass)({ ...curveDef, hash: hash });
    return { ...create(defHash), create };
}
//# sourceMappingURL=_shortw_utils.js.map