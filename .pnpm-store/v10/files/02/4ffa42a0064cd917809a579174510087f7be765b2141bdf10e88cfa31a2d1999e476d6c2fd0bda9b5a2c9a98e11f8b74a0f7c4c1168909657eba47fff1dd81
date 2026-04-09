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

export * from './external.js';

/**
 * Internal node type for package.json' imports/exports.
 */
export type InternalPackageModuleNode = { [name: string]: InternalPackageModuleNode } | string;

/**
 * Internal top-level type approximating a package.json file.
 */
export type InternalPackageJson = {
  [name: string]: number | string | InternalPackageJson;
  exports?: InternalPackageModuleNode;
  imports?: InternalPackageModuleNode;
  name?: string;
};

/**
 * Internal type of a general package.json node.
 */
export type InternalPackageJsonNode = {
  [name: string]: number | string | InternalPackageJsonNode;
};
