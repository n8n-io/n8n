/**
 * NIST secp256r1 aka p256.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { type H2CMethod } from './abstract/hash-to-curve.ts';
import { p256_hasher, p256 as p256n } from './nist.ts';
/** @deprecated use `import { p256 } from '@noble/curves/nist.js';` */
export const p256: typeof p256n = p256n;
/** @deprecated use `import { p256 } from '@noble/curves/nist.js';` */
export const secp256r1: typeof p256n = p256n;
/** @deprecated use `import { p256_hasher } from '@noble/curves/nist.js';` */
export const hashToCurve: H2CMethod<bigint> = /* @__PURE__ */ (() => p256_hasher.hashToCurve)();
/** @deprecated use `import { p256_hasher } from '@noble/curves/nist.js';` */
export const encodeToCurve: H2CMethod<bigint> = /* @__PURE__ */ (() => p256_hasher.encodeToCurve)();
