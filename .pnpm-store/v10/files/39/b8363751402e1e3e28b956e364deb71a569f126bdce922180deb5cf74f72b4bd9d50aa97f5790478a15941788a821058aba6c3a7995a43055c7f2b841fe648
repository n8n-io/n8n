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

import { ResolverOptions } from './types/external.js';
export { ResolverOptions };

// nb. default exports are hard; this exports as both `default` and `buildResolver`

/**
 * Builds an import resolver for the given importer file.
 */
export default function buildResolver(
  importer: string,
  options?: Partial<ResolverOptions>,
): (importer: string) => string | undefined;

/**
 * Builds an import resolver for the given importer file.
 */
export function buildResolver(
  importer: string,
  options?: Partial<ResolverOptions>,
): (importer: string) => string | undefined;
