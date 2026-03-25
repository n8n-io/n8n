/**
 * Utilities for short weierstrass curves, combined with noble-hashes.
 * @module
 */
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { type CurveFn, type CurveType, weierstrass } from './abstract/weierstrass.ts';
import type { CHash } from './utils.ts';

/** connects noble-curves to noble-hashes */
export function getHash(hash: CHash): { hash: CHash } {
  return { hash };
}
/** Same API as @noble/hashes, with ability to create curve with custom hash */
export type CurveDef = Readonly<Omit<CurveType, 'hash'>>;
export type CurveFnWithCreate = CurveFn & { create: (hash: CHash) => CurveFn };

/** @deprecated use new `weierstrass()` and `ecdsa()` methods */
export function createCurve(curveDef: CurveDef, defHash: CHash): CurveFnWithCreate {
  const create = (hash: CHash): CurveFn => weierstrass({ ...curveDef, hash: hash });
  return { ...create(defHash), create };
}
