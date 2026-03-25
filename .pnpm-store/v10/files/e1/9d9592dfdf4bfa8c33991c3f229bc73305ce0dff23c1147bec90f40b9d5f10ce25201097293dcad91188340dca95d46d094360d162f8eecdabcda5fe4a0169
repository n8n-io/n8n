'use strict';

const icon_defaults = require('./defaults.cjs');
const icon_transformations = require('./transformations.cjs');

function mergeIconData(parent, child) {
  const result = icon_transformations.mergeIconTransformations(parent, child);
  for (const key in icon_defaults.defaultExtendedIconProps) {
    if (key in icon_defaults.defaultIconTransformations) {
      if (key in parent && !(key in result)) {
        result[key] = icon_defaults.defaultIconTransformations[key];
      }
    } else if (key in child) {
      result[key] = child[key];
    } else if (key in parent) {
      result[key] = parent[key];
    }
  }
  return result;
}

exports.mergeIconData = mergeIconData;
