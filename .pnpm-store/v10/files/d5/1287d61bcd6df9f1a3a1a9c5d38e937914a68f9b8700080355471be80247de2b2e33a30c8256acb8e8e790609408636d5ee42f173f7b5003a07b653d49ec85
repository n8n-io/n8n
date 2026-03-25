import { WINDOW } from '../../../types.js';
import { addPageListener } from './globalListeners.js';

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


/**
 * Sentry-specific change:
 *
 * This function's logic was NOT updated to web-vitals 4.2.4 or 5.x but we continue
 * to use the web-vitals 3.5.2 version due to having stricter browser support.
 *
 * PR with context that made the changes:
 * https://github.com/GoogleChrome/web-vitals/pull/442/files#r1530492402
 *
 * The PR removed listening to the `pagehide` event, in favour of only listening to
 * the `visibilitychange` event. This is "more correct" but some browsers we still
 * support (Safari <14.4) don't fully support `visibilitychange` or have known bugs
 * with respect to the `visibilitychange` event.
 *
 * TODO (v11): If we decide to drop support for Safari 14.4, we can use the logic
 * from web-vitals 4.2.4. In this case, we also need to update the integration tests
 * that currently trigger the `pagehide` event to simulate the page being hidden.
 *
 * @param {OnHiddenCallback} cb - Callback to be executed when the page is hidden or unloaded.
 *
 * @deprecated use `whenIdleOrHidden` or `addPageListener('visibilitychange')` instead
 */
const onHidden = (cb) => {
  const onHiddenOrPageHide = (event) => {
    if (event.type === 'pagehide' || WINDOW.document?.visibilityState === 'hidden') {
      cb(event);
    }
  };

  addPageListener('visibilitychange', onHiddenOrPageHide, { capture: true, once: true });
  // Some browsers have buggy implementations of visibilitychange,
  // so we use pagehide in addition, just to be safe.
  addPageListener('pagehide', onHiddenOrPageHide, { capture: true, once: true });
};

export { onHidden };
//# sourceMappingURL=onHidden.js.map
