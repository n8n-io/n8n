const map = new WeakMap<object, string>();

const TYPES = {
  ArrayBuffer: '[object ArrayBuffer]',
  SharedArrayBuffer: '[object SharedArrayBuffer]',
  Uint8Array: '[object Uint8Array]',
  BigInt64Array: '[object BigInt64Array]',
  BigUint64Array: '[object BigUint64Array]',
  RegExp: '[object RegExp]',
  Map: '[object Map]',
  Date: '[object Date]'
};

/**
 * Retrieves the prototype.toString() of a value.
 * If the value is an object, it will cache the result in a WeakMap for future use.
 */
function getPrototypeString(value: unknown): string {
  let str = map.get(value as object);

  if (!str) {
    str = Object.prototype.toString.call(value);
    if (value !== null && typeof value === 'object') {
      map.set(value, str);
    }
  }
  return str;
}

export function isAnyArrayBuffer(value: unknown): value is ArrayBuffer {
  const type = getPrototypeString(value);
  return type === TYPES.ArrayBuffer || type === TYPES.SharedArrayBuffer;
}

export function isUint8Array(value: unknown): value is Uint8Array {
  const type = getPrototypeString(value);
  return type === TYPES.Uint8Array;
}

export function isBigInt64Array(value: unknown): value is BigInt64Array {
  const type = getPrototypeString(value);
  return type === TYPES.BigInt64Array;
}

export function isBigUInt64Array(value: unknown): value is BigUint64Array {
  const type = getPrototypeString(value);
  return type === TYPES.BigUint64Array;
}

export function isRegExp(d: unknown): d is RegExp {
  const type = getPrototypeString(d);
  return type === TYPES.RegExp;
}

export function isMap(d: unknown): d is Map<unknown, unknown> {
  const type = getPrototypeString(d);
  return type === TYPES.Map;
}

export function isDate(d: unknown): d is Date {
  const type = getPrototypeString(d);
  return type === TYPES.Date;
}

export type InspectFn = (x: unknown, options?: unknown) => string;
export function defaultInspect(x: unknown, _options?: unknown): string {
  return JSON.stringify(x, (k: string, v: unknown) => {
    if (typeof v === 'bigint') {
      return { $numberLong: `${v}` };
    } else if (isMap(v)) {
      return Object.fromEntries(v);
    }
    return v;
  });
}

/** @internal */
type StylizeFunction = (x: string, style: string) => string;
/** @internal */
export function getStylizeFunction(options?: unknown): StylizeFunction | undefined {
  const stylizeExists =
    options != null &&
    typeof options === 'object' &&
    'stylize' in options &&
    typeof options.stylize === 'function';

  if (stylizeExists) {
    return options.stylize as StylizeFunction;
  }
}
