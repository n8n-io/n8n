'use strict';

function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return number;
}

export function toRFCDateTime(date, omitTime, omitDate, milliseconds) {
  var res = omitDate ? '' : (date.getUTCFullYear() +
    '-' + pad(date.getUTCMonth() + 1) +
    '-' + pad(date.getUTCDate()));
  if (!omitTime) {
    res += 'T' + pad(date.getUTCHours()) +
      ':' + pad(date.getUTCMinutes()) +
      ':' + pad(date.getUTCSeconds()) +
      (milliseconds ? '.' + (date.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) : '') +
      'Z';
  }
  return res;
};

export function ensureMinLength(sample, min) {
  if (min > sample.length) {
    return sample.repeat(Math.trunc(min / sample.length) + 1).substring(0, min);
  }
  return sample;
}

export function mergeDeep(...objects) {
  const isObject = obj => obj && typeof obj === 'object';

  return objects.reduce((prev, obj) => {
    Object.keys(obj || {}).forEach(key => {
      const pVal = prev[key];
      const oVal = obj[key];

      if (isObject(pVal) && isObject(oVal)) {
        prev[key] = mergeDeep(pVal, oVal);
      } else {
        prev[key] = oVal;
      }
    });

    return prev;
  }, Array.isArray(objects[objects.length - 1]) ? [] : {});
}

// deterministic UUID sampler

export function uuid(str) {
  var hash = hashCode(str);
  var random = jsf32(hash, hash, hash, hash);
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    var r = (random() * 16) % 16 | 0;
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
}

export function getResultForCircular(type) {
  return {
    value: type === 'object' ?
        {}
      : type === 'array' ? [] : undefined
  };
}

export function popSchemaStack(seenSchemasStack, context) {
  if (context) seenSchemasStack.pop();
}

function hashCode(str) {
  var hash = 0;
  if (str.length == 0) return hash;
  for (var i = 0; i < str.length; i++) {
    var char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

function jsf32(a, b, c, d) {
  return function () {
    a |= 0; b |= 0; c |= 0; d |= 0;
    var t = a - (b << 27 | b >>> 5) | 0;
    a = b ^ (c << 17 | c >>> 15);
    b = c + d | 0;
    c = d + t | 0;
    d = a + t | 0;
    return (d >>> 0) / 4294967296;
  }
}
