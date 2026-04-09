'use strict';

const svg_html = require('../svg/html.cjs');
const svg_size = require('../svg/size.cjs');
const svg_url = require('../svg/url.cjs');
const icon_square = require('../icon/square.cjs');
const svg_build = require('../svg/build.cjs');
require('../icon/defaults.cjs');
require('../customisations/defaults.cjs');
require('../svg/defs.cjs');

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
  const buildResult = svg_build.iconToSVG(icon);
  let viewBox = buildResult.viewBox;
  if (viewBox[2] !== viewBox[3]) {
    if (options.forceSquare) {
      viewBox = icon_square.makeViewBoxSquare(viewBox);
    } else {
      result["width"] = svg_size.calculateSize("1em", viewBox[2] / viewBox[3]);
    }
  }
  const svg = svg_html.iconToHTML(
    buildResult.body.replace(/currentColor/g, options.color || "black"),
    {
      viewBox: `${viewBox[0]} ${viewBox[1]} ${viewBox[2]} ${viewBox[3]}`,
      width: `${viewBox[2]}`,
      height: `${viewBox[3]}`
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
  const buildResult = svg_build.iconToSVG(icon);
  const viewBox = buildResult.viewBox;
  const height = options.height;
  const width = options.width ?? svg_size.calculateSize(height, viewBox[2] / viewBox[3]);
  const svg = svg_html.iconToHTML(
    buildResult.body.replace(/currentColor/g, options.color || "black"),
    {
      viewBox: `${viewBox[0]} ${viewBox[1]} ${viewBox[2]} ${viewBox[3]}`,
      width: width.toString(),
      height: height.toString()
    }
  );
  return svg_url.svgToURL(svg);
}

exports.generateItemCSSRules = generateItemCSSRules;
exports.generateItemContent = generateItemContent;
exports.getCommonCSSRules = getCommonCSSRules;
