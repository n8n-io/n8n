'use strict';

const svg_url = require('./url.cjs');

function encodeSvgForCss(svg) {
  let useSvg = svg.startsWith("<svg>") ? svg.replace("<svg>", "<svg >") : svg;
  if (!useSvg.includes(" xmlns:xlink=") && useSvg.includes(" xlink:")) {
    useSvg = useSvg.replace(
      "<svg ",
      '<svg xmlns:xlink="http://www.w3.org/1999/xlink" '
    );
  }
  if (!useSvg.includes(" xmlns=")) {
    useSvg = useSvg.replace(
      "<svg ",
      '<svg xmlns="http://www.w3.org/2000/svg" '
    );
  }
  return svg_url.encodeSVGforURL(useSvg);
}

exports.encodeSvgForCss = encodeSvgForCss;
