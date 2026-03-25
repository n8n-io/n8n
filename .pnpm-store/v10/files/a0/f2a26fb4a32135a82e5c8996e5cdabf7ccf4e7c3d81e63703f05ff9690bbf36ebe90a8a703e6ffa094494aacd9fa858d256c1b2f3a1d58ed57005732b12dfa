/**
 * Utilities for short weierstrass curves, combined with noble-hashes.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { weierstrass } from "./abstract/weierstrass.js";
/** connects noble-curves to noble-hashes */
export function getHash(hash) {
    return { hash };
}
/** @deprecated use new `weierstrass()` and `ecdsa()` methods */
export function createCurve(curveDef, defHash) {
    const create = (hash) => weierstrass({ ...curveDef, hash: hash });
    return { ...create(defHash), create };
}
//# sourceMappingURL=_shortw_utils.js.map