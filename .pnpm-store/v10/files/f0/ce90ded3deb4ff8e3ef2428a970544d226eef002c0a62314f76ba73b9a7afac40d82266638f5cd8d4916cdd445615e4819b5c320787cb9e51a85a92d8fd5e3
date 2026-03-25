

'use strict';


export function isNothing(subject) {
  return (typeof subject === 'undefined') || (null === subject);
}


export function isObject(subject) {
  return (typeof subject === 'object') && (null !== subject);
}


export function toArray(sequence) {
  if (Array.isArray(sequence)) {
    return sequence;
  } else if (isNothing(sequence)) {
    return [];
  }
  return [ sequence ];
}


export function extend(target, source) {
  var index, length, key, sourceKeys;

  if (source) {
    sourceKeys = Object.keys(source);

    for (index = 0, length = sourceKeys.length; index < length; index += 1) {
      key = sourceKeys[index];
      target[key] = source[key];
    }
  }

  return target;
}


export function repeat(string, count) {
  var result = '', cycle;

  for (cycle = 0; cycle < count; cycle += 1) {
    result += string;
  }

  return result;
}


export function isNegativeZero(number) {
  return (0 === number) && (Number.NEGATIVE_INFINITY === 1 / number);
}


