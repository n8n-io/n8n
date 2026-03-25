import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isCjs } from '../utils/detection.js';

let moduleCache;

const INTEGRATION_NAME = 'Modules';

/**
 * `__SENTRY_SERVER_MODULES__` can be replaced at build time with the modules loaded by the server.
 * Right now, we leverage this in Next.js to circumvent the problem that we do not get access to these things at runtime.
 */
const SERVER_MODULES = typeof __SENTRY_SERVER_MODULES__ === 'undefined' ? {} : __SENTRY_SERVER_MODULES__;

const _modulesIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    processEvent(event) {
      event.modules = {
        ...event.modules,
        ..._getModules(),
      };

      return event;
    },
    getModules: _getModules,
  };
}) ;

/**
 * Add node modules / packages to the event.
 * For this, multiple sources are used:
 * - They can be injected at build time into the __SENTRY_SERVER_MODULES__ variable (e.g. in Next.js)
 * - They are extracted from the dependencies & devDependencies in the package.json file
 * - They are extracted from the require.cache (CJS only)
 */
const modulesIntegration = _modulesIntegration;

function getRequireCachePaths() {
  try {
    return require.cache ? Object.keys(require.cache ) : [];
  } catch {
    return [];
  }
}

/** Extract information about package.json modules */
function collectModules() {
  return {
    ...SERVER_MODULES,
    ...getModulesFromPackageJson(),
    ...(isCjs() ? collectRequireModules() : {}),
  };
}

/** Extract information about package.json modules from require.cache */
function collectRequireModules() {
  const mainPaths = require.main?.paths || [];
  const paths = getRequireCachePaths();

  // We start with the modules from package.json (if possible)
  // These may be overwritten by more specific versions from the require.cache
  const infos = {};
  const seen = new Set();

  paths.forEach(path => {
    let dir = path;

    /** Traverse directories upward in the search of package.json file */
    const updir = () => {
      const orig = dir;
      dir = dirname(orig);

      if (!dir || orig === dir || seen.has(orig)) {
        return undefined;
      }
      if (mainPaths.indexOf(dir) < 0) {
        return updir();
      }

      const pkgfile = join(orig, 'package.json');
      seen.add(orig);

      if (!existsSync(pkgfile)) {
        return updir();
      }

      try {
        const info = JSON.parse(readFileSync(pkgfile, 'utf8'))

;
        infos[info.name] = info.version;
      } catch {
        // no-empty
      }
    };

    updir();
  });

  return infos;
}

/** Fetches the list of modules and the versions loaded by the entry file for your node.js app. */
function _getModules() {
  if (!moduleCache) {
    moduleCache = collectModules();
  }
  return moduleCache;
}

function getPackageJson() {
  try {
    const filePath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(filePath, 'utf8')) ;

    return packageJson;
  } catch {
    return {};
  }
}

function getModulesFromPackageJson() {
  const packageJson = getPackageJson();

  return {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
}

export { modulesIntegration };
//# sourceMappingURL=modules.js.map
