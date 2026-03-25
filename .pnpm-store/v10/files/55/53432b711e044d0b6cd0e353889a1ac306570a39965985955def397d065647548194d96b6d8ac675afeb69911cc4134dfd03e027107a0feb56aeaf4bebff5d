/**
 * NIST secp521r1 aka p521.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { type H2CMethod } from './abstract/hash-to-curve.ts';
import { p521_hasher, p521 as p521n } from './nist.ts';
/** @deprecated use `import { p521 } from '@noble/curves/nist.js';` */
export const p521: typeof p521n = p521n;
/** @deprecated use `import { p521 } from '@noble/curves/nist.js';` */
export const secp521r1: typeof p521n = p521n;
/** @deprecated use `import { p521_hasher } from '@noble/curves/nist.js';` */
export const hashToCurve: H2CMethod<bigint> = /* @__PURE__ */ (() => p521_hasher.hashToCurve)();
/** @deprecated use `import { p521_hasher } from '@noble/curves/nist.js';` */
export const encodeToCurve: H2CMethod<bigint> = /* @__PURE__ */ (() => p521_hasher.encodeToCurve)();
