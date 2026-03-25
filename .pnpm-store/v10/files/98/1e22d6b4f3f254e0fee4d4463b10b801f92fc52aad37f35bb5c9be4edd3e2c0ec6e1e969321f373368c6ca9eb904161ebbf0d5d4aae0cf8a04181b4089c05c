'use strict';

const fs = require('fs');
const localPkg = require('local-pkg');
const loader_installPkg = require('./install-pkg.cjs');
const mlly = require('mlly');
require('@antfu/install-pkg');
require('@antfu/utils');
require('kolorist');
require('./warn.cjs');

const _collections = {};
const isLegacyExists = localPkg.isPackageExists("@iconify/json");
async function loadCollectionFromFS(name, autoInstall = false, scope = "@iconify-json", cwd = process.cwd()) {
  if (!await _collections[name]) {
    _collections[name] = task();
  }
  return _collections[name];
  async function task() {
    const packageName = scope.length === 0 ? name : `${scope}/${name}`;
    let jsonPath = await mlly.resolvePath(`${packageName}/icons.json`, {
      url: cwd
    }).catch(() => void 0);
    if (scope === "@iconify-json") {
      if (!jsonPath && isLegacyExists) {
        jsonPath = await mlly.resolvePath(
          `@iconify/json/json/${name}.json`,
          {
            url: cwd
          }
        ).catch(() => void 0);
      }
      if (!jsonPath && !isLegacyExists && autoInstall) {
        await loader_installPkg.tryInstallPkg(packageName, autoInstall);
        jsonPath = await mlly.resolvePath(`${packageName}/icons.json`, {
          url: cwd
        }).catch(() => void 0);
      }
    } else if (!jsonPath && autoInstall) {
      await loader_installPkg.tryInstallPkg(packageName, autoInstall);
      jsonPath = await mlly.resolvePath(`${packageName}/icons.json`, {
        url: cwd
      }).catch(() => void 0);
    }
    if (!jsonPath) {
      let packagePath = await mlly.resolvePath(packageName, {
        url: cwd
      }).catch(() => void 0);
      if (packagePath?.match(/^[a-z]:/i)) {
        packagePath = `file:///${packagePath}`.replace(/\\/g, "/");
      }
      if (packagePath) {
        const { icons } = await localPkg.importModule(
          packagePath
        );
        if (icons)
          return icons;
      }
    }
    let stat;
    try {
      stat = jsonPath ? await fs.promises.lstat(jsonPath) : void 0;
    } catch (err) {
      return void 0;
    }
    if (stat?.isFile()) {
      return JSON.parse(
        await fs.promises.readFile(jsonPath, "utf8")
      );
    } else {
      return void 0;
    }
  }
}

exports.loadCollectionFromFS = loadCollectionFromFS;
