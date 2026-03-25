Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const types = require('../../types.js');
const bindReporter = require('./lib/bindReporter.js');
const getVisibilityWatcher = require('./lib/getVisibilityWatcher.js');
const initMetric = require('./lib/initMetric.js');
const initUnique = require('./lib/initUnique.js');
const LayoutShiftManager = require('./lib/LayoutShiftManager.js');
const observe = require('./lib/observe.js');
const runOnce = require('./lib/runOnce.js');
const onFCP = require('./onFCP.js');

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


/** Thresholds for CLS. See https://web.dev/articles/cls#what_is_a_good_cls_score */
const CLSThresholds = [0.1, 0.25];

/**
 * Calculates the [CLS](https://web.dev/articles/cls) value for the current page and
 * calls the `callback` function once the value is ready to be reported, along
 * with all `layout-shift` performance entries that were used in the metric
 * value calculation. The reported value is a `double` (corresponding to a
 * [layout shift score](https://web.dev/articles/cls#layout_shift_score)).
 *
 * If the `reportAllChanges` configuration option is set to `true`, the
 * `callback` function will be called as soon as the value is initially
 * determined as well as any time the value changes throughout the page
 * lifespan.
 *
 * _**Important:** CLS should be continually monitored for changes throughout
 * the entire lifespan of a page—including if the user returns to the page after
 * it's been hidden/backgrounded. However, since browsers often [will not fire
 * additional callbacks once the user has backgrounded a
 * page](https://developer.chrome.com/blog/page-lifecycle-api/#advice-hidden),
 * `callback` is always called when the page's visibility state changes to
 * hidden. As a result, the `callback` function might be called multiple times
 * during the same page load._
 */
const onCLS = (onReport, opts = {}) => {
  // Start monitoring FCP so we can only report CLS if FCP is also reported.
  // Note: this is done to match the current behavior of CrUX.
  onFCP.onFCP(
    runOnce.runOnce(() => {
      const metric = initMetric.initMetric('CLS', 0);
      let report;
      const visibilityWatcher = getVisibilityWatcher.getVisibilityWatcher();

      const layoutShiftManager = initUnique.initUnique(opts, LayoutShiftManager.LayoutShiftManager);

      const handleEntries = (entries) => {
        for (const entry of entries) {
          layoutShiftManager._processEntry(entry);
        }

        // If the current session value is larger than the current CLS value,
        // update CLS and the entries contributing to it.
        if (layoutShiftManager._sessionValue > metric.value) {
          metric.value = layoutShiftManager._sessionValue;
          metric.entries = layoutShiftManager._sessionEntries;
          report();
        }
      };

      const po = observe.observe('layout-shift', handleEntries);
      if (po) {
        report = bindReporter.bindReporter(onReport, metric, CLSThresholds, opts.reportAllChanges);

        visibilityWatcher.onHidden(() => {
          handleEntries(po.takeRecords() );
          report(true);
        });

        // Queue a task to report (if nothing else triggers a report first).
        // This allows CLS to be reported as soon as FCP fires when
        // `reportAllChanges` is true.
        types.WINDOW?.setTimeout?.(report);
      }
    }),
  );
};

exports.CLSThresholds = CLSThresholds;
exports.onCLS = onCLS;
//# sourceMappingURL=getCLS.js.map
