"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = forceCloseDatabase;
var _closeConnection = _interopRequireDefault(require("./lib/closeConnection.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Forcibly closes a database. This simulates a database being closed due to abnormal reasons, such as
 * using DevTools to clear data while a database is open. Spec-wise, this is equivalent to
 * [closing a database connection](https://www.w3.org/TR/IndexedDB/#closing-connection) with the `forced flag`
 * set to true.
 *
 * Use this API if you want to have more test coverage for unusual IndexedDB events, such as a database firing
 * the "close" event:
 *
 * ```js
 * db.addEventListener("close", () => {
 *   console.log("Forcibly closed!");
 * });
 * forceCloseDatabase(db); // invokes the event listener
 * ```
 * @param db
 */
function forceCloseDatabase(db) {
  (0, _closeConnection.default)(db, true);
}
module.exports = exports.default;