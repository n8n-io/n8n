'use strict';

const icon_defaults = require('../icon/defaults.cjs');

function minifyIconSet(data) {
  const icons = Object.keys(data.icons);
  Object.keys(
    icon_defaults.defaultIconDimensions
  ).forEach((prop) => {
    if (data[prop] === icon_defaults.defaultIconDimensions[prop]) {
      delete data[prop];
    }
    const defaultValue = icon_defaults.defaultIconDimensions[prop];
    const propType = typeof defaultValue;
    const hasMinifiedDefault = typeof data[prop] === propType && data[prop] !== defaultValue;
    let maxCount = 0;
    let maxValue = null;
    const counters = /* @__PURE__ */ new Map();
    for (let i = 0; i < icons.length; i++) {
      const item = data.icons[icons[i]];
      let value;
      if (typeof item[prop] === propType) {
        value = item[prop];
      } else if (hasMinifiedDefault) {
        value = data[prop];
      } else {
        value = icon_defaults.defaultIconDimensions[prop];
      }
      if (i === 0) {
        maxCount = 1;
        maxValue = value;
        counters.set(value, 1);
        continue;
      }
      if (!counters.has(value)) {
        counters.set(value, 1);
        continue;
      }
      const count = counters.get(value) + 1;
      counters.set(value, count);
      if (count > maxCount) {
        maxCount = count;
        maxValue = value;
      }
    }
    const canMinify = maxValue !== null && maxCount > 1;
    const oldDefault = hasMinifiedDefault ? data[prop] : null;
    const newDefault = canMinify ? maxValue : oldDefault;
    if (newDefault === defaultValue) {
      delete data[prop];
    } else if (canMinify) {
      data[prop] = newDefault;
    }
    icons.forEach((key) => {
      const item = data.icons[key];
      const value = prop in item ? item[prop] : hasMinifiedDefault ? oldDefault : defaultValue;
      if (value === newDefault || newDefault === null && value === defaultValue) {
        delete item[prop];
        return;
      }
      if (canMinify && !(prop in item)) {
        item[prop] = value;
      }
    });
  });
}

exports.minifyIconSet = minifyIconSet;
