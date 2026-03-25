'use strict';

const loader_custom = require('./custom.cjs');
const loader_modern = require('./modern.cjs');
require('debug');
require('./utils.cjs');
require('../svg/build.cjs');
require('../icon/defaults.cjs');
require('../customisations/defaults.cjs');
require('../svg/size.cjs');
require('../svg/defs.cjs');
require('../svg/trim.cjs');
require('../icon-set/get-icon.cjs');
require('../icon/merge.cjs');
require('../icon/transformations.cjs');
require('../icon-set/tree.cjs');

const loadIcon = async (collection, icon, options) => {
  const custom = options?.customCollections?.[collection];
  if (custom) {
    if (typeof custom === "function") {
      let result;
      try {
        result = await custom(icon);
      } catch (err) {
        console.warn(
          `Failed to load custom icon "${icon}" in "${collection}":`,
          err
        );
        return;
      }
      if (result) {
        if (typeof result === "string") {
          return await loader_custom.getCustomIcon(
            () => result,
            collection,
            icon,
            options
          );
        }
        if ("icons" in result) {
          const ids = [
            icon,
            icon.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
            icon.replace(/([a-z])(\d+)/g, "$1-$2")
          ];
          return await loader_modern.searchForIcon(
            result,
            collection,
            ids,
            options
          );
        }
      }
    } else {
      return await loader_custom.getCustomIcon(custom, collection, icon, options);
    }
  }
};

exports.loadIcon = loadIcon;
