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
import * as path from 'node:path';
import * as fs from 'node:fs';
import { statIsFile, statOrNull, isLocal } from './lib/helper.js';
import { createRequire } from 'node:module';
import { matchModuleNode } from './lib/node.js';

const defaults: types.ResolverOptions = {
  isDir: false,
  resolveToAbsolute: false,
  constraints: ['browser'],
  allowMissing: false,
  rewritePeerTypes: true,
  allowExportFallback: true,
  matchNakedMjs: false,
  allowImportingExtraExtensions: false,
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
const modulePackageNames = ['module', 'esnext:main', 'esnext', 'jsnext:main', 'jsnext'];

class Resolver {
  private importerDir: URL;
  private require: NodeRequire;

  private options: types.ResolverOptions;

  // This is always an array, but the arg might not be.
  private constraints: string[];

  constructor(importer: string, options?: Partial<types.ResolverOptions>) {
    this.options = Object.assign({}, defaults, options);
    this.constraints = [this.options.constraints].flat();

    importer = path.resolve(importer);

    // Importers are actually the same for every file in a directory. Remove the last part.
    const importerDir = this.options.isDir
      ? path.join(importer, '/')
      : path.join(importer, '..', path.sep);

    this.importerDir = new URL(`file://${importerDir}`);

    this.require = createRequire(importerDir);
  }

  loadSelfPackage(): { resolved: string; info: types.InternalPackageJson } | undefined {
    let candidatePath = this.require.resolve.paths('.')?.[0];
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

  loadPackage(name: string): { resolved: string; info: types.InternalPackageJson } | undefined {
    const candidatePaths = this.require.resolve.paths(name);
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

  confirmPath(pathname: string): string | undefined {
    const stat = statOrNull(pathname);
    if (stat && !stat.isDirectory()) {
      return pathname;
    }

    const extToCheck = ['.js'];

    if (this.options.matchNakedMjs) {
      extToCheck.push('.mjs');
    }

    if (this.options.allowImportingExtraExtensions) {
      if (Array.isArray(this.options.allowImportingExtraExtensions)) {
        extToCheck.push(
          ...this.options.allowImportingExtraExtensions.map((x) => {
            return x.startsWith('.') ? x : '.' + x;
          }),
        );
      } else {
        extToCheck.push('.ts', '.tsx', '.jsx');
      }
    }

    if (stat === null) {
      // Look for a file with a suffix.
      for (const ext of extToCheck) {
        const check = pathname + ext;
        if (statIsFile(check)) {
          return check;
        }
      }

      if (this.options.rewritePeerTypes) {
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

      // Look for a file with a suffix, without the prior extension.
      const { name, dir } = path.parse(pathname);
      const naked = path.join(dir, name);
      for (const ext of extToCheck) {
        const check = naked + ext;
        if (statIsFile(check)) {
          return check;
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
      if (this.options.rewritePeerTypes && statIsFile(path.join(pathname, 'index.d.ts'))) {
        return zeroJsDefinitionsImport;
      }
    }
  }

  nodeResolve(importee: string): string | undefined {
    // Try to match subpath imports first. See Node's documentation:
    //   https://nodejs.org/api/packages.html#packages_subpath_imports
    // This allows local file resolution or picking another module, so check it first and fall
    // through to the external import process if required.
    if (importee.startsWith('#')) {
      const self = this.loadSelfPackage();
      if (!self) {
        return;
      }

      const matched = matchModuleNode(self.info.imports ?? {}, importee, this.constraints);
      if (!matched) {
        return;
      } else if (isLocal(matched)) {
        return `file://${path.join(self.resolved, matched)}`;
      }

      // This #import resolved to another package because it wasn't local. Continue below.
      importee = matched;
    }

    const pathComponents = importee.split('/');
    let index = pathComponents[0].startsWith('@') ? 2 : 1;

    let fallbackBest: string | undefined = undefined;

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
        const matched = matchModuleNode(pkg.info.exports, rest, this.constraints);
        if (matched && isLocal(matched)) {
          return `file://${path.join(pkg.resolved, matched)}`;
        }
        // This module could be trying to export something that is not part of its own package.
        // This isn't allowed although perhaps we should let it happen.

        if (!this.options.allowExportFallback) {
          return;
        }
      }

      // Check a few legacy options.
      let simple = rest;
      if (simple === '.') {
        let found = false;
        for (const key of modulePackageNames) {
          const cand = pkg.info[key];
          if (typeof cand === 'string') {
            simple = cand;
            found = true;
            break;
          }
        }

        // If we can't find a name which implies a module import, optionally fall back to 'main' even
        // if the type of the package isn't correct.
        if (
          !found &&
          (this.options.includeMainFallback || pkg.info['type'] === 'module') &&
          typeof pkg.info['main'] === 'string'
        ) {
          simple = pkg.info['main'];
        }

        return `file://${path.join(pkg.resolved, simple)}`;
      }

      // Otherwise, choose the best (if we're the 1st pass) based on the guessed filename.
      if (!fallbackBest) {
        fallbackBest = `file://${path.join(pkg.resolved, rest)}`;
      }
    } while (this.options.checkNestedPackages && ++index <= pathComponents.length);

    return fallbackBest;
  }

  /**
   * This is public-visible API of this helper class.
   */
  resolve(importee: string): string | undefined {
    try {
      new URL(importee);
      return; // ignore, is valid URL
    } catch {}

    let url: URL;
    const resolved = this.nodeResolve(importee);
    if (resolved !== undefined) {
      // We get back file:// URLs, beacause Node doesn't care about our webserver.
      url = new URL(resolved);
      if (url.protocol !== 'file:') {
        throw new Error(`expected file:, was: ${url.toString()}`);
      }
    } else {
      url = new URL(importee, this.importerDir);
    }

    let { pathname } = url;
    const suffix = url.search + url.hash;

    // Confirm the path actually exists (with extra node things).
    const confirmed = this.confirmPath(pathname);
    if (confirmed !== undefined) {
      pathname = confirmed;
    } else if (!this.options.allowMissing) {
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
    if (this.options.resolveToAbsolute) {
      return pathname;
    }
    let out = path.relative(this.importerDir.pathname, pathname);
    if (!relativeRegexp.test(out)) {
      out = `./${out}`; // don't allow naked pathname
    }
    return out + suffix;
  }
}

export function buildResolver(
  importer: string,
  options?: Partial<types.ResolverOptions>,
): (importee: string) => string | undefined {
  let handler = (importee: string): string | undefined => {
    const r = new Resolver(importer, options);
    handler = r.resolve.bind(r);
    return handler(importee);
  };
  return (importee) => handler(importee);
}

export { buildResolver as default };
