/*!
 * vue-router v4.6.4
 * (c) 2025 Eduardo San Martin Morote
 * @license MIT
 */
import { A as MatcherPatternPathDynamic_ParamOptions, D as MatcherPatternHash, E as MatcherPattern, M as MatcherQueryParams, N as MatcherQueryParamsValue, O as MatcherPatternPath, P as ParamParser, S as PARAM_PARSER_BOOL, T as MatcherParamsFormatted, _ as MatcherPatternQueryParam, a as EXPERIMENTAL_RouteRecord_Base, b as defineQueryParamParser, c as EXPERIMENTAL_Router, d as EXPERIMENTAL_Router_Base, f as experimental_createRouter, g as MatcherPatternQuery, h as createFixedResolver, i as EXPERIMENTAL_RouteRecordRaw, j as MatcherPatternPathStatic, k as MatcherPatternPathDynamic, l as EXPERIMENTAL_RouterOptions, m as normalizeRouteRecord, n as EXPERIMENTAL_RouteRecordNormalized_Group, o as EXPERIMENTAL_RouteRecord_Group, p as mergeRouteRecord, r as EXPERIMENTAL_RouteRecordNormalized_Matchable, s as EXPERIMENTAL_RouteRecord_Matchable, t as EXPERIMENTAL_RouteRecordNormalized, u as EXPERIMENTAL_RouterOptions_Base, v as defineParamParser, w as EmptyParams, x as PARAM_PARSER_INT, y as definePathParamParser } from "../router-CWoNjPRp.mjs";

//#region src/experimental/route-resolver/matchers/errors.d.ts
/**
 * Error throw when a matcher matches by regex but validation fails.
 */
declare class MatchMiss extends Error {
  name: string;
}
/**
 * Helper to create a {@link MatchMiss} error.
 * @param args - Arguments to pass to the `MatchMiss` constructor.
 *
 * @example
 * ```ts
 * throw miss()
 * // in a number param matcher
 * throw miss('Number must be finite')
 * ```
 */
declare const miss: (...args: ConstructorParameters<typeof MatchMiss>) => MatchMiss;
//#endregion
//#region src/experimental/index.d.ts
declare module 'vue-router' {
  interface RouteLocationMatched {
    /**
     * The experimental router uses a `parent` property instead of `children`.
     */
    children?: never;
  }
}
//#endregion
export { type EXPERIMENTAL_RouteRecordNormalized, type EXPERIMENTAL_RouteRecordNormalized_Group, type EXPERIMENTAL_RouteRecordNormalized_Matchable, type EXPERIMENTAL_RouteRecordRaw, type EXPERIMENTAL_RouteRecord_Base, type EXPERIMENTAL_RouteRecord_Group, type EXPERIMENTAL_RouteRecord_Matchable, type EXPERIMENTAL_Router, type EXPERIMENTAL_RouterOptions, type EXPERIMENTAL_RouterOptions_Base, type EXPERIMENTAL_Router_Base, type EmptyParams, MatchMiss, type MatcherParamsFormatted, type MatcherPattern, type MatcherPatternHash, type MatcherPatternPath, MatcherPatternPathDynamic, type MatcherPatternPathDynamic_ParamOptions, MatcherPatternPathStatic, type MatcherPatternQuery, MatcherPatternQueryParam, type MatcherQueryParams, type MatcherQueryParamsValue, PARAM_PARSER_BOOL, PARAM_PARSER_INT, type ParamParser, mergeRouteRecord as _mergeRouteRecord, createFixedResolver, defineParamParser, definePathParamParser, defineQueryParamParser, experimental_createRouter, miss, normalizeRouteRecord };