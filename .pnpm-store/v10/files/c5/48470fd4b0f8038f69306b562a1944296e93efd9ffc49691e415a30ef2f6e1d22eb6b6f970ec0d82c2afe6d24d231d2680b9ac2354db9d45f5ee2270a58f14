function _instanceof(left, right) {
    "@swc/helpers - instanceof";

    if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) {
        return !!right[Symbol.hasInstance](left);
    } else return left instanceof right;
}
export { _instanceof as _ };
