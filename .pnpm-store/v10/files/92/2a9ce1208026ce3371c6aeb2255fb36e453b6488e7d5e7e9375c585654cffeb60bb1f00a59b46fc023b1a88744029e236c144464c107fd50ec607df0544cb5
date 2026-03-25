'use strict';

const createDebugger = require('debug');
const loader_utils = require('./utils.cjs');
const svg_trim = require('../svg/trim.cjs');
require('../svg/build.cjs');
require('../icon/defaults.cjs');
require('../customisations/defaults.cjs');
require('../svg/size.cjs');
require('../svg/defs.cjs');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const createDebugger__default = /*#__PURE__*/_interopDefaultCompat(createDebugger);

const debug = createDebugger__default("@iconify-loader:custom");
async function getCustomIcon(custom, collection, icon, options) {
  let result;
  debug(`${collection}:${icon}`);
  try {
    if (typeof custom === "function") {
      result = await custom(icon);
    } else {
      const inline = custom[icon];
      result = typeof inline === "function" ? await inline() : inline;
    }
  } catch (err) {
    console.warn(
      `Failed to load custom icon "${icon}" in "${collection}":`,
      err
    );
    return;
  }
  if (result) {
    const cleanupIdx = result.indexOf("<svg");
    if (cleanupIdx > 0)
      result = result.slice(cleanupIdx);
    const { transform } = options?.customizations ?? {};
    result = typeof transform === "function" ? await transform(result, collection, icon) : result;
    if (!result.startsWith("<svg")) {
      console.warn(
        `Custom icon "${icon}" in "${collection}" is not a valid SVG`
      );
      return result;
    }
    return await loader_utils.mergeIconProps(
      options?.customizations?.trimCustomSvg === true ? svg_trim.trimSVG(result) : result,
      collection,
      icon,
      options,
      void 0
    );
  }
}

exports.getCustomIcon = getCustomIcon;
