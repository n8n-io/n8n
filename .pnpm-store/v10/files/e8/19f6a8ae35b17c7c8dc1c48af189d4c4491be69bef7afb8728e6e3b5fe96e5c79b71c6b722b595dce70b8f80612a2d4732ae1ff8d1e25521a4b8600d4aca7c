import closeConnection from "./lib/closeConnection.js";
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
export default function forceCloseDatabase(db) {
  closeConnection(db, true);
}