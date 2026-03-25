import {hsl as colorHsl} from "d3-color";
import color, {hue} from "./color.js";

function hsl(hue) {
  return function(start, end) {
    var h = hue((start = colorHsl(start)).h, (end = colorHsl(end)).h),
        s = color(start.s, end.s),
        l = color(start.l, end.l),
        opacity = color(start.opacity, end.opacity);
    return function(t) {
      start.h = h(t);
      start.s = s(t);
      start.l = l(t);
      start.opacity = opacity(t);
      return start + "";
    };
  }
}

export default hsl(hue);
export var hslLong = hsl(color);
