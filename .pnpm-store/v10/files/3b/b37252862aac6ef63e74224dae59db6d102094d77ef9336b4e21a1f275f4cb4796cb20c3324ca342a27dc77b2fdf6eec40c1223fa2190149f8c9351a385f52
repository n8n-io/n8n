'use strict';

const iconSet_getIcon = require('./get-icon.cjs');
const iconSet_tree = require('./tree.cjs');
require('../icon/merge.cjs');
require('../icon/defaults.cjs');
require('../icon/transformations.cjs');

function parseIconSet(data, callback) {
  const names = [];
  if (typeof data !== "object" || typeof data.icons !== "object") {
    return names;
  }
  if (data.not_found instanceof Array) {
    data.not_found.forEach((name) => {
      callback(name, null);
      names.push(name);
    });
  }
  const tree = iconSet_tree.getIconsTree(data);
  for (const name in tree) {
    const item = tree[name];
    if (item) {
      callback(name, iconSet_getIcon.internalGetIconData(data, name, item));
      names.push(name);
    }
  }
  return names;
}
async function parseIconSetAsync(data, callback) {
  const names = [];
  if (typeof data !== "object" || typeof data.icons !== "object") {
    return names;
  }
  if (data.not_found instanceof Array) {
    for (let i = 0; i < data.not_found.length; i++) {
      const name = data.not_found[i];
      await callback(name, null);
      names.push(name);
    }
  }
  const tree = iconSet_tree.getIconsTree(data);
  for (const name in tree) {
    const item = tree[name];
    if (item) {
      await callback(name, iconSet_getIcon.internalGetIconData(data, name, item));
      names.push(name);
    }
  }
  return names;
}

exports.parseIconSet = parseIconSet;
exports.parseIconSetAsync = parseIconSetAsync;
