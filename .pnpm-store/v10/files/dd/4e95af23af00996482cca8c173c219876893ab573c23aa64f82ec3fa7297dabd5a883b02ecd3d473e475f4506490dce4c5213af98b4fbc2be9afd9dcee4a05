export function getSymbolIterator(): symbol {
  if (typeof Symbol !== 'function' || !Symbol.iterator) {
    return '@@iterator' as any;
  }

  return Symbol.iterator;
}

export const iterator = getSymbolIterator();
