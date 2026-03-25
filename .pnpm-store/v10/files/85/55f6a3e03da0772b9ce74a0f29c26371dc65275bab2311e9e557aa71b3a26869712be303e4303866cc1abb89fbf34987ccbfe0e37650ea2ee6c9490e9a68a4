import { WINDOW } from '../../../types.js';

/*
 * Copyright 2022 Google LLC
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


// sentry-specific change:
// add optional param to not check for responseStart (see comment below)
const getNavigationEntry = (checkResponseStart = true) => {
  const navigationEntry = WINDOW.performance?.getEntriesByType?.('navigation')[0];
  // Check to ensure the `responseStart` property is present and valid.
  // In some cases a zero value is reported by the browser (for
  // privacy/security reasons), and in other cases (bugs) the value is
  // negative or is larger than the current page time. Ignore these cases:
  // - https://github.com/GoogleChrome/web-vitals/issues/137
  // - https://github.com/GoogleChrome/web-vitals/issues/162
  // - https://github.com/GoogleChrome/web-vitals/issues/275
  if (
    // sentry-specific change:
    // We don't want to check for responseStart for our own use of `getNavigationEntry`
    !checkResponseStart ||
    (navigationEntry && navigationEntry.responseStart > 0 && navigationEntry.responseStart < performance.now())
  ) {
    return navigationEntry;
  }
};

export { getNavigationEntry };
//# sourceMappingURL=getNavigationEntry.js.map
