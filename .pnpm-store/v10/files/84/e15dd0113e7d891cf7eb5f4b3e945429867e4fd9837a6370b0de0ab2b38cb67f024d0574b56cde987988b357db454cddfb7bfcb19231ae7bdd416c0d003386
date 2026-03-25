import {hcl as colorHcl} from "d3-color";
import color, {hue} from "./color.js";

function hcl(hue) {
  return function(start, end) {
    var h = hue((start = colorHcl(start)).h, (end = colorHcl(end)).h),
        c = color(start.c, end.c),
        l = color(start.l, end.l),
        opacity = color(start.opacity, end.opacity);
    return function(t) {
      start.h = h(t);
      start.c = c(t);
      start.l = l(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }
}

export default hcl(hue);
export var hclLong = hcl(color);
