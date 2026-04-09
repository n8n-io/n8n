import { promises } from 'fs';
import { importModule } from 'local-pkg';
import { tryInstallPkg } from './install-pkg.mjs';
import { resolvePath } from 'mlly';
import '@antfu/install-pkg';
import '@antfu/utils';
import 'kolorist';
import './warn.mjs';

const _collections = /* @__PURE__ */ Object.create(null);
const isLegacyExists = /* @__PURE__ */ Object.create(null);
async function loadCollectionFromFS(name, autoInstall = false, scope = "@iconify-json", cwd = process.cwd()) {
  const cache = _collections[cwd] || (_collections[cwd] = /* @__PURE__ */ Object.create(null));
  if (!await cache[name]) {
    cache[name] = task();
  }
  return cache[name];
  async function task() {
    const packageName = scope.length === 0 ? name : `${scope}/${name}`;
    let jsonPath = await resolvePath(`${packageName}/icons.json`, {
      url: cwd
    }).catch(() => void 0);
    if (scope === "@iconify-json") {
      if (isLegacyExists[cwd] === void 0) {
        const testResult = await resolvePath(
          `@iconify/json/collections.json`,
          {
            url: cwd
          }
        ).catch(() => void 0);
        isLegacyExists[cwd] = !!testResult;
      }
      const checkLegacy = isLegacyExists[cwd];
      if (!jsonPath && checkLegacy) {
        jsonPath = await resolvePath(
          `@iconify/json/json/${name}.json`,
          {
            url: cwd
          }
        ).catch(() => void 0);
      }
      if (!jsonPath && !checkLegacy && autoInstall) {
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
