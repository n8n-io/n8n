import { WINDOW } from '../../../types.js';
import { addPageListener, removePageListener } from './globalListeners.js';
import { runOnce } from './runOnce.js';

/*
 * Copyright 2024 Google LLC
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
 * Runs the passed callback during the next idle period, or immediately
 * if the browser's visibility state is (or becomes) hidden.
 */
const whenIdleOrHidden = (cb) => {
  const rIC = WINDOW.requestIdleCallback || WINDOW.setTimeout;

  // If the document is hidden, run the callback immediately, otherwise
  // race an idle callback with the next `visibilitychange` event.
  if (WINDOW.document?.visibilityState === 'hidden') {
    cb();
  } else {
    // eslint-disable-next-line no-param-reassign
    cb = runOnce(cb);
    addPageListener('visibilitychange', cb, { once: true, capture: true });
    // sentry: we use pagehide instead of directly listening to visibilitychange
    // because some browsers we still support (Safari <14.4) don't fully support
    // `visibilitychange` or have known bugs w.r.t the `visibilitychange` event.
    // TODO(v11): remove this once we drop support for Safari <14.4
    addPageListener('pagehide', cb, { once: true, capture: true });
    rIC(() => {
      cb();
      // Remove the above event listener since no longer required.
      // See: https://github.com/GoogleChrome/web-vitals/issues/622
      removePageListener('visibilitychange', cb, { capture: true });
      // TODO(v11): remove this once we drop support for Safari <14.4
      removePageListener('pagehide', cb, { capture: true });
    });
  }
};

export { whenIdleOrHidden };
//# sourceMappingURL=whenIdleOrHidden.js.map
