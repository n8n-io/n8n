var compactable = require('./compactable');

function restoreWithComponents(property) {
  var descriptor = compactable[property.name];

  if (descriptor && descriptor.shorthand) {
    return descriptor.restore(property, compactable);
  } else {
    return property.value;
  }
}

module.exports = restoreWithComponents;
