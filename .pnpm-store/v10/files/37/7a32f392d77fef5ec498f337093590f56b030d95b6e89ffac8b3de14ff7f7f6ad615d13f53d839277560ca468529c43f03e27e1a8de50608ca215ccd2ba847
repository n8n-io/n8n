import { iconToSVG, isUnsetKeyword } from '../svg/build.mjs';
import { getIconData } from '../icon-set/get-icon.mjs';
import { mergeIconProps } from './utils.mjs';
import createDebugger from 'debug';
import { defaultIconCustomisations } from '../customisations/defaults.mjs';
import '../icon/defaults.mjs';
import '../svg/size.mjs';
import '../svg/defs.mjs';
import '../icon/merge.mjs';
import '../icon/transformations.mjs';
import '../icon-set/tree.mjs';

const debug = createDebugger("@iconify-loader:icon");
async function searchForIcon(iconSet, collection, ids, options) {
  let iconData;
  const { customize } = options?.customizations ?? {};
  for (const id of ids) {
    iconData = getIconData(iconSet, id);
    if (iconData) {
      debug(`${collection}:${id}`);
      let defaultCustomizations = { ...defaultIconCustomisations };
      if (typeof customize === "function")
        defaultCustomizations = customize(defaultCustomizations);
      const {
        attributes: { width, height, ...restAttributes },
        body
      } = iconToSVG(iconData, defaultCustomizations);
      const scale = options?.scale;
      return await mergeIconProps(
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
            if (!isUnsetKeyword(propValue)) {
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

export { searchForIcon };
