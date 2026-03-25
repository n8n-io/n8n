'use strict';

function buildRange(item) {
  return {
    start: item,
    count: 1
  };
}

function completeRangeWithItem(range, item) {
  range.end = item;
  range.step = item - range.start;
  range.count = 2;
}

function finalizeCurrentRange(results, currentRange, currentItemRange) {
  if (currentRange) {
    // Two elements do not form a range so split them into 2 single elements
    if (currentRange.count === 2) {
      results.push(buildRange(currentRange.start));
      results.push(buildRange(currentRange.end));
    } else {
      results.push(currentRange);
    }
  }
  if (currentItemRange) {
    results.push(currentItemRange);
  }
}

function compactField(arr) {
  var results = [];
  var currentRange = undefined;

  for (var i = 0; i < arr.length; i++) {
    var currentItem = arr[i];
    if (typeof currentItem !== 'number') {
      // String elements can't form a range
      finalizeCurrentRange(results, currentRange, buildRange(currentItem));
      currentRange = undefined;
    } else if (!currentRange) {
      // Start a new range
      currentRange = buildRange(currentItem);
    } else if (currentRange.count === 1) {
      // Guess that the current item starts a range
      completeRangeWithItem(currentRange, currentItem);
    } else {
      if (currentRange.step === currentItem - currentRange.end) {
        // We found another item that matches the current range
        currentRange.count++;
        currentRange.end = currentItem;
      } else if (currentRange.count === 2) { // The current range can't be continued
        // Break the first item of the current range into a single element, and try to start a new range with the second item
        results.push(buildRange(currentRange.start));
        currentRange = buildRange(currentRange.end);
        completeRangeWithItem(currentRange, currentItem);
      } else {
        // Persist the current range and start a new one with current item
        finalizeCurrentRange(results, currentRange);
        currentRange = buildRange(currentItem);
      }
    }
  }

  finalizeCurrentRange(results, currentRange);

  return results;
}

module.exports = compactField;
