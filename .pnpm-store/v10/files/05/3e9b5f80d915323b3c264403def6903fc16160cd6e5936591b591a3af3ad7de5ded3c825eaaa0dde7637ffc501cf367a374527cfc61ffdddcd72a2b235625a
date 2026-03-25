'use strict';

const icon_merge = require('../icon/merge.cjs');
const iconSet_tree = require('./tree.cjs');
require('../icon/defaults.cjs');
require('../icon/transformations.cjs');

function internalGetIconData(data, name, tree) {
  const icons = data.icons;
  const aliases = data.aliases || /* @__PURE__ */ Object.create(null);
  let currentProps = {};
  function parse(name2) {
    currentProps = icon_merge.mergeIconData(
      icons[name2] || aliases[name2],
      currentProps
    );
  }
  parse(name);
  tree.forEach(parse);
  return icon_merge.mergeIconData(data, currentProps);
}
function getIconData(data, name) {
  if (data.icons[name]) {
    return internalGetIconData(data, name, []);
  }
  const tree = iconSet_tree.getIconsTree(data, [name])[name];
  return tree ? internalGetIconData(data, name, tree) : null;
}

exports.getIconData = getIconData;
exports.internalGetIconData = internalGetIconData;
