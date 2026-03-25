import {color} from "d3-color";
import {interpolateNumber, interpolateRgb, interpolateString} from "d3-interpolate";

export default function(a, b) {
  var c;
  return (typeof b === "number" ? interpolateNumber
      : b instanceof color ? interpolateRgb
      : (c = color(b)) ? (b = c, interpolateRgb)
      : interpolateString)(a, b);
}
