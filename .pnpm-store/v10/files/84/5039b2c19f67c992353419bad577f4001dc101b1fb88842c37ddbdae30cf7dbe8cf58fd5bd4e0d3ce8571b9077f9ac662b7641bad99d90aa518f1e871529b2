"use strict";

/**
 * Check whether a declaration is standard
 *
 * @param {Object} decl
 * @returns {boolean}
 */
module.exports = function (decl) {
  const prop = decl.prop;
  const parent = decl.parent;

  // SCSS var (e.g. $var: x), list (e.g. $list: (x)) or map (e.g. $map: (key:value))
  if (prop.startsWith("$")) {
    return true;
  }

  // SCSS var within a namespace (e.g. namespace.$var: x)
  if (prop.includes(".$")) {
    return true;
  }

  // Less var (e.g. @var: x), but exclude variable interpolation (e.g. @{var})
  if (prop[0] === "@" && prop[1] !== "{") {
    return false;
  }

  // Less map declaration
  if (parent && parent.type === "atrule" && parent.raws.afterName === ":") {
    return false;
  }

  // Less map (e.g. #my-map() { myprop: red; })
  if (
    parent &&
    parent.type === "rule" &&
    parent.selector &&
    parent.selector.startsWith("#") &&
    parent.selector.endsWith("()")
  ) {
    return false;
  }

  // Less &:extend
  if ("extend" in decl && decl.extend) {
    return false;
  }

  return true;
};
