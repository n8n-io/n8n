/*
 * Copyright 2021 Sam Thorogood.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */


import * as types from './types/index.js';
import * as path from 'path';
import * as fs from 'fs';
import { statIsFile, statOrNull, isLocal } from './lib/helper.js';
import { createRequire } from 'module';
import { matchModuleNode } from './lib/node.js';



/** @type {types.ResolverOptions} */
const defaults = {
  constraints: ['browser'],
  allowMissing: false,
  rewritePeerTypes: true,
  allowExportFallback: true,
  matchNakedMjs: false,
  includeMainFallback: true,
  checkNestedPackages: true,
};


/**
 * Regexp that matches "../", "./" or "/" as a prefix.
 */
const relativeRegexp = /^\.{0,2}\//;


/**
 * Regexp that matches ".js" as a suffix.
 */
const matchJsSuffixRegexp = /\.js$/;


/**
 * Zero JS "file" that evaluates correctly.
 */
const zeroJsDefinitionsImport = 'data:text/javascript;charset=utf-8,/* was .d.ts only */';


/**
 * Search these fields for a potential legacy main module if a top-level package is imported.
 */
const modulePackageNames = [
  'module',
  'esnext:main',
  'esnext',
  'jsnext:main',
  'jsnext',
];


class Resolver {
  #importerDir;
  #require;

  /** @type {types.ResolverOptions} */
  #options;

  // This is always an array, but the arg might not be.
  /** @type {string[]} */
  #constraints;

  /**
   * @param {string} importer
   * @param {Partial<types.ResolverOptions>=} options
   */
  constructor(importer, options) {
    this.#options = Object.assign({}, defaults, options);
    this.#constraints = [this.#options.constraints].flat();

    // Importers are actually the same for every file in a directory. Remove the last part.
    const importerDir = path.join(path.resolve(importer), '..', path.sep);

    this.#importerDir = new URL(`file://${importerDir}`);
    this.#require = createRequire(importerDir);
  }

  /**
   * @return {{resolved: string, info: types.InternalPackageJson} | undefined}
   */
  loadSelfPackage() {
    let candidatePath = this.#require.resolve.paths('.')?.[0];
    if (candidatePath === undefined) {
      return;
    }

    for (;;) {
      const selfPackagePath = path.join(candidatePath, 'package.json');
      try {
        const info = JSON.parse(fs.readFileSync(selfPackagePath, 'utf-8'));
        return { info, resolved: candidatePath };
      } catch (e) {
        // ignore
      }

      const next = path.dirname(candidatePath);
      if (next === candidatePath) {
        return;
      }
      candidatePath = next;
    }
  }

  /**
   * @param {string} name
   * @return {{resolved: string, info: types.InternalPackageJson} | undefined}
   */
  loadPackage(name) {
    const candidatePaths = this.#require.resolve.paths(name);
    if (!candidatePaths?.length) {
      return;
    }

    // If we literally are the named import, match it first.
    const self = this.loadSelfPackage();
    if (self?.info['name'] === name) {
      return { resolved: self.resolved, info: self.info };
    }

    let packagePath;
    for (const p of candidatePaths) {
      const check = path.join(p, name, 'package.json');
      if (fs.existsSync(check)) {
        packagePath = check;
        break;
      }
    }
    if (!packagePath) {
      return;
    }

    const info = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return { resolved: path.dirname(packagePath), info };
  }

  /**
   * @param {string} pathname
   * @return {string=}
   */
  confirmPath(pathname) {
    const stat = statOrNull(pathname);
    if (stat && !stat.isDirectory()) {
      return pathname;
    }

    const extToCheck = this.#options.matchNakedMjs ? ['.js', '.mjs'] : ['.js'];

    if (stat === null) {
      // Look for a file with a suffix.
      for (const ext of extToCheck) {
        const check = pathname + ext;
        if (statIsFile(check)) {
          return check;
        }
      }

      if (this.#options.rewritePeerTypes) {
        // Special-case .d.ts files when there's no better option... because TypeScript.
        //   - importing a naked or '.js' file allows the adjacent '.d.ts'
        //   - this file doesn't really exist, so return a zero import
        const tsCheck = [pathname + '.d.ts', pathname.replace(matchJsSuffixRegexp, '.d.ts')];
        for (const check of tsCheck) {
          if (statIsFile(check)) {
            return zeroJsDefinitionsImport;
          }
        }
      }

    } else if (stat.isDirectory()) {
      // Look for index.js in the directory.
      for (const ext of extToCheck) {
        const check = path.join(pathname, `index${ext}`);
        if (statIsFile(check)) {
          return check;
        }
      }

      // Look for a solo index.d.ts in the directory, which TypeScript allows.
      if (this.#options.rewritePeerTypes && statIsFile(path.join(pathname, 'index.d.ts'))) {
        return zeroJsDefinitionsImport;
      }

    }
  }

  /**
   * @param {string} importee relative or naked string
   * @return {string|void}
   */
  nodeResolve(importee) {
    // Try to match subpath imports first. See Node's documentation:
    //   https://nodejs.org/api/packages.html#packages_subpath_imports
    // This allows local file resolution or picking another module, so check it first and fall
    // through to the external import process if required.
    if (importee.startsWith('#')) {
      const self = this.loadSelfPackage();
      if (!self) {
        return;
      }

      const matched = matchModuleNode(self.info.imports ?? {}, importee, this.#constraints);
      if (!matched) {
        return;
      } else if (isLocal(matched)) {
        return `file://${path.join(self.resolved, matched)}`;
      }

      // This #import resolved to another package because it wasn't local. Continue below.
      importee = matched;
    }

    const pathComponents = importee.split('/');
    let index = (pathComponents[0].startsWith('@') ? 2 : 1);

    /** @type {string=} */
    let fallbackBest = undefined;

    // This loop only exists to check "bad" nested paths.
    do {
      const name = pathComponents.slice(0, index).join('/');
      const rest = ['.', ...pathComponents.slice(index)].join('/');

      const pkg = this.loadPackage(name);
      if (!pkg) {
        continue;
      }

      // Match exports.
      if (pkg.info.exports) {
        const matched = matchModuleNode(pkg.info.exports, rest, this.#constraints);
        if (matched && isLocal(matched)) {
          return `file://${path.join(pkg.resolved, matched)}`;
        }
        // This module could be trying to export something that is not part of its own package.
        // This isn't allowed although perhaps we should let it happen.

        if (!this.#options.allowExportFallback) {
          return;
        }
      }

      // Check a few legacy options.
      let simple = rest;
      if (simple === '.') {
        let found = false;
        for (const key of modulePackageNames) {
          if (typeof pkg.info[key] === 'string') {
            simple = /** @type {string} */ (pkg.info[key]);
            found = true;
            break;
          }
        }

        // If we can't find a name which implies a module import, optionally fall back to 'main' even
        // if the type of the package isn't correct.
        if (!found &&
          (this.#options.includeMainFallback || pkg.info['type'] === 'module') &&
          typeof pkg.info['main'] === 'string') {
          simple = pkg.info['main'];
        }

        return `file://${path.join(pkg.resolved, simple)}`;
      }

      // Otherwise, choose the best (if we're the 1st pass) based on the guessed filename.
      if (!fallbackBest) {
        fallbackBest = `file://${path.join(pkg.resolved, rest)}`;
      }

    } while (this.#options.checkNestedPackages && ++index <= pathComponents.length);

    return fallbackBest;
  }

  /**
   * This is public-visible API of this helper class.
   *
   * @param {string} importee
   * @return {string=}
   */
  resolve(importee) {
    try {
      new URL(importee);
      return; // ignore, is valid URL
    } catch { }

    /** @type {URL} */
    let url;
    const resolved = this.nodeResolve(importee);
    if (resolved !== undefined) {
      // We get back file:// URLs, beacause Node doesn't care about our webserver.
      url = new URL(resolved);
      if (url.protocol !== 'file:') {
        throw new Error(`expected file:, was: ${url.toString()}`);
      }
    } else {
      url = new URL(importee, this.#importerDir);
    }

    let { pathname } = url;
    const suffix = url.search + url.hash;

    // Confirm the path actually exists (with extra node things).
    const confirmed = this.confirmPath(pathname);
    if (confirmed !== undefined) {
      pathname = confirmed;
    } else if (!this.#options.allowMissing) {
      return;
    }
    try {
      // confirmPath might return a data: URL, so check here.
      new URL(pathname);
      return pathname;
    } catch (e) {
      // ignore
    }

    // Find the relative path from the request.
    let out = path.relative(this.#importerDir.pathname, pathname);
    if (!relativeRegexp.test(out)) {
      out = `./${out}`;  // don't allow naked pathname
    }
    return out + suffix;
  }
}


/**
 * @param {string} importer
 * @param {Partial<types.ResolverOptions>=} options
 * @return {(importee: string) => string|undefined}
 */
export default function buildResolver(importer, options) {
  let handler = (importee) => {
    const r = new Resolver(importer, options);
    handler = r.resolve.bind(r);
    return handler(importee);
  };
  return (importee) => handler(importee);
}
