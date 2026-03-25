/// <reference types="node" />

export {};

// internal, not exported
declare const FinalSymbol: unique symbol;
declare const ManySymbol: unique symbol;

/** `none` is a special value, which terminates the chain and returns no value. */
export const none: unique symbol;

/**
 * final() is a helper factory function, which can be used by chained
 * functions to return a special value which terminates the chain and uses
 * the passed value as the result of the chain.
 */
export function final<T>(value: T): { [FinalSymbol]: T };

/**
 * isFinal() is a companion to final(). It checks if a value was marked as
 * final returning a standard truthy/falsy result.
 */
export function isFinal(obj: any): boolean;

/**
 * getFinalValue() is a companion to final() and isFinal(). Its argument
 * should be a wrapped final value. Its return is an unwrapped value.
 */
export function getFinalValue(obj: object): any;

/**
 * many() is a helper factory function, which is used to wrap arrays to be
 * interpreted as multiple values returned from a function.
 *
 * At the moment it is redundant: you can use a simple array to indicate that,
 * but a naked array is being deprecated and in future versions, it will be
 * passed as-is.
 *
 * The thinking is that using many() indicates the intention better.
 */
export function many<T>(values: T[]): { [ManySymbol]: T[] };
export function many(values: any[]): { [ManySymbol]: any[] };

/**
 * isMany() is a companion to many(). It checks if a value was marked as
 * multiple values returning a standard truthy/falsy result.
 */
export function isMany(obj: any): boolean;

/**
 * getManyValues() is a companion to many() and isMany(). Its argument should
 * be a wrapped multiple value. Its return is an unwrapped value (an array of
 * values).
 */
export function getManyValues(obj: object): any[];
