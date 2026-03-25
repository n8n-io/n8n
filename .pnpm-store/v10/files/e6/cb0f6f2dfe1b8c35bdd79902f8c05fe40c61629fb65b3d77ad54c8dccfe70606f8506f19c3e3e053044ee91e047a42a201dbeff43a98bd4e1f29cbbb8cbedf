var InvalidPropertyError = require('./invalid-property-error');

var wrapSingle = require('../wrap-for-optimizing').single;

var Token = require('../../tokenizer/token');
var Marker = require('../../tokenizer/marker');

var formatPosition = require('../../utils/format-position');

function _anyIsInherit(values) {
  var i, l;

  for (i = 0, l = values.length; i < l; i++) {
    if (values[i][1] == 'inherit') {
      return true;
    }
  }

  return false;
}

function _colorFilter(validator) {
  return function (value) {
    return value[1] == 'invert' || validator.isColor(value[1]) || validator.isPrefixed(value[1]);
  };
}

function _styleFilter(validator) {
  return function (value) {
    return value[1] != 'inherit' && validator.isStyleKeyword(value[1]) && !validator.isColorFunction(value[1]);
  };
}

function _wrapDefault(name, property, compactable) {
  var descriptor = compactable[name];
  if (descriptor.doubleValues && descriptor.defaultValue.length == 2) {
    return wrapSingle([
      Token.PROPERTY,
      [Token.PROPERTY_NAME, name],
      [Token.PROPERTY_VALUE, descriptor.defaultValue[0]],
      [Token.PROPERTY_VALUE, descriptor.defaultValue[1]]
    ]);
  } else if (descriptor.doubleValues && descriptor.defaultValue.length == 1) {
    return wrapSingle([
      Token.PROPERTY,
      [Token.PROPERTY_NAME, name],
      [Token.PROPERTY_VALUE, descriptor.defaultValue[0]]
    ]);
  } else {
    return wrapSingle([
      Token.PROPERTY,
      [Token.PROPERTY_NAME, name],
      [Token.PROPERTY_VALUE, descriptor.defaultValue]
    ]);
  }
}

function _widthFilter(validator) {
  return function (value) {
    return value[1] != 'inherit' &&
      (validator.isWidth(value[1]) || validator.isUnit(value[1]) && !validator.isDynamicUnit(value[1])) &&
      !validator.isStyleKeyword(value[1]) &&
      !validator.isColorFunction(value[1]);
  };
}

function animation(property, compactable, validator) {
  var duration = _wrapDefault(property.name + '-duration', property, compactable);
  var timing = _wrapDefault(property.name + '-timing-function', property, compactable);
  var delay = _wrapDefault(property.name + '-delay', property, compactable);
  var iteration = _wrapDefault(property.name + '-iteration-count', property, compactable);
  var direction = _wrapDefault(property.name + '-direction', property, compactable);
  var fill = _wrapDefault(property.name + '-fill-mode', property, compactable);
  var play = _wrapDefault(property.name + '-play-state', property, compactable);
  var name = _wrapDefault(property.name + '-name', property, compactable);
  var components = [duration, timing, delay, iteration, direction, fill, play, name];
  var values = property.value;
  var value;
  var durationSet = false;
  var timingSet = false;
  var delaySet = false;
  var iterationSet = false;
  var directionSet = false;
  var fillSet = false;
  var playSet = false;
  var nameSet = false;
  var i;
  var l;

  if (property.value.length == 1 && property.value[0][1] == 'inherit') {
    duration.value = timing.value = delay.value = iteration.value = direction.value = fill.value = play.value = name.value = property.value;
    return components;
  }

  if (values.length > 1 && _anyIsInherit(values)) {
    throw new InvalidPropertyError('Invalid animation values at ' + formatPosition(values[0][2][0]) + '. Ignoring.');
  }

  for (i = 0, l = values.length; i < l; i++) {
    value = values[i];

    if (validator.isTime(value[1]) && !durationSet) {
      duration.value = [value];
      durationSet = true;
    } else if (validator.isTime(value[1]) && !delaySet) {
      delay.value = [value];
      delaySet = true;
    } else if ((validator.isGlobal(value[1]) || validator.isTimingFunction(value[1])) && !timingSet) {
      timing.value = [value];
      timingSet = true;
    } else if ((validator.isAnimationIterationCountKeyword(value[1]) || validator.isPositiveNumber(value[1])) && !iterationSet) {
      iteration.value = [value];
      iterationSet = true;
    } else if (validator.isAnimationDirectionKeyword(value[1]) && !directionSet) {
      direction.value = [value];
      directionSet = true;
    } else if (validator.isAnimationFillModeKeyword(value[1]) && !fillSet) {
      fill.value = [value];
      fillSet = true;
    } else if (validator.isAnimationPlayStateKeyword(value[1]) && !playSet) {
      play.value = [value];
      playSet = true;
    } else if ((validator.isAnimationNameKeyword(value[1]) || validator.isIdentifier(value[1])) && !nameSet) {
      name.value = [value];
      nameSet = true;
    } else {
      throw new InvalidPropertyError('Invalid animation value at ' + formatPosition(value[2][0]) + '. Ignoring.');
    }
  }

  return components;
}

function background(property, compactable, validator) {
  var image = _wrapDefault('background-image', property, compactable);
  var position = _wrapDefault('background-position', property, compactable);
  var size = _wrapDefault('background-size', property, compactable);
  var repeat = _wrapDefault('background-repeat', property, compactable);
  var attachment = _wrapDefault('background-attachment', property, compactable);
  var origin = _wrapDefault('background-origin', property, compactable);
  var clip = _wrapDefault('background-clip', property, compactable);
  var color = _wrapDefault('background-color', property, compactable);
  var components = [image, position, size, repeat, attachment, origin, clip, color];
  var values = property.value;

  var positionSet = false;
  var clipSet = false;
  var originSet = false;
  var repeatSet = false;

  var anyValueSet = false;

  if (property.value.length == 1 && property.value[0][1] == 'inherit') {
    // NOTE: 'inherit' is not a valid value for background-attachment
    color.value = image.value =  repeat.value = position.value = size.value = origin.value = clip.value = property.value;
    return components;
  }

  if (property.value.length == 1 && property.value[0][1] == '0 0') {
    return components;
  }

  for (var i = values.length - 1; i >= 0; i--) {
    var value = values[i];

    if (validator.isBackgroundAttachmentKeyword(value[1])) {
      attachment.value = [value];
      anyValueSet = true;
    } else if (validator.isBackgroundClipKeyword(value[1]) || validator.isBackgroundOriginKeyword(value[1])) {
      if (clipSet) {
        origin.value = [value];
        originSet = true;
      } else {
        clip.value = [value];
        clipSet = true;
      }
      anyValueSet = true;
    } else if (validator.isBackgroundRepeatKeyword(value[1])) {
      if (repeatSet) {
        repeat.value.unshift(value);
      } else {
        repeat.value = [value];
        repeatSet = true;
      }
      anyValueSet = true;
    } else if (validator.isBackgroundPositionKeyword(value[1]) || validator.isBackgroundSizeKeyword(value[1]) || validator.isUnit(value[1]) || validator.isDynamicUnit(value[1])) {
      if (i > 0) {
        var previousValue = values[i - 1];

        if (previousValue[1] == Marker.FORWARD_SLASH) {
          size.value = [value];
        } else if (i > 1 && values[i - 2][1] == Marker.FORWARD_SLASH) {
          size.value = [previousValue, value];
          i -= 2;
        } else {
          if (!positionSet)
            position.value = [];

          position.value.unshift(value);
          positionSet = true;
        }
      } else {
        if (!positionSet)
          position.value = [];

        position.value.unshift(value);
        positionSet = true;
      }
      anyValueSet = true;
    } else if ((color.value[0][1] == compactable[color.name].defaultValue || color.value[0][1] == 'none') && (validator.isColor(value[1]) || validator.isPrefixed(value[1]))) {
      color.value = [value];
      anyValueSet = true;
    } else if (validator.isUrl(value[1]) || validator.isFunction(value[1])) {
      image.value = [value];
      anyValueSet = true;
    }
  }

  if (clipSet && !originSet)
    origin.value = clip.value.slice(0);

  if (!anyValueSet) {
    throw new InvalidPropertyError('Invalid background value at ' + formatPosition(values[0][2][0]) + '. Ignoring.');
  }

  return components;
}

function borderRadius(property, compactable) {
  var values = property.value;
  var splitAt = -1;

  for (var i = 0, l = values.length; i < l; i++) {
    if (values[i][1] == Marker.FORWARD_SLASH) {
      splitAt = i;
      break;
    }
  }

  if (splitAt === 0 || splitAt === values.length - 1) {
    throw new InvalidPropertyError('Invalid border-radius value at ' + formatPosition(values[0][2][0]) + '. Ignoring.');
  }

  var target = _wrapDefault(property.name, property, compactable);
  target.value = splitAt > -1 ?
    values.slice(0, splitAt) :
    values.slice(0);
  target.components = fourValues(target, compactable);

  var remainder = _wrapDefault(property.name, property, compactable);
  remainder.value = splitAt > -1 ?
    values.slice(splitAt + 1) :
    values.slice(0);
  remainder.components = fourValues(remainder, compactable);

  for (var j = 0; j < 4; j++) {
    target.components[j].multiplex = true;
    target.components[j].value = target.components[j].value.concat(remainder.components[j].value);
  }

  return target.components;
}

function font(property, compactable, validator) {
  var style = _wrapDefault('font-style', property, compactable);
  var variant = _wrapDefault('font-variant', property, compactable);
  var weight = _wrapDefault('font-weight', property, compactable);
  var stretch = _wrapDefault('font-stretch', property, compactable);
  var size = _wrapDefault('font-size', property, compactable);
  var height = _wrapDefault('line-height', property, compactable);
  var family = _wrapDefault('font-family', property, compactable);
  var components = [style, variant, weight, stretch, size, height, family];
  var values = property.value;
  var fuzzyMatched = 4; // style, variant, weight, and stretch
  var index = 0;
  var isStretchSet = false;
  var isStretchValid;
  var isStyleSet = false;
  var isStyleValid;
  var isVariantSet = false;
  var isVariantValid;
  var isWeightSet = false;
  var isWeightValid;
  var isSizeSet = false;
  var appendableFamilyName = false;

  if (!values[index]) {
    throw new InvalidPropertyError('Missing font values at ' + formatPosition(property.all[property.position][1][2][0]) + '. Ignoring.');
  }

  if (values.length == 1 && values[0][1] == 'inherit') {
    style.value = variant.value = weight.value = stretch.value = size.value = height.value = family.value = values;
    return components;
  }

  if (values.length == 1 && (validator.isFontKeyword(values[0][1]) || validator.isGlobal(values[0][1]) || validator.isPrefixed(values[0][1]))) {
    values[0][1] = Marker.INTERNAL + values[0][1];
    style.value = variant.value = weight.value = stretch.value = size.value = height.value = family.value = values;
    return components;
  }

  if (values.length < 2 || !_anyIsFontSize(values, validator) || !_anyIsFontFamily(values, validator)) {
    throw new InvalidPropertyError('Invalid font values at ' + formatPosition(property.all[property.position][1][2][0]) + '. Ignoring.');
  }

  if (values.length > 1 && _anyIsInherit(values)) {
    throw new InvalidPropertyError('Invalid font values at ' + formatPosition(values[0][2][0]) + '. Ignoring.');
  }

  // fuzzy match style, variant, weight, and stretch on first elements
  while (index < fuzzyMatched) {
    isStretchValid = validator.isFontStretchKeyword(values[index][1]) || validator.isGlobal(values[index][1]);
    isStyleValid = validator.isFontStyleKeyword(values[index][1]) || validator.isGlobal(values[index][1]);
    isVariantValid = validator.isFontVariantKeyword(values[index][1]) || validator.isGlobal(values[index][1]);
    isWeightValid = validator.isFontWeightKeyword(values[index][1]) || validator.isGlobal(values[index][1]);

    if (isStyleValid && !isStyleSet) {
      style.value = [values[index]];
      isStyleSet = true;
    } else if (isVariantValid && !isVariantSet) {
      variant.value = [values[index]];
      isVariantSet = true;
    } else if (isWeightValid && !isWeightSet) {
      weight.value = [values[index]];
      isWeightSet = true;
    } else if (isStretchValid && !isStretchSet) {
      stretch.value = [values[index]];
      isStretchSet = true;
    } else if (isStyleValid && isStyleSet || isVariantValid && isVariantSet || isWeightValid && isWeightSet || isStretchValid && isStretchSet) {
      throw new InvalidPropertyError('Invalid font style / variant / weight / stretch value at ' + formatPosition(values[0][2][0]) + '. Ignoring.');
    } else {
      break;
    }

    index++;
  }

  // now comes font-size ...
  if (validator.isFontSizeKeyword(values[index][1]) || validator.isUnit(values[index][1]) && !validator.isDynamicUnit(values[index][1])) {
    size.value = [values[index]];
    isSizeSet = true;
    index++;
  } else {
    throw new InvalidPropertyError('Missing font size at ' + formatPosition(values[0][2][0]) + '. Ignoring.');
  }

  if (!values[index]) {
    throw new InvalidPropertyError('Missing font family at ' + formatPosition(values[0][2][0]) + '. Ignoring.');
  }

  // ... and perhaps line-height
  if (isSizeSet && values[index] && values[index][1] == Marker.FORWARD_SLASH && values[index + 1] && (validator.isLineHeightKeyword(values[index + 1][1]) || validator.isUnit(values[index + 1][1]) || validator.isNumber(values[index + 1][1]))) {
    height.value = [values[index + 1]];
    index++;
    index++;
  }

  // ... and whatever comes next is font-family
  family.value = [];

  while (values[index]) {
    if (values[index][1] == Marker.COMMA) {
      appendableFamilyName = false;
    } else {
      if (appendableFamilyName) {
        family.value[family.value.length - 1][1] += Marker.SPACE + values[index][1];
      } else {
        family.value.push(values[index]);
      }

      appendableFamilyName = true;
    }

    index++;
  }

  if (family.value.length === 0) {
    throw new InvalidPropertyError('Missing font family at ' + formatPosition(values[0][2][0]) + '. Ignoring.');
  }

  return components;
}

function _anyIsFontSize(values, validator) {
  var value;
  var i, l;

  for (i = 0, l = values.length; i < l; i++) {
    value = values[i];

    if (validator.isFontSizeKeyword(value[1]) || validator.isUnit(value[1]) && !validator.isDynamicUnit(value[1]) || validator.isFunction(value[1])) {
      return true;
    }
  }

  return false;
}

function _anyIsFontFamily(values, validator) {
  var value;
  var i, l;

  for (i = 0, l = values.length; i < l; i++) {
    value = values[i];

    if (validator.isIdentifier(value[1])) {
      return true;
    }
  }

  return false;
}

function fourValues(property, compactable) {
  var componentNames = compactable[property.name].components;
  var components = [];
  var value = property.value;

  if (value.length < 1)
    return [];

  if (value.length < 2)
    value[1] = value[0].slice(0);
  if (value.length < 3)
    value[2] = value[0].slice(0);
  if (value.length < 4)
    value[3] = value[1].slice(0);

  for (var i = componentNames.length - 1; i >= 0; i--) {
    var component = wrapSingle([
      Token.PROPERTY,
      [Token.PROPERTY_NAME, componentNames[i]]
    ]);
    component.value = [value[i]];
    components.unshift(component);
  }

  return components;
}

function multiplex(splitWith) {
  return function (property, compactable, validator) {
    var splitsAt = [];
    var values = property.value;
    var i, j, l, m;

    // find split commas
    for (i = 0, l = values.length; i < l; i++) {
      if (values[i][1] == ',')
        splitsAt.push(i);
    }

    if (splitsAt.length === 0)
      return splitWith(property, compactable, validator);

    var splitComponents = [];

    // split over commas, and into components
    for (i = 0, l = splitsAt.length; i <= l; i++) {
      var from = i === 0 ? 0 : splitsAt[i - 1] + 1;
      var to = i < l ? splitsAt[i] : values.length;

      var _property = _wrapDefault(property.name, property, compactable);
      _property.value = values.slice(from, to);

      splitComponents.push(splitWith(_property, compactable, validator));
    }

    var components = splitComponents[0];

    // group component values from each split
    for (i = 0, l = components.length; i < l; i++) {
      components[i].multiplex = true;

      for (j = 1, m = splitComponents.length; j < m; j++) {
        components[i].value.push([Token.PROPERTY_VALUE, Marker.COMMA]);
        Array.prototype.push.apply(components[i].value, splitComponents[j][i].value);
      }
    }

    return components;
  };
}

function listStyle(property, compactable, validator) {
  var type = _wrapDefault('list-style-type', property, compactable);
  var position = _wrapDefault('list-style-position', property, compactable);
  var image = _wrapDefault('list-style-image', property, compactable);
  var components = [type, position, image];

  if (property.value.length == 1 && property.value[0][1] == 'inherit') {
    type.value = position.value = image.value = [property.value[0]];
    return components;
  }

  var values = property.value.slice(0);
  var total = values.length;
  var index = 0;

  // `image` first...
  for (index = 0, total = values.length; index < total; index++) {
    if (validator.isUrl(values[index][1]) || values[index][1] == '0') {
      image.value = [values[index]];
      values.splice(index, 1);
      break;
    }
  }

  // ... then `position`
  for (index = 0, total = values.length; index < total; index++) {
    if (validator.isListStylePositionKeyword(values[index][1])) {
      position.value = [values[index]];
      values.splice(index, 1);
      break;
    }
  }

  // ... and what's left is a `type`
  if (values.length > 0 && (validator.isListStyleTypeKeyword(values[0][1]) || validator.isIdentifier(values[0][1]))) {
    type.value = [values[0]];
  }

  return components;
}

function transition(property, compactable, validator) {
  var prop = _wrapDefault(property.name + '-property', property, compactable);
  var duration = _wrapDefault(property.name + '-duration', property, compactable);
  var timing = _wrapDefault(property.name + '-timing-function', property, compactable);
  var delay = _wrapDefault(property.name + '-delay', property, compactable);
  var components = [prop, duration, timing, delay];
  var values = property.value;
  var value;
  var durationSet = false;
  var delaySet = false;
  var propSet = false;
  var timingSet = false;
  var i;
  var l;

  if (property.value.length == 1 && property.value[0][1] == 'inherit') {
    prop.value = duration.value = timing.value = delay.value = property.value;
    return components;
  }

  if (values.length > 1 && _anyIsInherit(values)) {
    throw new InvalidPropertyError('Invalid animation values at ' + formatPosition(values[0][2][0]) + '. Ignoring.');
  }

  for (i = 0, l = values.length; i < l; i++) {
    value = values[i];

    if (validator.isTime(value[1]) && !durationSet) {
      duration.value = [value];
      durationSet = true;
    } else if (validator.isTime(value[1]) && !delaySet) {
      delay.value = [value];
      delaySet = true;
    } else if ((validator.isGlobal(value[1]) || validator.isTimingFunction(value[1])) && !timingSet) {
      timing.value = [value];
      timingSet = true;
    } else if (validator.isIdentifier(value[1]) && !propSet) {
      prop.value = [value];
      propSet = true;
    } else {
      throw new InvalidPropertyError('Invalid animation value at ' + formatPosition(value[2][0]) + '. Ignoring.');
    }
  }

  return components;
}

function widthStyleColor(property, compactable, validator) {
  var descriptor = compactable[property.name];
  var components = [
    _wrapDefault(descriptor.components[0], property, compactable),
    _wrapDefault(descriptor.components[1], property, compactable),
    _wrapDefault(descriptor.components[2], property, compactable)
  ];
  var color, style, width;

  for (var i = 0; i < 3; i++) {
    var component = components[i];

    if (component.name.indexOf('color') > 0)
      color = component;
    else if (component.name.indexOf('style') > 0)
      style = component;
    else
      width = component;
  }

  if ((property.value.length == 1 && property.value[0][1] == 'inherit') ||
      (property.value.length == 3 && property.value[0][1] == 'inherit' && property.value[1][1] == 'inherit' && property.value[2][1] == 'inherit')) {
    color.value = style.value = width.value = [property.value[0]];
    return components;
  }

  var values = property.value.slice(0);
  var match, matches;

  // NOTE: usually users don't follow the required order of parts in this shorthand,
  // so we'll try to parse it caring as little about order as possible

  if (values.length > 0) {
    matches = values.filter(_widthFilter(validator));
    match = matches.length > 1 && (matches[0][1] == 'none' || matches[0][1] == 'auto') ? matches[1] : matches[0];
    if (match) {
      width.value = [match];
      values.splice(values.indexOf(match), 1);
    }
  }

  if (values.length > 0) {
    match = values.filter(_styleFilter(validator))[0];
    if (match) {
      style.value = [match];
      values.splice(values.indexOf(match), 1);
    }
  }

  if (values.length > 0) {
    match = values.filter(_colorFilter(validator))[0];
    if (match) {
      color.value = [match];
      values.splice(values.indexOf(match), 1);
    }
  }

  return components;
}

module.exports = {
  animation: animation,
  background: background,
  border: widthStyleColor,
  borderRadius: borderRadius,
  font: font,
  fourValues: fourValues,
  listStyle: listStyle,
  multiplex: multiplex,
  outline: widthStyleColor,
  transition: transition
};
