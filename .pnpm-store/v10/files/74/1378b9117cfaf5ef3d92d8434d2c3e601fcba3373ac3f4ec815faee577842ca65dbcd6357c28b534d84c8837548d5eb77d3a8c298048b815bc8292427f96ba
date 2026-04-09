import { isUnsetKeyword } from '../svg/build.mjs';
import { calculateSize } from '../svg/size.mjs';
import '../icon/defaults.mjs';
import '../customisations/defaults.mjs';
import '../svg/defs.mjs';

const svgWidthRegex = /\swidth\s*=\s*["']([\w.]+)["']/;
const svgHeightRegex = /\sheight\s*=\s*["']([\w.]+)["']/;
const svgTagRegex = /<svg\s+/;
function configureSvgSize(svg, props, scale) {
  const svgNode = svg.slice(0, svg.indexOf(">"));
  const check = (prop, regex) => {
    const result = regex.exec(svgNode);
    const isSet = result != null;
    const propValue = props[prop];
    if (!propValue && !isUnsetKeyword(propValue)) {
      if (typeof scale === "number") {
        if (scale > 0) {
          props[prop] = calculateSize(
            // Base on result from iconToSVG() or 1em
            result?.[1] ?? "1em",
            scale
          );
        }
      } else if (result) {
        props[prop] = result[1];
      }
    }
    return isSet;
  };
  return [check("width", svgWidthRegex), check("height", svgHeightRegex)];
}
async function mergeIconProps(svg, collection, icon, options, propsProvider, afterCustomizations) {
  const { scale, addXmlNs = false } = options ?? {};
  const { additionalProps = {}, iconCustomizer } = options?.customizations ?? {};
  const props = await propsProvider?.() ?? {};
  await iconCustomizer?.(collection, icon, props);
  Object.keys(additionalProps).forEach((p) => {
    const v = additionalProps[p];
    if (v !== void 0 && v !== null)
      props[p] = v;
  });
  afterCustomizations?.(props);
  const [widthOnSvg, heightOnSvg] = configureSvgSize(svg, props, scale);
  if (addXmlNs) {
    if (!svg.includes("xmlns=") && !props["xmlns"]) {
      props["xmlns"] = "http://www.w3.org/2000/svg";
    }
    if (!svg.includes("xmlns:xlink=") && svg.includes("xlink:") && !props["xmlns:xlink"]) {
      props["xmlns:xlink"] = "http://www.w3.org/1999/xlink";
    }
  }
  const propsToAdd = Object.keys(props).map(
    (p) => p === "width" && widthOnSvg || p === "height" && heightOnSvg ? null : `${p}="${props[p]}"`
  ).filter((p) => p != null);
  if (propsToAdd.length) {
    svg = svg.replace(svgTagRegex, `<svg ${propsToAdd.join(" ")} `);
  }
  if (options) {
    const { defaultStyle, defaultClass } = options;
    if (defaultClass && !svg.includes("class=")) {
      svg = svg.replace(svgTagRegex, `<svg class="${defaultClass}" `);
    }
    if (defaultStyle && !svg.includes("style=")) {
      svg = svg.replace(svgTagRegex, `<svg style="${defaultStyle}" `);
    }
  }
  const usedProps = options?.usedProps;
  if (usedProps) {
    Object.keys(additionalProps).forEach((p) => {
      const v = props[p];
      if (v !== void 0 && v !== null)
        usedProps[p] = v;
    });
    if (typeof props.width !== "undefined" && props.width !== null) {
      usedProps.width = props.width;
    }
    if (typeof props.height !== "undefined" && props.height !== null) {
      usedProps.height = props.height;
    }
  }
  return svg;
}
function getPossibleIconNames(icon) {
  return [
    icon,
    icon.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
    icon.replace(/([a-z])(\d+)/g, "$1-$2")
  ];
}

export { getPossibleIconNames, mergeIconProps };
