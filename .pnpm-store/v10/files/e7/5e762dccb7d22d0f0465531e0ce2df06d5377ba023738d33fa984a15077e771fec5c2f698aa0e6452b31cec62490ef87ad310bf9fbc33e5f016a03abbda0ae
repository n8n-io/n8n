'use strict';

const icon_name = require('../icon/name.cjs');
const icon_defaults = require('../icon/defaults.cjs');

const optionalPropertyDefaults = {
  provider: "",
  aliases: {},
  not_found: {},
  ...icon_defaults.defaultIconDimensions
};
function checkOptionalProps(item, defaults) {
  for (const prop in defaults) {
    if (prop in item && typeof item[prop] !== typeof defaults[prop]) {
      return false;
    }
  }
  return true;
}
function quicklyValidateIconSet(obj) {
  if (typeof obj !== "object" || obj === null) {
    return null;
  }
  const data = obj;
  if (typeof data.prefix !== "string" || !obj.icons || typeof obj.icons !== "object") {
    return null;
  }
  if (!checkOptionalProps(obj, optionalPropertyDefaults)) {
    return null;
  }
  const icons = data.icons;
  for (const name in icons) {
    const icon = icons[name];
    if (!name.match(icon_name.matchIconName) || typeof icon.body !== "string" || !checkOptionalProps(
      icon,
      icon_defaults.defaultExtendedIconProps
    )) {
      return null;
    }
  }
  const aliases = data.aliases || /* @__PURE__ */ Object.create(null);
  for (const name in aliases) {
    const icon = aliases[name];
    const parent = icon.parent;
    if (!name.match(icon_name.matchIconName) || typeof parent !== "string" || !icons[parent] && !aliases[parent] || !checkOptionalProps(
      icon,
      icon_defaults.defaultExtendedIconProps
    )) {
      return null;
    }
  }
  return data;
}

exports.quicklyValidateIconSet = quicklyValidateIconSet;
