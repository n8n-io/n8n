var compactable = require('../compactable');
var InvalidPropertyError = require('../invalid-property-error');

function populateComponents(properties, validator, warnings) {
  var component;
  var j, m;

  for (var i = properties.length - 1; i >= 0; i--) {
    var property = properties[i];
    var descriptor = compactable[property.name];

    if (descriptor && descriptor.shorthand) {
      property.shorthand = true;
      property.dirty = true;

      try {
        property.components = descriptor.breakUp(property, compactable, validator);

        if (descriptor.shorthandComponents) {
          for (j = 0, m = property.components.length; j < m; j++) {
            component = property.components[j];
            component.components = compactable[component.name].breakUp(component, compactable, validator);
          }
        }
      } catch (e) {
        if (e instanceof InvalidPropertyError) {
          property.components = []; // this will set property.unused to true below
          warnings.push(e.message);
        } else {
          throw e;
        }
      }

      if (property.components.length > 0)
        property.multiplex = property.components[0].multiplex;
      else
        property.unused = true;
    }
  }
}

module.exports = populateComponents;
