import { getCustomIcon } from './custom.mjs';
import { searchForIcon } from './modern.mjs';
import 'debug';
import './utils.mjs';
import '../svg/build.mjs';
import '../icon/defaults.mjs';
import '../customisations/defaults.mjs';
import '../svg/size.mjs';
import '../svg/defs.mjs';
import '../svg/trim.mjs';
import '../icon-set/get-icon.mjs';
import '../icon/merge.mjs';
import '../icon/transformations.mjs';
import '../icon-set/tree.mjs';

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
          return await getCustomIcon(
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
          return await searchForIcon(
            result,
            collection,
            ids,
            options
          );
        }
      }
    } else {
      return await getCustomIcon(custom, collection, icon, options);
    }
  }
};

export { loadIcon };
