import FDBCursor from "./FDBCursor.js";
class FDBCursorWithValue extends FDBCursor {
  value = undefined;
  constructor(source, range, direction, request) {
    super(source, range, direction, request);
  }
  get [Symbol.toStringTag]() {
    return "IDBCursorWithValue";
  }
}
export default FDBCursorWithValue;