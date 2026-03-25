import { isRef } from '../../../ref-utils';
import { isEmptyArray, isEmptyObject, isPlainObject } from '../../../utils';

import type { UserContext } from '../../../walk';

export function filter(node: any, ctx: UserContext, criteria: (item: any) => boolean) {
  const { parent, key } = ctx;
  let didDelete = false;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      if (isRef(node[i])) {
        const resolved = ctx.resolve(node[i]);
        if (criteria(resolved.node)) {
          node.splice(i, 1);
          didDelete = true;
          i--;
        }
      }
      if (criteria(node[i])) {
        node.splice(i, 1);
        didDelete = true;
        i--;
      }
    }
  } else if (isPlainObject(node)) {
    for (const key of Object.keys(node)) {
      node = node as any;
      if (isRef(node[key])) {
        const resolved = ctx.resolve(node[key]);
        if (criteria(resolved.node)) {
          delete node[key];
          didDelete = true;
        }
      }
      if (criteria(node[key])) {
        delete node[key];
        didDelete = true;
      }
    }
  }
  if (didDelete && (isEmptyObject(node) || isEmptyArray(node))) {
    delete parent[key];
  }
}

export function checkIfMatchByStrategy(
  nodeValue: any,
  decoratorValue: any,
  strategy: 'all' | 'any'
): boolean {
  if (nodeValue === undefined || decoratorValue === undefined) {
    return false;
  }

  if (!Array.isArray(decoratorValue) && !Array.isArray(nodeValue)) {
    return nodeValue === decoratorValue;
  }

  decoratorValue = toArrayIfNeeded<string>(decoratorValue);
  nodeValue = toArrayIfNeeded<string>(nodeValue);

  if (strategy === 'any') {
    return decoratorValue.some((item: string) => nodeValue.includes(item));
  }
  if (strategy === 'all') {
    return decoratorValue.every((item: string) => nodeValue.includes(item));
  }
  return false;
}

function toArrayIfNeeded<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}
