import {lab as colorLab} from "d3-color";
import color from "./color.js";

export default function lab(start, end) {
  var l = color((start = colorLab(start)).l, (end = colorLab(end)).l),
      a = color(start.a, end.a),
      b = color(start.b, end.b),
      opacity = color(start.opacity, end.opacity);
  return function(t) {
    start.l = l(t);
    start.a = a(t);
    start.b = b(t);
    start.opacity = opacity(t);
    return start + "";
  };
}
