/**
 * NIST secp384r1 aka p384.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { type H2CMethod } from './abstract/hash-to-curve.ts';
import { p384_hasher, p384 as p384n } from './nist.ts';
/** @deprecated use `import { p384 } from '@noble/curves/nist.js';` */
export const p384: typeof p384n = p384n;
/** @deprecated use `import { p384 } from '@noble/curves/nist.js';` */
export const secp384r1: typeof p384n = p384n;
/** @deprecated use `import { p384_hasher } from '@noble/curves/nist.js';` */
export const hashToCurve: H2CMethod<bigint> = /* @__PURE__ */ (() => p384_hasher.hashToCurve)();
/** @deprecated use `import { p384_hasher } from '@noble/curves/nist.js';` */
export const encodeToCurve: H2CMethod<bigint> = /* @__PURE__ */ (() => p384_hasher.encodeToCurve)();
