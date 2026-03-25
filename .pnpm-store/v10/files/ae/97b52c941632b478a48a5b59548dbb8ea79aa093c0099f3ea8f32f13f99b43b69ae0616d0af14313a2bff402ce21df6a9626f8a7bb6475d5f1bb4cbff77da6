Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const getRating = (value, thresholds) => {
  if (value > thresholds[1]) {
    return 'poor';
  }
  if (value > thresholds[0]) {
    return 'needs-improvement';
  }
  return 'good';
};

const bindReporter = (
  callback,
  metric,
  thresholds,
  reportAllChanges,
) => {
  let prevValue;
  let delta;
  return (forceReport) => {
    if (metric.value >= 0) {
      if (forceReport || reportAllChanges) {
        delta = metric.value - (prevValue ?? 0);

        // Report the metric if there's a non-zero delta or if no previous
        // value exists (which can happen in the case of the document becoming
        // hidden when the metric value is 0).
        // See: https://github.com/GoogleChrome/web-vitals/issues/14
        if (delta || prevValue === undefined) {
          prevValue = metric.value;
          metric.delta = delta;
          metric.rating = getRating(metric.value, thresholds);
          callback(metric);
        }
      }
    }
  };
};

exports.bindReporter = bindReporter;
//# sourceMappingURL=bindReporter.js.map
