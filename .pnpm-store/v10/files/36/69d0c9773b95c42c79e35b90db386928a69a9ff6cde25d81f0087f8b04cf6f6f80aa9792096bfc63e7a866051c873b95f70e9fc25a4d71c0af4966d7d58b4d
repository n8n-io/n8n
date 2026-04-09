"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _FakeEvent = _interopRequireDefault(require("./FakeEvent.js"));
var _scheduling = require("./scheduling.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#database-closing-steps
const closeConnection = (connection, forced = false) => {
  connection._closePending = true;
  const transactionsComplete = connection._rawDatabase.transactions.every(transaction => {
    return transaction._state === "finished";
  });
  if (transactionsComplete) {
    connection._closed = true;
    connection._rawDatabase.connections = connection._rawDatabase.connections.filter(otherConnection => {
      return connection !== otherConnection;
    });
    if (forced) {
      const event = new _FakeEvent.default("close", {
        bubbles: false,
        cancelable: false
      });
      event.eventPath = [];
      connection.dispatchEvent(event);
    }
  } else {
    (0, _scheduling.queueTask)(() => {
      closeConnection(connection, forced);
    });
  }
};
var _default = exports.default = closeConnection;
module.exports = exports.default;