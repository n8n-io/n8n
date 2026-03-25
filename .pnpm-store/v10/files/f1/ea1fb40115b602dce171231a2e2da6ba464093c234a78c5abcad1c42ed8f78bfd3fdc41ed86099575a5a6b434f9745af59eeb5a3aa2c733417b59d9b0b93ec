'use strict';

const svg_html = require('../svg/html.cjs');
const svg_size = require('../svg/size.cjs');
const svg_url = require('../svg/url.cjs');
const icon_square = require('../icon/square.cjs');

function getCommonCSSRules(options) {
  const result = {
    display: "inline-block",
    width: "1em",
    height: "1em"
  };
  const varName = options.varName;
  if (options.pseudoSelector) {
    result["content"] = "''";
  }
  switch (options.mode) {
    case "background":
      if (varName) {
        result["background-image"] = "var(--" + varName + ")";
      }
      result["background-repeat"] = "no-repeat";
      result["background-size"] = "100% 100%";
      break;
    case "mask":
      result["background-color"] = "currentColor";
      if (varName) {
        result["mask-image"] = result["-webkit-mask-image"] = "var(--" + varName + ")";
      }
      result["mask-repeat"] = result["-webkit-mask-repeat"] = "no-repeat";
      result["mask-size"] = result["-webkit-mask-size"] = "100% 100%";
      break;
  }
  return result;
}
function generateItemCSSRules(icon, options) {
  const result = {};
  const varName = options.varName;
  if (icon.width !== icon.height) {
    if (options.forceSquare) {
      icon = icon_square.makeIconSquare(icon);
    } else {
      result["width"] = svg_size.calculateSize("1em", icon.width / icon.height);
    }
  }
  const svg = svg_html.iconToHTML(
    icon.body.replace(/currentColor/g, options.color || "black"),
    {
      viewBox: `${icon.left} ${icon.top} ${icon.width} ${icon.height}`,
      width: icon.width.toString(),
      height: icon.height.toString()
    }
  );
  const url = svg_url.svgToURL(svg);
  if (varName) {
    result["--" + varName] = url;
  } else {
    switch (options.mode) {
      case "background":
        result["background-image"] = url;
        break;
      case "mask":
        result["mask-image"] = result["-webkit-mask-image"] = url;
        break;
    }
  }
  return result;
}
function generateItemContent(icon, options) {
  const height = options.height;
  const width = options.width ?? svg_size.calculateSize(height, icon.width / icon.height);
  const svg = svg_html.iconToHTML(
    icon.body.replace(/currentColor/g, options.color || "black"),
    {
      viewBox: `${icon.left} ${icon.top} ${icon.width} ${icon.height}`,
      width: width.toString(),
      height: height.toString()
    }
  );
  return svg_url.svgToURL(svg);
}

exports.generateItemCSSRules = generateItemCSSRules;
exports.generateItemContent = generateItemContent;
exports.getCommonCSSRules = getCommonCSSRules;
