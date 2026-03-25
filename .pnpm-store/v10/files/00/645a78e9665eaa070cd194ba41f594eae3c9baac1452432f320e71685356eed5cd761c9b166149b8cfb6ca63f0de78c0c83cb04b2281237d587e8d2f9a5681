'use strict';

const icon_defaults = require('../icon/defaults.cjs');
const iconSet_tree = require('./tree.cjs');

const propsToCopy = Object.keys(icon_defaults.defaultIconDimensions).concat([
  "provider"
]);
function getIcons(data, names, not_found) {
  const icons = /* @__PURE__ */ Object.create(null);
  const aliases = /* @__PURE__ */ Object.create(null);
  const result = {
    prefix: data.prefix,
    icons
  };
  const sourceIcons = data.icons;
  const sourceAliases = data.aliases || /* @__PURE__ */ Object.create(null);
  if (data.lastModified) {
    result.lastModified = data.lastModified;
  }
  const tree = iconSet_tree.getIconsTree(data, names);
  let empty = true;
  for (const name in tree) {
    if (!tree[name]) {
      if (not_found && names.indexOf(name) !== -1) {
        (result.not_found || (result.not_found = [])).push(name);
      }
    } else if (sourceIcons[name]) {
      icons[name] = {
        ...sourceIcons[name]
      };
      empty = false;
    } else {
      aliases[name] = {
        ...sourceAliases[name]
      };
      result.aliases = aliases;
    }
  }
  propsToCopy.forEach((attr) => {
    if (attr in data) {
      result[attr] = data[attr];
    }
  });
  return empty && not_found !== true ? null : result;
}

exports.getIcons = getIcons;
exports.propsToCopy = propsToCopy;
