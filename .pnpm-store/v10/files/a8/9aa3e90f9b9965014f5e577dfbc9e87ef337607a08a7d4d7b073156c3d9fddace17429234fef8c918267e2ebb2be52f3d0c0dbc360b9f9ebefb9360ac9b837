'use strict';

const icon_defaults = require('../icon/defaults.cjs');

function expandIconSet(data) {
  const icons = Object.keys(data.icons);
  Object.keys(
    icon_defaults.defaultIconDimensions
  ).forEach((prop) => {
    if (typeof data[prop] !== typeof icon_defaults.defaultIconDimensions[prop]) {
      return;
    }
    const value = data[prop];
    icons.forEach((name) => {
      const item = data.icons[name];
      if (!(prop in item)) {
        item[prop] = value;
      }
    });
    delete data[prop];
  });
}

exports.expandIconSet = expandIconSet;
