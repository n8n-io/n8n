'use strict';

const {none, final, isFinal, getFinalValue, many, isMany, getManyValues} = require('../defs');

const next = async (value, fns, index, push) => {
  for (let i = index; i <= fns.length; ++i) {
    if (value && typeof value.then == 'function') {
      // thenable
      value = await value;
    }
    if (value === none) break;
    if (isFinal(value)) {
      const val = getFinalValue(value);
      val !== none && push(val);
      break;
    }
    if (isMany(value)) {
      const values = getManyValues(value);
      if (i == fns.length) {
        values.forEach(val => push(val));
      } else {
        for (let j = 0; j < values.length; ++j) {
          await next(values[j], fns, i, push);
        }
      }
      break;
    }
    if (value && typeof value.next == 'function') {
      // generator
      for (;;) {
        let data = value.next();
        if (data && typeof data.then == 'function') {
          data = await data;
        }
        if (data.done) break;
        if (i == fns.length) {
          push(data.value);
        } else {
          await next(data.value, fns, i, push);
        }
      }
      break;
    }
    if (i == fns.length) {
      push(value);
      break;
    }
    value = fns[i](value);
  }
};

const nop = () => {};

const asFun = (...fns) => {
  fns = fns.filter(fn => fn);
  if (!fns.length) return nop;
  if (Symbol.asyncIterator && fns[0][Symbol.asyncIterator]) {
    fns[0] = fns[0][Symbol.asyncIterator];
  } else if (Symbol.iterator && fns[0][Symbol.iterator]) {
    fns[0] = fns[0][Symbol.iterator];
  }
  return async value => {
    const results = [];
    await next(value, fns, 0, value => results.push(value));
    switch (results.length) {
      case 0:
        return none;
      case 1:
        return results[0];
    }
    return many(results);
  };
};

asFun.next = next;

asFun.none = none;
asFun.final = final;
asFun.isFinal = isFinal;
asFun.getFinalValue = getFinalValue;
asFun.many = many;
asFun.isMany = isMany;
asFun.getManyValues = getManyValues;

module.exports = asFun;
