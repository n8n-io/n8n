// TODO: it'd be great to merge it with the other canReorder functionality

var rulesOverlap = require('./rules-overlap');
var specificitiesOverlap = require('./specificities-overlap');

var FLEX_PROPERTIES = /align\-items|box\-align|box\-pack|flex|justify/;
var BORDER_PROPERTIES = /^border\-(top|right|bottom|left|color|style|width|radius)/;

function canReorder(left, right, cache) {
  for (var i = right.length - 1; i >= 0; i--) {
    for (var j = left.length - 1; j >= 0; j--) {
      if (!canReorderSingle(left[j], right[i], cache))
        return false;
    }
  }

  return true;
}

function canReorderSingle(left, right, cache) {
  var leftName = left[0];
  var leftValue = left[1];
  var leftNameRoot = left[2];
  var leftSelector = left[5];
  var leftInSpecificSelector = left[6];
  var rightName = right[0];
  var rightValue = right[1];
  var rightNameRoot = right[2];
  var rightSelector = right[5];
  var rightInSpecificSelector = right[6];

  if (leftName == 'font' && rightName == 'line-height' || rightName == 'font' && leftName == 'line-height')
    return false;
  if (FLEX_PROPERTIES.test(leftName) && FLEX_PROPERTIES.test(rightName))
    return false;
  if (leftNameRoot == rightNameRoot && unprefixed(leftName) == unprefixed(rightName) && (vendorPrefixed(leftName) ^ vendorPrefixed(rightName)))
    return false;
  if (leftNameRoot == 'border' && BORDER_PROPERTIES.test(rightNameRoot) && (leftName == 'border' || leftName == rightNameRoot || (leftValue != rightValue && sameBorderComponent(leftName, rightName))))
    return false;
  if (rightNameRoot == 'border' && BORDER_PROPERTIES.test(leftNameRoot) && (rightName == 'border' || rightName == leftNameRoot || (leftValue != rightValue && sameBorderComponent(leftName, rightName))))
    return false;
  if (leftNameRoot == 'border' && rightNameRoot == 'border' && leftName != rightName && (isSideBorder(leftName) && isStyleBorder(rightName) || isStyleBorder(leftName) && isSideBorder(rightName)))
    return false;
  if (leftNameRoot != rightNameRoot)
    return true;
  if (leftName == rightName && leftNameRoot == rightNameRoot && (leftValue == rightValue || withDifferentVendorPrefix(leftValue, rightValue)))
    return true;
  if (leftName != rightName && leftNameRoot == rightNameRoot && leftName != leftNameRoot && rightName != rightNameRoot)
    return true;
  if (leftName != rightName && leftNameRoot == rightNameRoot && leftValue == rightValue)
    return true;
  if (rightInSpecificSelector && leftInSpecificSelector && !inheritable(leftNameRoot) && !inheritable(rightNameRoot) && !rulesOverlap(rightSelector, leftSelector, false))
    return true;
  if (!specificitiesOverlap(leftSelector, rightSelector, cache))
    return true;

  return false;
}

function vendorPrefixed(name) {
  return /^\-(?:moz|webkit|ms|o)\-/.test(name);
}

function unprefixed(name) {
  return name.replace(/^\-(?:moz|webkit|ms|o)\-/, '');
}

function sameBorderComponent(name1, name2) {
  return name1.split('-').pop() == name2.split('-').pop();
}

function isSideBorder(name) {
  return name == 'border-top' || name == 'border-right' || name == 'border-bottom' || name == 'border-left';
}

function isStyleBorder(name) {
  return name == 'border-color' || name == 'border-style' || name == 'border-width';
}

function withDifferentVendorPrefix(value1, value2) {
  return vendorPrefixed(value1) && vendorPrefixed(value2) && value1.split('-')[1] != value2.split('-')[2];
}

function inheritable(name) {
  // According to http://www.w3.org/TR/CSS21/propidx.html
  // Others will be catched by other, preceeding rules
  return name == 'font' || name == 'line-height' || name == 'list-style';
}

module.exports = {
  canReorder: canReorder,
  canReorderSingle: canReorderSingle
};
