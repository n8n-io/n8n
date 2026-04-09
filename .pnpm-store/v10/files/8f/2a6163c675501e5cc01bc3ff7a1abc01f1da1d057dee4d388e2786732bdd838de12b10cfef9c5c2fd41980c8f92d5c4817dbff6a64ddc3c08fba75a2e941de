import FakeEvent from "./FakeEvent.js";
import { queueTask } from "./scheduling.js";
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
      const event = new FakeEvent("close", {
        bubbles: false,
        cancelable: false
      });
      event.eventPath = [];
      connection.dispatchEvent(event);
    }
  } else {
    queueTask(() => {
      closeConnection(connection, forced);
    });
  }
};
export default closeConnection;