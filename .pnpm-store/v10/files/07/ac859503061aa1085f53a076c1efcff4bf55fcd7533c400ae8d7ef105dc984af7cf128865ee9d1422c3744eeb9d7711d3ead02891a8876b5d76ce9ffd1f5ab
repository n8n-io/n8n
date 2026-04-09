import { defaultIconProps } from '../icon/defaults.mjs';
import { getCommonCSSRules, generateItemCSSRules, generateItemContent } from './common.mjs';
import { formatCSS } from './format.mjs';
import '../svg/html.mjs';
import '../svg/size.mjs';
import '../svg/url.mjs';
import '../icon/square.mjs';
import '../svg/build.mjs';
import '../customisations/defaults.mjs';
import '../svg/defs.mjs';

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
    ...getCommonCSSRules(newOptions),
    ...generateItemCSSRules(
      {
        ...defaultIconProps,
        ...icon,
        body
      },
      newOptions
    )
  };
  const selector = options.iconSelector || ".icon";
  return formatCSS(
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
  const content = generateItemContent(
    {
      ...defaultIconProps,
      ...icon,
      body
    },
    options
  );
  const selector = options.iconSelector || ".icon::after";
  return formatCSS(
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

export { getIconCSS, getIconContentCSS };
