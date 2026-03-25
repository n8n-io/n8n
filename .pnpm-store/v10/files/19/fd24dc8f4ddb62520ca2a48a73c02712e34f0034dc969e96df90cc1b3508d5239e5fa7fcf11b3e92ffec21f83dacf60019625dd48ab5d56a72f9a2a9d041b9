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


export interface ResolverOptions {

  /**
   * The list of constraints to search for inside a package's exports/imports fields. If
   * unspecified, this defaults to ["browser"]. The "imports" key will always be included, and if
   * no constraint matches, the "default" key will be followed.
   *
   * @default ["browser"]
   */
  constraints: string[] | string,

  /**
   * Whether to allow resolved files that don't exist on disk. Normally these will not resolve.
   * Defaults to false.
   *
   * @default false
   */
  allowMissing: boolean,

  /**
   * Whether to hide imports of ".d.ts" files which have no peer ".js" files. Defaults to true.
   *
   * This is useful if you're importing TypeScript types into JS, which both VSCode and TypeScript
   * allow, but which aren't needed or understood by your browser. You'll likely be importing:
   *
   * ```js
   * import * as types from './types/index.js';
   * ```
   *
   * The star import makes this work, because the types don't really exist as JS, and the resolved
   * data-uri doesn't actually export anything.
   *
   * @default true
   */
  rewritePeerTypes: boolean,

  /**
   * Whether to allow any path not found in a package.json's `exports` field to be returned as its
   * literal pathname. This is against Node's resolution rules. Defaults to true.
   *
   * @default true
   */
  allowExportFallback: boolean,

  /**
   * If legacy resolution is being performed (i.e., no `exports` field), should this resolve a
   * main field even if the package type is not "module". Defaults to true.
   *
   * @default true
   */
  includeMainFallback: boolean,

  /**
   * Whether to search for a match suffixed with '.mjs' when a naked resolution is found, without
   * a suffix. Defaults to false: normally, we just match '.js' files.
   *
   * @default false
   */
  matchNakedMjs: boolean,

  /**
   * If we can't find a match in "node_modules/package" (or under "node_modules/@user/package"),
   * then see if there's a nested package. These aren't allowed by Node, but actually show up a
   * bit in the wild.
   *
   * @default true
   */
  checkNestedPackages: boolean,

}
