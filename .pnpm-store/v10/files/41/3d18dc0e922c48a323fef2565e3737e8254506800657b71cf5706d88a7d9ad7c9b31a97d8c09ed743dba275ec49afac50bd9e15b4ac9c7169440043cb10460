var understandable = require('./properties/understandable');

function animationIterationCount(validator, value1, value2) {
  if (!understandable(validator, value1, value2, 0, true) && !(validator.isAnimationIterationCountKeyword(value2) || validator.isPositiveNumber(value2))) {
    return false;
  } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
    return true;
  }

  return validator.isAnimationIterationCountKeyword(value2) || validator.isPositiveNumber(value2);
}

function animationName(validator, value1, value2) {
  if (!understandable(validator, value1, value2, 0, true) && !(validator.isAnimationNameKeyword(value2) || validator.isIdentifier(value2))) {
    return false;
  } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
    return true;
  }

  return validator.isAnimationNameKeyword(value2) || validator.isIdentifier(value2);
}

function areSameFunction(validator, value1, value2) {
  if (!validator.isFunction(value1) || !validator.isFunction(value2)) {
    return false;
  }

  var function1Name = value1.substring(0, value1.indexOf('('));
  var function2Name = value2.substring(0, value2.indexOf('('));

  return function1Name === function2Name;
}

function backgroundPosition(validator, value1, value2) {
  if (!understandable(validator, value1, value2, 0, true) && !(validator.isBackgroundPositionKeyword(value2) || validator.isGlobal(value2))) {
    return false;
  } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
    return true;
  } else if (validator.isBackgroundPositionKeyword(value2) || validator.isGlobal(value2)) {
    return true;
  }

  return unit(validator, value1, value2);
}

function backgroundSize(validator, value1, value2) {
  if (!understandable(validator, value1, value2, 0, true) && !(validator.isBackgroundSizeKeyword(value2) || validator.isGlobal(value2))) {
    return false;
  } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
    return true;
  } else if (validator.isBackgroundSizeKeyword(value2) || validator.isGlobal(value2)) {
    return true;
  }

  return unit(validator, value1, value2);
}

function color(validator, value1, value2) {
  if (!understandable(validator, value1, value2, 0, true) && !validator.isColor(value2)) {
    return false;
  } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
    return true;
  } else if (!validator.colorOpacity && (validator.isRgbColor(value1) || validator.isHslColor(value1))) {
    return false;
  } else if (!validator.colorOpacity && (validator.isRgbColor(value2) || validator.isHslColor(value2))) {
    return false;
  } else if (validator.isColor(value1) && validator.isColor(value2)) {
    return true;
  }

  return sameFunctionOrValue(validator, value1, value2);
}

function components(overrideCheckers) {
  return function (validator, value1, value2, position) {
    return overrideCheckers[position](validator, value1, value2);
  };
}

function fontFamily(validator, value1, value2) {
  return understandable(validator, value1, value2, 0, true);
}

function image(validator, value1, value2) {
  if (!understandable(validator, value1, value2, 0, true) && !validator.isImage(value2)) {
    return false;
  } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
    return true;
  } else if (validator.isImage(value2)) {
    return true;
  } else if (validator.isImage(value1)) {
    return false;
  }

  return sameFunctionOrValue(validator, value1, value2);
}

function keyword(propertyName) {
  return function(validator, value1, value2) {
    if (!understandable(validator, value1, value2, 0, true) && !validator.isKeyword(propertyName)(value2)) {
      return false;
    } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
      return true;
    }

    return validator.isKeyword(propertyName)(value2);
  };
}

function keywordWithGlobal(propertyName) {
  return function(validator, value1, value2) {
    if (!understandable(validator, value1, value2, 0, true) && !(validator.isKeyword(propertyName)(value2) || validator.isGlobal(value2))) {
      return false;
    } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
      return true;
    }

    return validator.isKeyword(propertyName)(value2) || validator.isGlobal(value2);
  };
}

function propertyName(validator, value1, value2) {
  if (!understandable(validator, value1, value2, 0, true) && !validator.isIdentifier(value2)) {
    return false;
  } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
    return true;
  }

  return validator.isIdentifier(value2);
}

function sameFunctionOrValue(validator, value1, value2) {
  return areSameFunction(validator, value1, value2) ?
    true :
    value1 === value2;
}

function textShadow(validator, value1, value2) {
  if (!understandable(validator, value1, value2, 0, true) && !(validator.isUnit(value2) || validator.isColor(value2) || validator.isGlobal(value2))) {
    return false;
  } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
    return true;
  }

  return validator.isUnit(value2) || validator.isColor(value2) || validator.isGlobal(value2);
}

function time(validator, value1, value2) {
  if (!understandable(validator, value1, value2, 0, true) && !validator.isTime(value2)) {
    return false;
  } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
    return true;
  } else if (validator.isTime(value1) && !validator.isTime(value2)) {
    return false;
  } else if (validator.isTime(value2)) {
    return true;
  } else if (validator.isTime(value1)) {
    return false;
  } else if (validator.isFunction(value1) && !validator.isPrefixed(value1) && validator.isFunction(value2) && !validator.isPrefixed(value2)) {
    return true;
  }

  return sameFunctionOrValue(validator, value1, value2);
}

function timingFunction(validator, value1, value2) {
  if (!understandable(validator, value1, value2, 0, true) && !(validator.isTimingFunction(value2) || validator.isGlobal(value2))) {
    return false;
  } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
    return true;
  }

  return validator.isTimingFunction(value2) || validator.isGlobal(value2);
}

function unit(validator, value1, value2) {
  if (!understandable(validator, value1, value2, 0, true) && !validator.isUnit(value2)) {
    return false;
  } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
    return true;
  } else if (validator.isUnit(value1) && !validator.isUnit(value2)) {
    return false;
  } else if (validator.isUnit(value2)) {
    return true;
  } else if (validator.isUnit(value1)) {
    return false;
  } else if (validator.isFunction(value1) && !validator.isPrefixed(value1) && validator.isFunction(value2) && !validator.isPrefixed(value2)) {
    return true;
  }

  return sameFunctionOrValue(validator, value1, value2);
}

function unitOrKeywordWithGlobal(propertyName) {
  var byKeyword = keywordWithGlobal(propertyName);

  return function(validator, value1, value2) {
    return unit(validator, value1, value2) || byKeyword(validator, value1, value2);
  };
}

function unitOrNumber(validator, value1, value2) {
  if (!understandable(validator, value1, value2, 0, true) && !(validator.isUnit(value2) || validator.isNumber(value2))) {
    return false;
  } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
    return true;
  } else if ((validator.isUnit(value1) || validator.isNumber(value1)) && !(validator.isUnit(value2) || validator.isNumber(value2))) {
    return false;
  } else if (validator.isUnit(value2) || validator.isNumber(value2)) {
    return true;
  } else if (validator.isUnit(value1) || validator.isNumber(value1)) {
    return false;
  } else if (validator.isFunction(value1) && !validator.isPrefixed(value1) && validator.isFunction(value2) && !validator.isPrefixed(value2)) {
    return true;
  }

  return sameFunctionOrValue(validator, value1, value2);
}

function zIndex(validator, value1, value2) {
  if (!understandable(validator, value1, value2, 0, true) && !validator.isZIndex(value2)) {
    return false;
  } else if (validator.isVariable(value1) && validator.isVariable(value2)) {
    return true;
  }

  return validator.isZIndex(value2);
}

module.exports = {
  generic: {
    color: color,
    components: components,
    image: image,
    propertyName: propertyName,
    time: time,
    timingFunction: timingFunction,
    unit: unit,
    unitOrNumber: unitOrNumber
  },
  property: {
    animationDirection: keywordWithGlobal('animation-direction'),
    animationFillMode: keyword('animation-fill-mode'),
    animationIterationCount: animationIterationCount,
    animationName: animationName,
    animationPlayState: keywordWithGlobal('animation-play-state'),
    backgroundAttachment: keyword('background-attachment'),
    backgroundClip: keywordWithGlobal('background-clip'),
    backgroundOrigin: keyword('background-origin'),
    backgroundPosition: backgroundPosition,
    backgroundRepeat: keyword('background-repeat'),
    backgroundSize: backgroundSize,
    bottom: unitOrKeywordWithGlobal('bottom'),
    borderCollapse: keyword('border-collapse'),
    borderStyle: keywordWithGlobal('*-style'),
    clear: keywordWithGlobal('clear'),
    cursor: keywordWithGlobal('cursor'),
    display: keywordWithGlobal('display'),
    float: keywordWithGlobal('float'),
    left: unitOrKeywordWithGlobal('left'),
    fontFamily: fontFamily,
    fontStretch: keywordWithGlobal('font-stretch'),
    fontStyle: keywordWithGlobal('font-style'),
    fontVariant: keywordWithGlobal('font-variant'),
    fontWeight: keywordWithGlobal('font-weight'),
    listStyleType: keywordWithGlobal('list-style-type'),
    listStylePosition: keywordWithGlobal('list-style-position'),
    outlineStyle: keywordWithGlobal('*-style'),
    overflow: keywordWithGlobal('overflow'),
    position: keywordWithGlobal('position'),
    right: unitOrKeywordWithGlobal('right'),
    textAlign: keywordWithGlobal('text-align'),
    textDecoration: keywordWithGlobal('text-decoration'),
    textOverflow: keywordWithGlobal('text-overflow'),
    textShadow: textShadow,
    top: unitOrKeywordWithGlobal('top'),
    transform: sameFunctionOrValue,
    verticalAlign: unitOrKeywordWithGlobal('vertical-align'),
    visibility: keywordWithGlobal('visibility'),
    whiteSpace: keywordWithGlobal('white-space'),
    zIndex: zIndex
  }
};
