import { promises } from 'fs';
import { isPackageExists, importModule } from 'local-pkg';
import { tryInstallPkg } from './install-pkg.mjs';
import { resolvePath } from 'mlly';
import '@antfu/install-pkg';
import '@antfu/utils';
import 'kolorist';
import './warn.mjs';

const _collections = {};
const isLegacyExists = isPackageExists("@iconify/json");
async function loadCollectionFromFS(name, autoInstall = false, scope = "@iconify-json", cwd = process.cwd()) {
  if (!await _collections[name]) {
    _collections[name] = task();
  }
  return _collections[name];
  async function task() {
    const packageName = scope.length === 0 ? name : `${scope}/${name}`;
    let jsonPath = await resolvePath(`${packageName}/icons.json`, {
      url: cwd
    }).catch(() => void 0);
    if (scope === "@iconify-json") {
      if (!jsonPath && isLegacyExists) {
        jsonPath = await resolvePath(
          `@iconify/json/json/${name}.json`,
          {
            url: cwd
          }
        ).catch(() => void 0);
      }
      if (!jsonPath && !isLegacyExists && autoInstall) {
        await tryInstallPkg(packageName, autoInstall);
        jsonPath = await resolvePath(`${packageName}/icons.json`, {
          url: cwd
        }).catch(() => void 0);
      }
    } else if (!jsonPath && autoInstall) {
      await tryInstallPkg(packageName, autoInstall);
      jsonPath = await resolvePath(`${packageName}/icons.json`, {
        url: cwd
      }).catch(() => void 0);
    }
    if (!jsonPath) {
      let packagePath = await resolvePath(packageName, {
        url: cwd
      }).catch(() => void 0);
      if (packagePath?.match(/^[a-z]:/i)) {
        packagePath = `file:///${packagePath}`.replace(/\\/g, "/");
      }
      if (packagePath) {
        const { icons } = await importModule(
          packagePath
        );
        if (icons)
          return icons;
      }
    }
    let stat;
    try {
      stat = jsonPath ? await promises.lstat(jsonPath) : void 0;
    } catch (err) {
      return void 0;
    }
    if (stat?.isFile()) {
      return JSON.parse(
        await promises.readFile(jsonPath, "utf8")
      );
    } else {
      return void 0;
    }
  }
}

export { loadCollectionFromFS };
