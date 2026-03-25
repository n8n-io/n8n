import {set} from "./schedule.js";

function easeVarying(id, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (typeof v !== "function") throw new Error;
    set(this, id).ease = v;
  };
}

export default function(value) {
  if (typeof value !== "function") throw new Error;
  return this.each(easeVarying(this._id, value));
}
