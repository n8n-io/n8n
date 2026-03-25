// @flow
// This file is not actually executed
// It is just used by flow for typing

const prefix: string = 'Invariant failed';

export default function invariant(condition: mixed, message?: string | (() => string)) {
  if (condition) {
    return;
  }
  throw new Error(`${prefix}: ${message || ''}`);
}
