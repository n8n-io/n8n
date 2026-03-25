'use strict';

const svg_build = require('../svg/build.cjs');
const iconSet_getIcon = require('../icon-set/get-icon.cjs');
const loader_utils = require('./utils.cjs');
const createDebugger = require('debug');
const customisations_defaults = require('../customisations/defaults.cjs');
require('../icon/defaults.cjs');
require('../svg/size.cjs');
require('../svg/defs.cjs');
require('../icon/merge.cjs');
require('../icon/transformations.cjs');
require('../icon-set/tree.cjs');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const createDebugger__default = /*#__PURE__*/_interopDefaultCompat(createDebugger);

const debug = createDebugger__default("@iconify-loader:icon");
async function searchForIcon(iconSet, collection, ids, options) {
  let iconData;
  const { customize } = options?.customizations ?? {};
  for (const id of ids) {
    iconData = iconSet_getIcon.getIconData(iconSet, id);
    if (iconData) {
      debug(`${collection}:${id}`);
      let defaultCustomizations = { ...customisations_defaults.defaultIconCustomisations };
      if (typeof customize === "function")
        defaultCustomizations = customize(defaultCustomizations);
      const {
        attributes: { width, height, ...restAttributes },
        body
      } = svg_build.iconToSVG(iconData, defaultCustomizations);
      const scale = options?.scale;
      return await loader_utils.mergeIconProps(
        // DON'T remove space on <svg >
        `<svg >${body}</svg>`,
        collection,
        id,
        options,
        () => {
          return { ...restAttributes };
        },
        (props) => {
          const check = (prop, defaultValue) => {
            const propValue = props[prop];
            let value;
            if (!svg_build.isUnsetKeyword(propValue)) {
              if (propValue) {
                return;
              }
              if (typeof scale === "number") {
                if (scale) {
                  value = `${scale}em`;
                }
              } else {
                value = defaultValue;
              }
            }
            if (!value) {
              delete props[prop];
            } else {
              props[prop] = value;
            }
          };
          check("width", width);
          check("height", height);
        }
      );
    }
  }
}

exports.searchForIcon = searchForIcon;
