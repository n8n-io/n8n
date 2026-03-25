'use strict';

const icon_defaults = require('../icon/defaults.cjs');
const css_common = require('./common.cjs');
const css_format = require('./format.cjs');
require('../svg/html.cjs');
require('../svg/size.cjs');
require('../svg/url.cjs');
require('../icon/square.cjs');

function getIconCSS(icon, options = {}) {
  const body = options.customise ? options.customise(icon.body) : icon.body;
  const mode = options.mode || (options.color || !body.includes("currentColor") ? "background" : "mask");
  let varName = options.varName;
  if (varName === void 0 && mode === "mask") {
    varName = "svg";
  }
  const newOptions = {
    ...options,
    // Override mode and varName
    mode,
    varName
  };
  if (mode === "background") {
    delete newOptions.varName;
  }
  const rules = {
    ...options.rules,
    ...css_common.getCommonCSSRules(newOptions),
    ...css_common.generateItemCSSRules(
      {
        ...icon_defaults.defaultIconProps,
        ...icon,
        body
      },
      newOptions
    )
  };
  const selector = options.iconSelector || ".icon";
  return css_format.formatCSS(
    [
      {
        selector,
        rules
      }
    ],
    newOptions.format
  );
}
function getIconContentCSS(icon, options) {
  const body = options.customise ? options.customise(icon.body) : icon.body;
  const content = css_common.generateItemContent(
    {
      ...icon_defaults.defaultIconProps,
      ...icon,
      body
    },
    options
  );
  const selector = options.iconSelector || ".icon::after";
  return css_format.formatCSS(
    [
      {
        selector,
        rules: {
          ...options.rules,
          content
        }
      }
    ],
    options.format
  );
}

exports.getIconCSS = getIconCSS;
exports.getIconContentCSS = getIconContentCSS;
