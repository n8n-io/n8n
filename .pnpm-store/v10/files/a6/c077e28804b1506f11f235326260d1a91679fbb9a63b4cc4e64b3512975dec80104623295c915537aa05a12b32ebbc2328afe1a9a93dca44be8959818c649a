'use strict';

const format = require('./format');

function fillExcept(info, fillExceptKeys, metadataKey) {
  const savedKeys = fillExceptKeys.reduce((acc, key) => {
    acc[key] = info[key];
    delete info[key];
    return acc;
  }, {});
  const metadata = Object.keys(info).reduce((acc, key) => {
    acc[key] = info[key];
    delete info[key];
    return acc;
  }, {});

  Object.assign(info, savedKeys, {
    [metadataKey]: metadata
  });
  return info;
}

function fillWith(info, fillWithKeys, metadataKey) {
  info[metadataKey] = fillWithKeys.reduce((acc, key) => {
    acc[key] = info[key];
    delete info[key];
    return acc;
  }, {});
  return info;
}

/**
 * Adds in a "metadata" object to collect extraneous data, similar to the metadata
 * object in winston 2.x.
 */
module.exports = format((info, opts = {}) => {
  let metadataKey = 'metadata';
  if (opts.key) {
    metadataKey = opts.key;
  }

  let fillExceptKeys = [];
  if (!opts.fillExcept && !opts.fillWith) {
    fillExceptKeys.push('level');
    fillExceptKeys.push('message');
  }

  if (opts.fillExcept) {
    fillExceptKeys = opts.fillExcept;
  }

  if (fillExceptKeys.length > 0) {
    return fillExcept(info, fillExceptKeys, metadataKey);
  }

  if (opts.fillWith) {
    return fillWith(info, opts.fillWith, metadataKey);
  }

  return info;
});
