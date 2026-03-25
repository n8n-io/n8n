import {tpmt} from "./math.js";

export function expIn(t) {
  return tpmt(1 - +t);
}

export function expOut(t) {
  return 1 - tpmt(t);
}

export function expInOut(t) {
  return ((t *= 2) <= 1 ? tpmt(1 - t) : 2 - tpmt(t - 1)) / 2;
}
