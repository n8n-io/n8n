import { loadCollectionFromFS } from './fs.mjs';
import { searchForIcon } from './modern.mjs';
import { warnOnce } from './warn.mjs';
import { getPossibleIconNames } from './utils.mjs';
import 'fs';
import 'local-pkg';
import './install-pkg.mjs';
import '@antfu/install-pkg';
import '@antfu/utils';
import 'kolorist';
import 'mlly';
import '../svg/build.mjs';
import '../icon/defaults.mjs';
import '../customisations/defaults.mjs';
import '../svg/size.mjs';
import '../svg/defs.mjs';
import '../icon-set/get-icon.mjs';
import '../icon/merge.mjs';
import '../icon/transformations.mjs';
import '../icon-set/tree.mjs';
import 'debug';

function createExternalPackageIconLoader(packageName, autoInstall = false, cwd) {
  let scope;
  let collection;
  const collections = {};
  if (typeof packageName === "string") {
    if (packageName.length === 0) {
      warnOnce(`invalid package name, it is empty`);
      return collections;
    }
    if (packageName[0] === "@") {
      if (packageName.indexOf("/") === -1) {
        warnOnce(`invalid scoped package name "${packageName}"`);
        return collections;
      }
      [scope, collection] = packageName.split("/");
    } else {
      scope = "";
      collection = packageName;
    }
  } else {
    [scope, collection] = packageName;
  }
  collections[collection] = createCustomIconLoader(
    scope,
    collection,
    autoInstall,
    cwd
  );
  return collections;
}
function createCustomIconLoader(scope, collection, autoInstall, cwd) {
  const iconSetPromise = loadCollectionFromFS(
    collection,
    autoInstall,
    scope,
    cwd
  );
  return async (icon) => {
    const iconSet = await iconSetPromise;
    let result;
    if (iconSet) {
      result = await searchForIcon(
        iconSet,
        collection,
        getPossibleIconNames(icon)
      );
    }
    return result;
  };
}

export { createExternalPackageIconLoader };
