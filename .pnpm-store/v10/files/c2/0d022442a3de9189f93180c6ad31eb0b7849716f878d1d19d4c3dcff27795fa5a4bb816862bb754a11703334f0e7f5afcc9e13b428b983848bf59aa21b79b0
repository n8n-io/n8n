var compactable = require('../compactable');

function findComponentIn(shorthand, longhand) {
  var comparator = nameComparator(longhand);

  return findInDirectComponents(shorthand, comparator) || findInSubComponents(shorthand, comparator);
}

function nameComparator(to) {
  return function (property) {
    return to.name === property.name;
  };
}

function findInDirectComponents(shorthand, comparator) {
  return shorthand.components.filter(comparator)[0];
}

function findInSubComponents(shorthand, comparator) {
  var shorthandComponent;
  var longhandMatch;
  var i, l;

  if (!compactable[shorthand.name].shorthandComponents) {
    return;
  }

  for (i = 0, l = shorthand.components.length; i < l; i++) {
    shorthandComponent = shorthand.components[i];
    longhandMatch = findInDirectComponents(shorthandComponent, comparator);

    if (longhandMatch) {
      return longhandMatch;
    }
  }

  return;
}

module.exports = findComponentIn;
