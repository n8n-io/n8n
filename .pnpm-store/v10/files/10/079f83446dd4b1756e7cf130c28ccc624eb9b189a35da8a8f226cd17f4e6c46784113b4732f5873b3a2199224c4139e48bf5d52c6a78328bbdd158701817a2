import { internalGetIconData } from './get-icon.mjs';
import { getIconsTree } from './tree.mjs';
import '../icon/merge.mjs';
import '../icon/defaults.mjs';
import '../icon/transformations.mjs';

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
  const tree = getIconsTree(data);
  for (const name in tree) {
    const item = tree[name];
    if (item) {
      callback(name, internalGetIconData(data, name, item));
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
  const tree = getIconsTree(data);
  for (const name in tree) {
    const item = tree[name];
    if (item) {
      await callback(name, internalGetIconData(data, name, item));
      names.push(name);
    }
  }
  return names;
}

export { parseIconSet, parseIconSetAsync };
