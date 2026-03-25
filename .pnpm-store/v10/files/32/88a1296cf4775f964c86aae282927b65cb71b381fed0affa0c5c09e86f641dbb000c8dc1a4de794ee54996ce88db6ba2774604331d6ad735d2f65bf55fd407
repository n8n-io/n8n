import createDebugger from 'debug';
import { mergeIconProps } from './utils.mjs';
import { trimSVG } from '../svg/trim.mjs';
import '../svg/build.mjs';
import '../icon/defaults.mjs';
import '../customisations/defaults.mjs';
import '../svg/size.mjs';
import '../svg/defs.mjs';

const debug = createDebugger("@iconify-loader:custom");
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
    return await mergeIconProps(
      options?.customizations?.trimCustomSvg === true ? trimSVG(result) : result,
      collection,
      icon,
      options,
      void 0
    );
  }
}

export { getCustomIcon };
