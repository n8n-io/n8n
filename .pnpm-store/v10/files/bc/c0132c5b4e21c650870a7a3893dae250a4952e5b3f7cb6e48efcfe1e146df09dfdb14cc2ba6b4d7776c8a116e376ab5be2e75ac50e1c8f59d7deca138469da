var naturalCompare = require('../../utils/natural-compare');

function naturalSorter(scope1, scope2) {
  return naturalCompare(scope1[1], scope2[1]);
}

function standardSorter(scope1, scope2) {
  return scope1[1] > scope2[1] ? 1 : -1;
}

function sortSelectors(selectors, method) {
  switch (method) {
    case 'natural':
      return selectors.sort(naturalSorter);
    case 'standard':
      return selectors.sort(standardSorter);
    case 'none':
    case false:
      return selectors;
  }
}

module.exports = sortSelectors;
