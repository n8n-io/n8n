import { WINDOW } from '../../../types.js';
import { generateUniqueID } from './generateUniqueID.js';
import { getActivationStart } from './getActivationStart.js';
import { getNavigationEntry } from './getNavigationEntry.js';

/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


const initMetric = (name, value = -1) => {
  const navEntry = getNavigationEntry();
  let navigationType = 'navigate';

  if (navEntry) {
    if (WINDOW.document?.prerendering || getActivationStart() > 0) {
      navigationType = 'prerender';
    } else if (WINDOW.document?.wasDiscarded) {
      navigationType = 'restore';
    } else if (navEntry.type) {
      navigationType = navEntry.type.replace(/_/g, '-') ;
    }
  }

  // Use `entries` type specific for the metric.
  const entries = [];

  return {
    name,
    value,
    rating: 'good' , // If needed, will be updated when reported. `const` to keep the type from widening to `string`.
    delta: 0,
    entries,
    id: generateUniqueID(),
    navigationType,
  };
};

export { initMetric };
//# sourceMappingURL=initMetric.js.map
