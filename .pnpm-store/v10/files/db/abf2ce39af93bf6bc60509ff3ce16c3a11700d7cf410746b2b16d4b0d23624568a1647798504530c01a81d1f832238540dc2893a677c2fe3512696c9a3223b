'use strict';

const loader_fs = require('./fs.cjs');
const loader_modern = require('./modern.cjs');
const loader_warn = require('./warn.cjs');
const loader_utils = require('./utils.cjs');
require('fs');
require('local-pkg');
require('./install-pkg.cjs');
require('@antfu/install-pkg');
require('@antfu/utils');
require('kolorist');
require('mlly');
require('../svg/build.cjs');
require('../icon/defaults.cjs');
require('../customisations/defaults.cjs');
require('../svg/size.cjs');
require('../svg/defs.cjs');
require('../icon-set/get-icon.cjs');
require('../icon/merge.cjs');
require('../icon/transformations.cjs');
require('../icon-set/tree.cjs');
require('debug');

function createExternalPackageIconLoader(packageName, autoInstall = false, cwd) {
  let scope;
  let collection;
  const collections = {};
  if (typeof packageName === "string") {
    if (packageName.length === 0) {
      loader_warn.warnOnce(`invalid package name, it is empty`);
      return collections;
    }
    if (packageName[0] === "@") {
      if (packageName.indexOf("/") === -1) {
        loader_warn.warnOnce(`invalid scoped package name "${packageName}"`);
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
  const iconSetPromise = loader_fs.loadCollectionFromFS(
    collection,
    autoInstall,
    scope,
    cwd
  );
  return async (icon) => {
    const iconSet = await iconSetPromise;
    let result;
    if (iconSet) {
      result = await loader_modern.searchForIcon(
        iconSet,
        collection,
        loader_utils.getPossibleIconNames(icon)
      );
    }
    return result;
  };
}

exports.createExternalPackageIconLoader = createExternalPackageIconLoader;
