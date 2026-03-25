'use strict';

const colors_keywords = require('./keywords.cjs');

function rgb2hsl(rgb) {
  const c1 = rgb.r / 255, c2 = rgb.g / 255, c3 = rgb.b / 255, kmin = Math.min(c1, Math.min(c2, c3)), kmax = Math.max(c1, Math.max(c2, c3)), l = (kmax + kmin) / 2;
  let s, h, delta;
  if (kmax === kmin) {
    s = h = 0;
  } else {
    if (l < 0.5) {
      s = (kmax - kmin) / (kmax + kmin);
    } else {
      s = (kmax - kmin) / (2 - kmax - kmin);
    }
    delta = kmax - kmin;
    if (kmax === c1) {
      h = (c2 - c3) / delta;
    } else if (kmax === c2) {
      h = 2 + (c3 - c1) / delta;
    } else {
      h = 4 + (c1 - c2) / delta;
    }
    h = h * 60;
    if (h < 0) {
      h += 360;
    }
  }
  return {
    type: "hsl",
    h,
    s: s * 100,
    l: l * 100,
    alpha: rgb.alpha
  };
}
function fromFunction(value) {
  if (value.slice(-1) !== ")") {
    return null;
  }
  const parts = value.slice(0, value.length - 1).split("(");
  if (parts.length !== 2) {
    return null;
  }
  const func = parts[0].trim();
  const content = parts[1].trim();
  let values;
  let alphaStr;
  switch (func) {
    case "lch":
    case "lab": {
      const parts2 = content.split("/");
      switch (parts2.length) {
        case 2:
          alphaStr = parts2[1].trim();
          break;
        case 1:
          break;
        default:
          return null;
      }
      values = parts2[0].trim().split(/[\s,]+/);
      break;
    }
    case "rgb":
    case "rgba":
    case "hsl":
    case "hsla": {
      values = content.trim().split(/[\s,]+/);
      if (values.length === 4) {
        alphaStr = values.pop().trim();
      }
      break;
    }
    default: {
      return {
        type: "function",
        func,
        value: content
      };
    }
  }
  let alpha = 1;
  if (typeof alphaStr === "string") {
    alpha = parseFloat(alphaStr);
    const index = alphaStr.indexOf("%");
    const hasPercentage = index !== -1;
    if (isNaN(alpha) || hasPercentage && index !== alphaStr.length - 1) {
      return null;
    }
    if (hasPercentage) {
      alpha /= 100;
    }
  }
  if (alpha < 0 || alpha > 1 || values.length !== 3) {
    return null;
  }
  if (alpha === 0) {
    return {
      type: "transparent"
    };
  }
  const isPercentage = [];
  const numbers = [];
  for (let i = 0; i < 3; i++) {
    const colorStr = values[i];
    const index = colorStr.indexOf("%");
    const hasPercentage = index !== -1;
    if (hasPercentage && index !== colorStr.length - 1) {
      return null;
    }
    const colorNum = parseFloat(colorStr);
    if (isNaN(colorNum)) {
      return null;
    }
    isPercentage.push(hasPercentage);
    numbers.push(colorNum);
  }
  switch (func) {
    case "rgb":
    case "rgba": {
      const hasPercengage = isPercentage[0];
      if (hasPercengage !== isPercentage[1] || hasPercengage !== isPercentage[2]) {
        return null;
      }
      let r = numbers[0];
      let g = numbers[1];
      let b = numbers[2];
      if (hasPercengage) {
        r = r * 255 / 100;
        g = g * 255 / 100;
        b = b * 255 / 100;
      }
      return {
        type: "rgb",
        r,
        g,
        b,
        alpha
      };
    }
    case "hsl":
    case "hsla": {
      if (isPercentage[0] || !isPercentage[1] || !isPercentage[2]) {
        return null;
      }
      return {
        type: "hsl",
        h: numbers[0],
        s: numbers[1],
        l: numbers[2],
        alpha
      };
    }
    case "lab":
    case "lch": {
      if (!isPercentage[0] || isPercentage[1] || isPercentage[2]) {
        return null;
      }
      return func === "lab" ? {
        type: "lab",
        l: numbers[0],
        a: numbers[1],
        b: numbers[2],
        alpha
      } : {
        type: "lch",
        l: numbers[0],
        c: numbers[1],
        h: numbers[2],
        alpha
      };
    }
  }
  return null;
}
function fromHex(value) {
  if (value.slice(0, 1) === "#") {
    value = value.slice(1);
  }
  if (!/^[\da-f]+$/i.test(value)) {
    return null;
  }
  let alpha = 1;
  const hex = ["", "", ""];
  switch (value.length) {
    case 4: {
      alpha = parseInt(value[3] + value[3], 16) / 255;
    }
    case 3: {
      hex[0] = value[0] + value[0];
      hex[1] = value[1] + value[1];
      hex[2] = value[2] + value[2];
      break;
    }
    case 8: {
      alpha = parseInt(value[6] + value[7], 16) / 255;
    }
    case 6: {
      hex[0] = value[0] + value[1];
      hex[1] = value[2] + value[3];
      hex[2] = value[4] + value[5];
      break;
    }
    default:
      return null;
  }
  return alpha === 0 ? {
    type: "transparent"
  } : {
    type: "rgb",
    r: parseInt(hex[0], 16),
    g: parseInt(hex[1], 16),
    b: parseInt(hex[2], 16),
    alpha
  };
}
function stringToColor(value) {
  value = value.toLowerCase().trim();
  if (colors_keywords.colorKeywords[value]) {
    return { ...colors_keywords.colorKeywords[value] };
  }
  if (value.indexOf("(") !== -1) {
    return fromFunction(value);
  }
  return fromHex(value);
}
function compareColors(color1, color2) {
  if (color1.type === color2.type) {
    let testKeys = new Set(Object.keys(color1));
    switch (color1.type) {
      case "hsl": {
        if (color1.s === 0) {
          testKeys.delete("h");
        }
        if (color1.l === 0 || color1.l === 100) {
          testKeys.delete("h");
          testKeys.delete("s");
        }
      }
      case "rgb":
        if (color1.alpha === 0) {
          testKeys = /* @__PURE__ */ new Set(["a"]);
        }
    }
    const keys = Array.from(testKeys);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (color1[key] !== color2[key]) {
        return false;
      }
    }
    return true;
  }
  const list = [color1, color2].sort((a, b) => a.type.localeCompare(b.type));
  const item1 = list[0];
  const item2 = list[1];
  switch (item1.type) {
    case "hsl": {
      switch (item2.type) {
        case "rgb": {
          return compareColors(item1, rgb2hsl(item2));
        }
        case "transparent":
          return item1.alpha === 0;
      }
      return false;
    }
    case "rgb": {
      switch (item2.type) {
        case "transparent":
          return item1.alpha === 0;
      }
    }
  }
  return false;
}
function colorToHexString(color, canCompact = true) {
  if (color.alpha !== 1) {
    return null;
  }
  let result = "";
  const attrs = ["r", "g", "b"];
  for (let i = 0; i < attrs.length; i++) {
    const value = color[attrs[i]];
    if (Math.round(value) !== value) {
      return null;
    }
    const hex = value.toString(16);
    result += (value < 16 ? "0" : "") + hex;
  }
  if (result.length !== 6) {
    return null;
  }
  if (canCompact && result[0] === result[1] && result[2] === result[3] && result[4] === result[5]) {
    result = result[0] + result[2] + result[4];
  }
  return "#" + result;
}
function colorToString(color) {
  if (color.alpha === 0) {
    return "transparent";
  }
  switch (color.type) {
    case "none":
    case "transparent":
      return color.type;
    case "current":
      return "currentColor";
    case "rgb": {
      const hex = colorToHexString(color);
      if (hex !== null) {
        return hex;
      }
      const list = [color.r, color.g, color.b];
      if (color.alpha !== 1) {
        list.push(color.alpha);
      }
      return "rgb" + (list.length === 4 ? "a(" : "(") + list.join(", ") + ")";
    }
    case "hsl": {
      const list = [
        color.h,
        color.s.toString() + "%",
        color.l.toString() + "%"
      ];
      if (color.alpha !== 1) {
        list.push(color.alpha);
      }
      return "hsl" + (list.length === 4 ? "a(" : "(") + list.join(", ") + ")";
    }
    case "lab": {
      const list = [color.l.toString() + "%", color.a, color.b];
      if (color.alpha !== 1) {
        list.push("/ " + color.alpha.toString());
      }
      return "lab(" + list.join(" ") + ")";
    }
    case "lch": {
      const list = [color.l.toString() + "%", color.c, color.h];
      if (color.alpha !== 1) {
        list.push("/ " + color.alpha.toString());
      }
      return "lch(" + list.join(" ") + ")";
    }
    case "function": {
      return color.func + "(" + color.value + ")";
    }
  }
}

exports.colorToHexString = colorToHexString;
exports.colorToString = colorToString;
exports.compareColors = compareColors;
exports.stringToColor = stringToColor;
