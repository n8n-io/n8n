import { isPlainObject, isString as runOnValue, isTruthy } from '../../../utils';
import { isOrdered, getIntersectionLength, regexFromString } from './utils';

import type { AssertionContext, AssertResult, CustomFunction } from '../../../config/types';
import type { Location } from '../../../ref-utils';
import type { OrderOptions, OrderDirection } from './utils';

export type AssertionFnContext = AssertionContext & { baseLocation: Location; rawValue?: any };

export type AssertionFn = (value: any, condition: any, ctx: AssertionFnContext) => AssertResult[];

export type Asserts = {
  pattern: AssertionFn;
  notPattern: AssertionFn;
  enum: AssertionFn;
  defined: AssertionFn;
  required: AssertionFn;
  disallowed: AssertionFn;
  undefined: AssertionFn;
  nonEmpty: AssertionFn;
  minLength: AssertionFn;
  maxLength: AssertionFn;
  casing: AssertionFn;
  sortOrder: AssertionFn;
  mutuallyExclusive: AssertionFn;
  mutuallyRequired: AssertionFn;
  requireAny: AssertionFn;
  ref: AssertionFn;
  const: AssertionFn;
};

export const runOnKeysSet = new Set<keyof Asserts>([
  'mutuallyExclusive',
  'mutuallyRequired',
  'enum',
  'pattern',
  'notPattern',
  'minLength',
  'maxLength',
  'casing',
  'sortOrder',
  'disallowed',
  'required',
  'requireAny',
  'ref',
  'const',
  'defined', // In case if `property` for assertions is not added
]);
export const runOnValuesSet = new Set<keyof Asserts>([
  'pattern',
  'notPattern',
  'enum',
  'defined',
  'undefined',
  'nonEmpty',
  'minLength',
  'maxLength',
  'casing',
  'sortOrder',
  'ref',
  'const',
]);

export const asserts: Asserts = {
  pattern: (
    value: string | string[],
    condition: string,
    { baseLocation, rawValue }: AssertionFnContext
  ) => {
    if (typeof value === 'undefined' || isPlainObject(value)) return []; // property doesn't exist or is an object, no need to lint it with this assert
    const values = Array.isArray(value) ? value : [value];
    const regex = regexFromString(condition);

    return values
      .map(
        (_val) =>
          !regex?.test(_val) && {
            message: `"${_val}" should match a regex ${condition}`,
            location: runOnValue(value)
              ? baseLocation
              : isPlainObject(rawValue)
              ? baseLocation.child(_val).key()
              : baseLocation.key(),
          }
      )
      .filter(isTruthy);
  },
  notPattern: (
    value: string | string[],
    condition: string,
    { baseLocation, rawValue }: AssertionFnContext
  ) => {
    if (typeof value === 'undefined' || isPlainObject(value)) return []; // property doesn't exist or is an object, no need to lint it with this assert
    const values = Array.isArray(value) ? value : [value];
    const regex = regexFromString(condition);

    return values
      .map(
        (_val) =>
          regex?.test(_val) && {
            message: `"${_val}" should not match a regex ${condition}`,
            location: runOnValue(value)
              ? baseLocation
              : isPlainObject(rawValue)
              ? baseLocation.child(_val).key()
              : baseLocation.key(),
          }
      )
      .filter(isTruthy);
  },
  enum: (value: string | string[], condition: string[], { baseLocation }: AssertionFnContext) => {
    if (typeof value === 'undefined' || isPlainObject(value)) return []; // property doesn't exist or is an object, no need to lint it with this assert
    const values = Array.isArray(value) ? value : [value];
    return values
      .map(
        (_val) =>
          !condition.includes(_val) && {
            message: `"${_val}" should be one of the predefined values`,
            location: runOnValue(value) ? baseLocation : baseLocation.child(_val).key(),
          }
      )
      .filter(isTruthy);
  },
  defined: (
    value: string | undefined,
    condition: boolean = true,
    { baseLocation }: AssertionFnContext
  ) => {
    const isDefined = typeof value !== 'undefined';
    const isValid = condition ? isDefined : !isDefined;
    return isValid
      ? []
      : [
          {
            message: condition ? `Should be defined` : 'Should be not defined',
            location: baseLocation,
          },
        ];
  },
  required: (value: string[], keys: string[], { baseLocation }: AssertionFnContext) => {
    return keys
      .map(
        (requiredKey) =>
          !value.includes(requiredKey) && {
            message: `${requiredKey} is required`,
            location: baseLocation.key(),
          }
      )
      .filter(isTruthy);
  },
  disallowed: (
    value: string | string[],
    condition: string[],
    { baseLocation }: AssertionFnContext
  ) => {
    if (typeof value === 'undefined' || isPlainObject(value)) return []; // property doesn't exist or is an object, no need to lint it with this assert
    const values = Array.isArray(value) ? value : [value];
    return values
      .map(
        (_val) =>
          condition.includes(_val) && {
            message: `"${_val}" is disallowed`,
            location: runOnValue(value) ? baseLocation : baseLocation.child(_val).key(),
          }
      )
      .filter(isTruthy);
  },
  const: (
    value: string | number | boolean | string[] | number[],
    condition: string | number | boolean,
    { baseLocation }: AssertionFnContext
  ) => {
    if (typeof value === 'undefined') return [];

    if (Array.isArray(value)) {
      return value
        .map(
          (_val) =>
            condition !== _val && {
              message: `"${_val}" should be equal ${condition} `,
              location: runOnValue(value) ? baseLocation : baseLocation.child(_val).key(),
            }
        )
        .filter(isTruthy);
    } else {
      return value !== condition
        ? [
            {
              message: `${value} should be equal ${condition}`,
              location: baseLocation,
            },
          ]
        : [];
    }
  },
  undefined: (value: unknown, condition: boolean = true, { baseLocation }: AssertionFnContext) => {
    const isUndefined = typeof value === 'undefined';
    const isValid = condition ? isUndefined : !isUndefined;
    return isValid
      ? []
      : [
          {
            message: condition ? `Should not be defined` : 'Should be defined',
            location: baseLocation,
          },
        ];
  },
  nonEmpty: (
    value: string | undefined | null,
    condition: boolean = true,
    { baseLocation }: AssertionFnContext
  ) => {
    const isEmpty = typeof value === 'undefined' || value === null || value === '';
    const isValid = condition ? !isEmpty : isEmpty;
    return isValid
      ? []
      : [
          {
            message: condition ? `Should not be empty` : 'Should be empty',
            location: baseLocation,
          },
        ];
  },
  minLength: (value: string | any[], condition: number, { baseLocation }: AssertionFnContext) => {
    if (typeof value === 'undefined' || value.length >= condition) return []; // property doesn't exist, no need to lint it with this assert
    return [
      {
        message: `Should have at least ${condition} characters`,
        location: baseLocation,
      },
    ];
  },
  maxLength: (value: string | any[], condition: number, { baseLocation }: AssertionFnContext) => {
    if (typeof value === 'undefined' || value.length <= condition) return []; // property doesn't exist, no need to lint it with this assert
    return [
      {
        message: `Should have at most ${condition} characters`,
        location: baseLocation,
      },
    ];
  },
  casing: (value: string | string[], condition: string, { baseLocation }: AssertionFnContext) => {
    if (typeof value === 'undefined' || isPlainObject(value)) return []; // property doesn't exist or is an object, no need to lint it with this assert
    const values = Array.isArray(value) ? value : [value];
    const casingRegexes: Record<string, RegExp> = {
      camelCase: /^[a-z][a-zA-Z0-9]*$/g,
      'kebab-case': /^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/g,
      snake_case: /^([a-z][a-z0-9]*)(_[a-z0-9]+)*$/g,
      PascalCase: /^[A-Z][a-zA-Z0-9]+$/g,
      MACRO_CASE: /^([A-Z][A-Z0-9]*)(_[A-Z0-9]+)*$/g,
      'COBOL-CASE': /^([A-Z][A-Z0-9]*)(-[A-Z0-9]+)*$/g,
      flatcase: /^[a-z][a-z0-9]+$/g,
    };
    return values
      .map(
        (_val) =>
          !_val.match(casingRegexes[condition]) && {
            message: `"${_val}" should use ${condition}`,
            location: runOnValue(value) ? baseLocation : baseLocation.child(_val).key(),
          }
      )
      .filter(isTruthy);
  },
  sortOrder: (
    value: unknown[],
    condition: OrderOptions | OrderDirection,
    { baseLocation }: AssertionFnContext
  ) => {
    const direction = (condition as OrderOptions).direction || (condition as OrderDirection);
    const property = (condition as OrderOptions).property;
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && !property) {
      return [
        {
          message: `Please define a property to sort objects by`,
          location: baseLocation,
        },
      ];
    }
    if (typeof value === 'undefined' || isOrdered(value, condition)) return [];

    return [
      {
        message: `Should be sorted in ${
          direction === 'asc' ? 'an ascending' : 'a descending'
        } order${property ? ` by property ${property}` : ''}`,
        location: baseLocation,
      },
    ];
  },
  mutuallyExclusive: (
    value: string[],
    condition: string[],
    { baseLocation }: AssertionFnContext
  ) => {
    if (getIntersectionLength(value, condition) < 2) return [];
    return [
      {
        message: `${condition.join(', ')} keys should be mutually exclusive`,
        location: baseLocation.key(),
      },
    ];
  },
  mutuallyRequired: (
    value: string[],
    condition: string[],
    { baseLocation }: AssertionFnContext
  ) => {
    const isValid =
      getIntersectionLength(value, condition) > 0
        ? getIntersectionLength(value, condition) === condition.length
        : true;
    return isValid
      ? []
      : [
          {
            message: `Properties ${condition.join(', ')} are mutually required`,
            location: baseLocation.key(),
          },
        ];
  },
  requireAny: (value: string[], condition: string[], { baseLocation }: AssertionFnContext) => {
    return getIntersectionLength(value, condition) >= 1
      ? []
      : [
          {
            message: `Should have any of ${condition.join(', ')}`,
            location: baseLocation.key(),
          },
        ];
  },
  ref: (
    _value: unknown,
    condition: string | boolean,
    { baseLocation, rawValue }: AssertionFnContext
  ) => {
    if (typeof rawValue === 'undefined') return []; // property doesn't exist, no need to lint it with this assert
    const hasRef = rawValue.hasOwnProperty('$ref');
    if (typeof condition === 'boolean') {
      const isValid = condition ? hasRef : !hasRef;
      return isValid
        ? []
        : [
            {
              message: condition ? `should use $ref` : 'should not use $ref',
              location: hasRef ? baseLocation : baseLocation.key(),
            },
          ];
    }
    const regex = regexFromString(condition);
    const isValid = hasRef && regex?.test(rawValue['$ref']);
    return isValid
      ? []
      : [
          {
            message: `$ref value should match ${condition}`,
            location: hasRef ? baseLocation : baseLocation.key(),
          },
        ];
  },
};

export function buildAssertCustomFunction(fn: CustomFunction): AssertionFn {
  return (value: string[], options: any, ctx: AssertionFnContext) =>
    fn.call(null, value, options, ctx);
}
