import array from "./array.js";
import {Selection, root} from "./selection/index.js";

export default function(selector) {
  return typeof selector === "string"
      ? new Selection([document.querySelectorAll(selector)], [document.documentElement])
      : new Selection([array(selector)], root);
}
