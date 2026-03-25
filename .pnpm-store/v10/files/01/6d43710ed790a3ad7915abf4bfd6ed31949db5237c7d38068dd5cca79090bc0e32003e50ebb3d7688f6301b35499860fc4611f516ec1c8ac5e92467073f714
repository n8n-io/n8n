var hasInherit = require('./has-inherit');
var everyValuesPair = require('./every-values-pair');
var findComponentIn = require('./find-component-in');
var isComponentOf = require('./is-component-of');
var isMergeableShorthand = require('./is-mergeable-shorthand');
var overridesNonComponentShorthand = require('./overrides-non-component-shorthand');
var sameVendorPrefixesIn = require('./vendor-prefixes').same;

var compactable = require('../compactable');
var deepClone = require('../clone').deep;
var restoreWithComponents = require('../restore-with-components');
var shallowClone = require('../clone').shallow;

var restoreFromOptimizing = require('../../restore-from-optimizing');

var Token = require('../../../tokenizer/token');
var Marker = require('../../../tokenizer/marker');

var serializeProperty = require('../../../writer/one-time').property;

function wouldBreakCompatibility(property, validator) {
  for (var i = 0; i < property.components.length; i++) {
    var component = property.components[i];
    var descriptor = compactable[component.name];
    var canOverride = descriptor && descriptor.canOverride || canOverride.sameValue;

    var _component = shallowClone(component);
    _component.value = [[Token.PROPERTY_VALUE, descriptor.defaultValue]];

    if (!everyValuesPair(canOverride.bind(null, validator), _component, component)) {
      return true;
    }
  }

  return false;
}

function overrideIntoMultiplex(property, by) {
  by.unused = true;

  turnIntoMultiplex(by, multiplexSize(property));
  property.value = by.value;
}

function overrideByMultiplex(property, by) {
  by.unused = true;
  property.multiplex = true;
  property.value = by.value;
}

function overrideSimple(property, by) {
  by.unused = true;
  property.value = by.value;
}

function override(property, by) {
  if (by.multiplex)
    overrideByMultiplex(property, by);
  else if (property.multiplex)
    overrideIntoMultiplex(property, by);
  else
    overrideSimple(property, by);
}

function overrideShorthand(property, by) {
  by.unused = true;

  for (var i = 0, l = property.components.length; i < l; i++) {
    override(property.components[i], by.components[i], property.multiplex);
  }
}

function turnIntoMultiplex(property, size) {
  property.multiplex = true;

  if (compactable[property.name].shorthand) {
    turnShorthandValueIntoMultiplex(property, size);
  } else {
    turnLonghandValueIntoMultiplex(property, size);
  }
}

function turnShorthandValueIntoMultiplex(property, size) {
  var component;
  var i, l;

  for (i = 0, l = property.components.length; i < l; i++) {
    component = property.components[i];

    if (!component.multiplex) {
      turnLonghandValueIntoMultiplex(component, size);
    }
  }
}

function turnLonghandValueIntoMultiplex(property, size) {
  var descriptor = compactable[property.name];
  var withRealValue = descriptor.intoMultiplexMode == 'real';
  var withValue = descriptor.intoMultiplexMode == 'real' ?
    property.value.slice(0) :
    (descriptor.intoMultiplexMode == 'placeholder' ? descriptor.placeholderValue : descriptor.defaultValue);
  var i = multiplexSize(property);
  var j;
  var m = withValue.length;

  for (; i < size; i++) {
    property.value.push([Token.PROPERTY_VALUE, Marker.COMMA]);

    if (Array.isArray(withValue)) {
      for (j = 0; j < m; j++) {
        property.value.push(withRealValue ? withValue[j] : [Token.PROPERTY_VALUE, withValue[j]]);
      }
    } else {
      property.value.push(withRealValue ? withValue : [Token.PROPERTY_VALUE, withValue]);
    }
  }
}

function multiplexSize(component) {
  var size = 0;

  for (var i = 0, l = component.value.length; i < l; i++) {
    if (component.value[i][1] == Marker.COMMA)
      size++;
  }

  return size + 1;
}

function lengthOf(property) {
  var fakeAsArray = [
    Token.PROPERTY,
    [Token.PROPERTY_NAME, property.name]
  ].concat(property.value);
  return serializeProperty([fakeAsArray], 0).length;
}

function moreSameShorthands(properties, startAt, name) {
  // Since we run the main loop in `compactOverrides` backwards, at this point some
  // properties may not be marked as unused.
  // We should consider reverting the order if possible
  var count = 0;

  for (var i = startAt; i >= 0; i--) {
    if (properties[i].name == name && !properties[i].unused)
      count++;
    if (count > 1)
      break;
  }

  return count > 1;
}

function overridingFunction(shorthand, validator) {
  for (var i = 0, l = shorthand.components.length; i < l; i++) {
    if (!anyValue(validator.isUrl, shorthand.components[i]) && anyValue(validator.isFunction, shorthand.components[i])) {
      return true;
    }
  }

  return false;
}

function anyValue(fn, property) {
  for (var i = 0, l = property.value.length; i < l; i++) {
    if (property.value[i][1] == Marker.COMMA)
      continue;

    if (fn(property.value[i][1]))
      return true;
  }

  return false;
}

function wouldResultInLongerValue(left, right) {
  if (!left.multiplex && !right.multiplex || left.multiplex && right.multiplex)
    return false;

  var multiplex = left.multiplex ? left : right;
  var simple = left.multiplex ? right : left;
  var component;

  var multiplexClone = deepClone(multiplex);
  restoreFromOptimizing([multiplexClone], restoreWithComponents);

  var simpleClone = deepClone(simple);
  restoreFromOptimizing([simpleClone], restoreWithComponents);

  var lengthBefore = lengthOf(multiplexClone) + 1 + lengthOf(simpleClone);

  if (left.multiplex) {
    component = findComponentIn(multiplexClone, simpleClone);
    overrideIntoMultiplex(component, simpleClone);
  } else {
    component = findComponentIn(simpleClone, multiplexClone);
    turnIntoMultiplex(simpleClone, multiplexSize(multiplexClone));
    overrideByMultiplex(component, multiplexClone);
  }

  restoreFromOptimizing([simpleClone], restoreWithComponents);

  var lengthAfter = lengthOf(simpleClone);

  return lengthBefore <= lengthAfter;
}

function isCompactable(property) {
  return property.name in compactable;
}

function noneOverrideHack(left, right) {
  return !left.multiplex &&
    (left.name == 'background' || left.name == 'background-image') &&
    right.multiplex &&
    (right.name == 'background' || right.name == 'background-image') &&
    anyLayerIsNone(right.value);
}

function anyLayerIsNone(values) {
  var layers = intoLayers(values);

  for (var i = 0, l = layers.length; i < l; i++) {
    if (layers[i].length == 1 && layers[i][0][1] == 'none')
      return true;
  }

  return false;
}

function intoLayers(values) {
  var layers = [];

  for (var i = 0, layer = [], l = values.length; i < l; i++) {
    var value = values[i];
    if (value[1] == Marker.COMMA) {
      layers.push(layer);
      layer = [];
    } else {
      layer.push(value);
    }
  }

  layers.push(layer);
  return layers;
}

function overrideProperties(properties, withMerging, compatibility, validator) {
  var mayOverride, right, left, component;
  var overriddenComponents;
  var overriddenComponent;
  var overridingComponent;
  var overridable;
  var i, j, k;

  propertyLoop:
  for (i = properties.length - 1; i >= 0; i--) {
    right = properties[i];

    if (!isCompactable(right))
      continue;

    if (right.block)
      continue;

    mayOverride = compactable[right.name].canOverride;

    traverseLoop:
    for (j = i - 1; j >= 0; j--) {
      left = properties[j];

      if (!isCompactable(left))
        continue;

      if (left.block)
        continue;

      if (left.unused || right.unused)
        continue;

      if (left.hack && !right.hack && !right.important || !left.hack && !left.important && right.hack)
        continue;

      if (left.important == right.important && left.hack[0] != right.hack[0])
        continue;

      if (left.important == right.important && (left.hack[0] != right.hack[0] || (left.hack[1] && left.hack[1] != right.hack[1])))
        continue;

      if (hasInherit(right))
        continue;

      if (noneOverrideHack(left, right))
        continue;

      if (right.shorthand && isComponentOf(right, left)) {
        // maybe `left` can be overridden by `right` which is a shorthand?
        if (!right.important && left.important)
          continue;

        if (!sameVendorPrefixesIn([left], right.components))
          continue;

        if (!anyValue(validator.isFunction, left) && overridingFunction(right, validator))
          continue;

        if (!isMergeableShorthand(right)) {
          left.unused = true;
          continue;
        }

        component = findComponentIn(right, left);
        mayOverride = compactable[left.name].canOverride;
        if (everyValuesPair(mayOverride.bind(null, validator), left, component)) {
          left.unused = true;
        }
      } else if (right.shorthand && overridesNonComponentShorthand(right, left)) {
        // `right` is a shorthand while `left` can be overriden by it, think `border` and `border-top`
        if (!right.important && left.important) {
          continue;
        }

        if (!sameVendorPrefixesIn([left], right.components)) {
          continue;
        }

        if (!anyValue(validator.isFunction, left) && overridingFunction(right, validator)) {
          continue;
        }

        overriddenComponents = left.shorthand ?
          left.components:
          [left];

        for (k = overriddenComponents.length - 1; k >= 0; k--) {
          overriddenComponent = overriddenComponents[k];
          overridingComponent = findComponentIn(right, overriddenComponent);
          mayOverride = compactable[overriddenComponent.name].canOverride;

          if (!everyValuesPair(mayOverride.bind(null, validator), left, overridingComponent)) {
            continue traverseLoop;
          }
        }

        left.unused = true;
      } else if (withMerging && left.shorthand && !right.shorthand && isComponentOf(left, right, true)) {
        // maybe `right` can be pulled into `left` which is a shorthand?
        if (right.important && !left.important)
          continue;

        if (!right.important && left.important) {
          right.unused = true;
          continue;
        }

        // Pending more clever algorithm in #527
        if (moreSameShorthands(properties, i - 1, left.name))
          continue;

        if (overridingFunction(left, validator))
          continue;

        if (!isMergeableShorthand(left))
          continue;

        component = findComponentIn(left, right);
        if (everyValuesPair(mayOverride.bind(null, validator), component, right)) {
          var disabledBackgroundMerging =
            !compatibility.properties.backgroundClipMerging && component.name.indexOf('background-clip') > -1 ||
            !compatibility.properties.backgroundOriginMerging && component.name.indexOf('background-origin') > -1 ||
            !compatibility.properties.backgroundSizeMerging && component.name.indexOf('background-size') > -1;
          var nonMergeableValue = compactable[right.name].nonMergeableValue === right.value[0][1];

          if (disabledBackgroundMerging || nonMergeableValue)
            continue;

          if (!compatibility.properties.merging && wouldBreakCompatibility(left, validator))
            continue;

          if (component.value[0][1] != right.value[0][1] && (hasInherit(left) || hasInherit(right)))
            continue;

          if (wouldResultInLongerValue(left, right))
            continue;

          if (!left.multiplex && right.multiplex)
            turnIntoMultiplex(left, multiplexSize(right));

          override(component, right);
          left.dirty = true;
        }
      } else if (withMerging && left.shorthand && right.shorthand && left.name == right.name) {
        // merge if all components can be merged

        if (!left.multiplex && right.multiplex)
          continue;

        if (!right.important && left.important) {
          right.unused = true;
          continue propertyLoop;
        }

        if (right.important && !left.important) {
          left.unused = true;
          continue;
        }

        if (!isMergeableShorthand(right)) {
          left.unused = true;
          continue;
        }

        for (k = left.components.length - 1; k >= 0; k--) {
          var leftComponent = left.components[k];
          var rightComponent = right.components[k];

          mayOverride = compactable[leftComponent.name].canOverride;
          if (!everyValuesPair(mayOverride.bind(null, validator), leftComponent, rightComponent))
            continue propertyLoop;
        }

        overrideShorthand(left, right);
        left.dirty = true;
      } else if (withMerging && left.shorthand && right.shorthand && isComponentOf(left, right)) {
        // border is a shorthand but any of its components is a shorthand too

        if (!left.important && right.important)
          continue;

        component = findComponentIn(left, right);
        mayOverride = compactable[right.name].canOverride;
        if (!everyValuesPair(mayOverride.bind(null, validator), component, right))
          continue;

        if (left.important && !right.important) {
          right.unused = true;
          continue;
        }

        var rightRestored = compactable[right.name].restore(right, compactable);
        if (rightRestored.length > 1)
          continue;

        component = findComponentIn(left, right);
        override(component, right);
        right.dirty = true;
      } else if (left.name == right.name) {
        // two non-shorthands should be merged based on understandability
        overridable = true;

        if (right.shorthand) {
          for (k = right.components.length - 1; k >= 0 && overridable; k--) {
            overriddenComponent = left.components[k];
            overridingComponent = right.components[k];
            mayOverride = compactable[overridingComponent.name].canOverride;

            overridable = overridable && everyValuesPair(mayOverride.bind(null, validator), overriddenComponent, overridingComponent);
          }
        } else {
          mayOverride = compactable[right.name].canOverride;
          overridable = everyValuesPair(mayOverride.bind(null, validator), left, right);
        }

        if (left.important && !right.important && overridable) {
          right.unused = true;
          continue;
        }

        if (!left.important && right.important && overridable) {
          left.unused = true;
          continue;
        }

        if (!overridable) {
          continue;
        }

        left.unused = true;
      }
    }
  }
}

module.exports = overrideProperties;
