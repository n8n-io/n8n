import type { AnyNode, Element } from 'domhandler';
import type { Cheerio } from '../cheerio.js';
import type { prop } from './attributes.js';

type ExtractDescriptorFn = (
  el: Element,
  key: string,
  // TODO: This could be typed with ExtractedMap
  obj: Record<string, unknown>,
) => unknown;

interface ExtractDescriptor {
  selector: string;
  value?: string | ExtractDescriptorFn | ExtractMap;
}

type ExtractValue = string | ExtractDescriptor | [string | ExtractDescriptor];

export interface ExtractMap {
  [key: string]: ExtractValue;
}

type ExtractedValue<V extends ExtractValue, M extends ExtractMap> = V extends [
  string | ExtractDescriptor,
]
  ? NonNullable<ExtractedValue<V[0], M>>[]
  : V extends string
    ? string | undefined
    : V extends ExtractDescriptor
      ? V['value'] extends ExtractMap
        ? ExtractedMap<V['value']> | undefined
        : V['value'] extends ExtractDescriptorFn
          ? ReturnType<V['value']> | undefined
          : ReturnType<typeof prop> | undefined
      : never;

export type ExtractedMap<M extends ExtractMap> = {
  [key in keyof M]: ExtractedValue<M[key], M>;
};

function getExtractDescr(
  descr: string | ExtractDescriptor,
): Required<ExtractDescriptor> {
  if (typeof descr === 'string') {
    return { selector: descr, value: 'textContent' };
  }

  return {
    selector: descr.selector,
    value: descr.value ?? 'textContent',
  };
}

/**
 * Extract multiple values from a document, and store them in an object.
 *
 * @param map - An object containing key-value pairs. The keys are the names of
 *   the properties to be created on the object, and the values are the
 *   selectors to be used to extract the values.
 * @returns An object containing the extracted values.
 */
export function extract<M extends ExtractMap, T extends AnyNode>(
  this: Cheerio<T>,
  map: M,
): ExtractedMap<M> {
  const ret: Record<string, unknown> = {};

  for (const key in map) {
    const descr = map[key];
    const isArray = Array.isArray(descr);

    const { selector, value } = getExtractDescr(isArray ? descr[0] : descr);

    const fn: ExtractDescriptorFn =
      typeof value === 'function'
        ? value
        : typeof value === 'string'
          ? (el: Element) => this._make(el).prop(value)
          : (el: Element) => this._make(el).extract(value);

    if (isArray) {
      ret[key] = this._findBySelector(selector, Number.POSITIVE_INFINITY)
        .map((_, el) => fn(el, key, ret))
        .get();
    } else {
      const $ = this._findBySelector(selector, 1);
      ret[key] = $.length > 0 ? fn($[0], key, ret) : undefined;
    }
  }

  return ret as ExtractedMap<M>;
}
