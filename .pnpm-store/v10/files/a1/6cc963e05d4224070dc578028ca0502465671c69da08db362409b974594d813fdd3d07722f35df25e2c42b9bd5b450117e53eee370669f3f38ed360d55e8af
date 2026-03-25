'use strict';

const icon_name = require('../icon/name.cjs');
const icon_defaults = require('../icon/defaults.cjs');
const iconSet_tree = require('./tree.cjs');

const matchChar = /^[a-f0-9]+(-[a-f0-9]+)*$/;
function validateIconProps(item, fix, checkOtherProps) {
  for (const key in item) {
    const attr = key;
    const value = item[attr];
    const type = typeof value;
    if (type === "undefined") {
      delete item[attr];
      continue;
    }
    const expectedType = typeof icon_defaults.defaultExtendedIconProps[attr];
    if (expectedType !== "undefined") {
      if (type !== expectedType) {
        if (fix) {
          delete item[attr];
          continue;
        }
        return attr;
      }
      continue;
    }
    if (checkOtherProps && type === "object") {
      if (fix) {
        delete item[attr];
      } else {
        return key;
      }
    }
  }
  return null;
}
function validateIconSet(obj, options) {
  const fix = !!(options && options.fix);
  if (typeof obj !== "object" || obj === null || typeof obj.icons !== "object" || !obj.icons) {
    throw new Error("Bad icon set");
  }
  const data = obj;
  if (options && typeof options.prefix === "string") {
    data.prefix = options.prefix;
  } else if (typeof data.prefix !== "string" || !data.prefix.match(icon_name.matchIconName)) {
    throw new Error("Invalid prefix");
  }
  if (options && typeof options.provider === "string") {
    data.provider = options.provider;
  } else if (data.provider !== void 0) {
    const value = data.provider;
    if (typeof value !== "string" || value !== "" && !value.match(icon_name.matchIconName)) {
      if (fix) {
        delete data.provider;
      } else {
        throw new Error("Invalid provider");
      }
    }
  }
  if (data.aliases !== void 0) {
    if (typeof data.aliases !== "object" || data.aliases === null) {
      if (fix) {
        delete data.aliases;
      } else {
        throw new Error("Invalid aliases list");
      }
    }
  }
  const tree = iconSet_tree.getIconsTree(data);
  const icons = data.icons;
  const aliases = data.aliases || /* @__PURE__ */ Object.create(null);
  for (const name in tree) {
    const treeItem = tree[name];
    const isAlias = !icons[name];
    const parentObj = isAlias ? aliases : icons;
    if (!treeItem) {
      if (fix) {
        delete parentObj[name];
        continue;
      }
      throw new Error(`Invalid alias: ${name}`);
    }
    if (!name.match(icon_name.matchIconName)) {
      if (fix) {
        delete parentObj[name];
        continue;
      }
      throw new Error(`Invalid icon name: "${name}"`);
    }
    const item = parentObj[name];
    if (!isAlias) {
      if (typeof item.body !== "string") {
        if (fix) {
          delete parentObj[name];
          continue;
        }
        throw new Error(`Invalid icon: "${name}"`);
      }
    }
    const requiredProp = isAlias ? "parent" : "body";
    const key = typeof item[requiredProp] !== "string" ? requiredProp : validateIconProps(item, fix, true);
    if (key !== null) {
      throw new Error(`Invalid property "${key}" in "${name}"`);
    }
  }
  if (data.not_found !== void 0 && !(data.not_found instanceof Array)) {
    if (fix) {
      delete data.not_found;
    } else {
      throw new Error("Invalid not_found list");
    }
  }
  if (!Object.keys(data.icons).length && !(data.not_found && data.not_found.length)) {
    throw new Error("Icon set is empty");
  }
  if (fix && !Object.keys(aliases).length) {
    delete data.aliases;
  }
  const failedOptionalProp = validateIconProps(data, false, false);
  if (failedOptionalProp) {
    throw new Error(`Invalid value type for "${failedOptionalProp}"`);
  }
  if (data.chars !== void 0) {
    if (typeof data.chars !== "object" || data.chars === null) {
      if (fix) {
        delete data.chars;
      } else {
        throw new Error("Invalid characters map");
      }
    }
  }
  if (typeof data.chars === "object") {
    const chars = data.chars;
    Object.keys(chars).forEach((char) => {
      if (!matchChar.exec(char) || typeof chars[char] !== "string") {
        if (fix) {
          delete chars[char];
          return;
        }
        throw new Error(`Invalid character "${char}"`);
      }
      const target = chars[char];
      if (!data.icons[target] && (!data.aliases || !data.aliases[target])) {
        if (fix) {
          delete chars[char];
          return;
        }
        throw new Error(
          `Character "${char}" points to missing icon "${target}"`
        );
      }
    });
    if (fix && !Object.keys(data.chars).length) {
      delete data.chars;
    }
  }
  return data;
}

exports.matchChar = matchChar;
exports.validateIconSet = validateIconSet;
