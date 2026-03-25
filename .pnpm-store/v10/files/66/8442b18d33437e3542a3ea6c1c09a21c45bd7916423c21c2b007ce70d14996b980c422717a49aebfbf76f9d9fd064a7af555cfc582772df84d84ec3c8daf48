Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const types = require('../../../types.js');
const getActivationStart = require('./getActivationStart.js');
const globalListeners = require('./globalListeners.js');

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


let firstHiddenTime = -1;
const onHiddenFunctions = new Set();

const initHiddenTime = () => {
  // If the document is hidden when this code runs, assume it was always
  // hidden and the page was loaded in the background, with the one exception
  // that visibility state is always 'hidden' during prerendering, so we have
  // to ignore that case until prerendering finishes (see: `prerenderingchange`
  // event logic below).
  return types.WINDOW.document?.visibilityState === 'hidden' && !types.WINDOW.document?.prerendering ? 0 : Infinity;
};

const onVisibilityUpdate = (event) => {
  // Handle changes to hidden state
  if (isPageHidden(event) && firstHiddenTime > -1) {
    // Sentry-specific change: Also call onHidden callbacks for pagehide events
    // to support older browsers (Safari <14.4) that don't properly fire visibilitychange
    if (event.type === 'visibilitychange' || event.type === 'pagehide') {
      for (const onHiddenFunction of onHiddenFunctions) {
        onHiddenFunction();
      }
    }

    // If the document is 'hidden' and no previous hidden timestamp has been
    // set (so is infinity), update it based on the current event data.
    if (!isFinite(firstHiddenTime)) {
      // If the event is a 'visibilitychange' event, it means the page was
      // visible prior to this change, so the event timestamp is the first
      // hidden time.
      // However, if the event is not a 'visibilitychange' event, then it must
      // be a 'prerenderingchange' or 'pagehide' event, and the fact that the document is
      // still 'hidden' from the above check means the tab was activated
      // in a background state and so has always been hidden.
      firstHiddenTime = event.type === 'visibilitychange' ? event.timeStamp : 0;

      // We no longer need the `prerenderingchange` event listener now we've
      // set an initial init time so remove that
      // (we'll keep the visibilitychange and pagehide ones for onHiddenFunction above)
      globalListeners.removePageListener('prerenderingchange', onVisibilityUpdate, true);
    }
  }
};

const getVisibilityWatcher = () => {
  if (types.WINDOW.document && firstHiddenTime < 0) {
    // Check if we have a previous hidden `visibility-state` performance entry.
    const activationStart = getActivationStart.getActivationStart();
    const firstVisibilityStateHiddenTime = !types.WINDOW.document.prerendering
      ? globalThis.performance
          .getEntriesByType('visibility-state')
          .filter(e => e.name === 'hidden' && e.startTime > activationStart)[0]?.startTime
      : undefined;

    // Prefer that, but if it's not available and the document is hidden when
    // this code runs, assume it was hidden since navigation start. This isn't
    // a perfect heuristic, but it's the best we can do until the
    // `visibility-state` performance entry becomes available in all browsers.
    firstHiddenTime = firstVisibilityStateHiddenTime ?? initHiddenTime();
    // Listen for visibility changes so we can handle things like bfcache
    // restores and/or prerender without having to examine individual
    // timestamps in detail and also for onHidden function calls.
    globalListeners.addPageListener('visibilitychange', onVisibilityUpdate, true);

    // Sentry-specific change: Some browsers have buggy implementations of visibilitychange,
    // so we use pagehide in addition, just to be safe. This is also required for older
    // Safari versions (<14.4) that we still support.
    globalListeners.addPageListener('pagehide', onVisibilityUpdate, true);

    // IMPORTANT: when a page is prerendering, its `visibilityState` is
    // 'hidden', so in order to account for cases where this module checks for
    // visibility during prerendering, an additional check after prerendering
    // completes is also required.
    globalListeners.addPageListener('prerenderingchange', onVisibilityUpdate, true);
  }

  return {
    get firstHiddenTime() {
      return firstHiddenTime;
    },
    onHidden(cb) {
      onHiddenFunctions.add(cb);
    },
  };
};

/**
 * Check if the page is hidden, uses the `pagehide` event for older browsers support that we used to have in `onHidden` function.
 * Some browsers we still support (Safari <14.4) don't fully support `visibilitychange`
 * or have known bugs w.r.t the `visibilitychange` event.
 * // TODO (v11): If we decide to drop support for Safari 14.4, we can use the logic from web-vitals 4.2.4
 */
function isPageHidden(event) {
  return event.type === 'pagehide' || types.WINDOW.document?.visibilityState === 'hidden';
}

exports.getVisibilityWatcher = getVisibilityWatcher;
//# sourceMappingURL=getVisibilityWatcher.js.map
