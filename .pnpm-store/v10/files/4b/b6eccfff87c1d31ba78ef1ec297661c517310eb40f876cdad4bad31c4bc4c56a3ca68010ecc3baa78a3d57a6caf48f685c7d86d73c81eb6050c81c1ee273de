'use strict';

var encoding = require('lib0/dist/encoding.cjs');
var decoding = require('lib0/dist/decoding.cjs');
var Y = require('yjs');

function _interopNamespaceDefault(e) {
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var encoding__namespace = /*#__PURE__*/_interopNamespaceDefault(encoding);
var decoding__namespace = /*#__PURE__*/_interopNamespaceDefault(decoding);
var Y__namespace = /*#__PURE__*/_interopNamespaceDefault(Y);

/**
 * @module sync-protocol
 */


/**
 * @typedef {Map<number, number>} StateMap
 */

/**
 * Core Yjs defines two message types:
 * • YjsSyncStep1: Includes the State Set of the sending client. When received, the client should reply with YjsSyncStep2.
 * • YjsSyncStep2: Includes all missing structs and the complete delete set. When received, the client is assured that it
 *   received all information from the remote client.
 *
 * In a peer-to-peer network, you may want to introduce a SyncDone message type. Both parties should initiate the connection
 * with SyncStep1. When a client received SyncStep2, it should reply with SyncDone. When the local client received both
 * SyncStep2 and SyncDone, it is assured that it is synced to the remote client.
 *
 * In a client-server model, you want to handle this differently: The client should initiate the connection with SyncStep1.
 * When the server receives SyncStep1, it should reply with SyncStep2 immediately followed by SyncStep1. The client replies
 * with SyncStep2 when it receives SyncStep1. Optionally the server may send a SyncDone after it received SyncStep2, so the
 * client knows that the sync is finished.  There are two reasons for this more elaborated sync model: 1. This protocol can
 * easily be implemented on top of http and websockets. 2. The server should only reply to requests, and not initiate them.
 * Therefore it is necessary that the client initiates the sync.
 *
 * Construction of a message:
 * [messageType : varUint, message definition..]
 *
 * Note: A message does not include information about the room name. This must to be handled by the upper layer protocol!
 *
 * stringify[messageType] stringifies a message definition (messageType is already read from the bufffer)
 */

const messageYjsSyncStep1 = 0;
const messageYjsSyncStep2 = 1;
const messageYjsUpdate = 2;

/**
 * Create a sync step 1 message based on the state of the current shared document.
 *
 * @param {encoding.Encoder} encoder
 * @param {Y.Doc} doc
 */
const writeSyncStep1 = (encoder, doc) => {
  encoding__namespace.writeVarUint(encoder, messageYjsSyncStep1);
  const sv = Y__namespace.encodeStateVector(doc);
  encoding__namespace.writeVarUint8Array(encoder, sv);
};

/**
 * @param {encoding.Encoder} encoder
 * @param {Y.Doc} doc
 * @param {Uint8Array} [encodedStateVector]
 */
const writeSyncStep2 = (encoder, doc, encodedStateVector) => {
  encoding__namespace.writeVarUint(encoder, messageYjsSyncStep2);
  encoding__namespace.writeVarUint8Array(encoder, Y__namespace.encodeStateAsUpdate(doc, encodedStateVector));
};

/**
 * Read SyncStep1 message and reply with SyncStep2.
 *
 * @param {decoding.Decoder} decoder The reply to the received message
 * @param {encoding.Encoder} encoder The received message
 * @param {Y.Doc} doc
 */
const readSyncStep1 = (decoder, encoder, doc) =>
  writeSyncStep2(encoder, doc, decoding__namespace.readVarUint8Array(decoder));

/**
 * Read and apply Structs and then DeleteStore to a y instance.
 *
 * @param {decoding.Decoder} decoder
 * @param {Y.Doc} doc
 * @param {any} transactionOrigin
 * @param {(error:Error)=>any} [errorHandler]
 */
const readSyncStep2 = (decoder, doc, transactionOrigin, errorHandler) => {
  try {
    Y__namespace.applyUpdate(doc, decoding__namespace.readVarUint8Array(decoder), transactionOrigin);
  } catch (error) {
    if (errorHandler != null) errorHandler(/** @type {Error} */ (error));
    // This catches errors that are thrown by event handlers
    console.error('Caught error while handling a Yjs update', error);
  }
};

/**
 * @param {encoding.Encoder} encoder
 * @param {Uint8Array} update
 */
const writeUpdate = (encoder, update) => {
  encoding__namespace.writeVarUint(encoder, messageYjsUpdate);
  encoding__namespace.writeVarUint8Array(encoder, update);
};

/**
 * Read and apply Structs and then DeleteStore to a y instance.
 *
 * @param {decoding.Decoder} decoder
 * @param {Y.Doc} doc
 * @param {any} transactionOrigin
 * @param {(error:Error)=>any} [errorHandler]
 */
const readUpdate = readSyncStep2;

/**
 * @param {decoding.Decoder} decoder A message received from another client
 * @param {encoding.Encoder} encoder The reply message. Does not need to be sent if empty.
 * @param {Y.Doc} doc
 * @param {any} transactionOrigin
 * @param {(error:Error)=>any} [errorHandler] Optional error handler that catches errors when reading Yjs messages.
 */
const readSyncMessage = (decoder, encoder, doc, transactionOrigin, errorHandler) => {
  const messageType = decoding__namespace.readVarUint(decoder);
  switch (messageType) {
    case messageYjsSyncStep1:
      readSyncStep1(decoder, encoder, doc);
      break
    case messageYjsSyncStep2:
      readSyncStep2(decoder, doc, transactionOrigin, errorHandler);
      break
    case messageYjsUpdate:
      readUpdate(decoder, doc, transactionOrigin, errorHandler);
      break
    default:
      throw new Error('Unknown message type')
  }
  return messageType
};

exports.messageYjsSyncStep1 = messageYjsSyncStep1;
exports.messageYjsSyncStep2 = messageYjsSyncStep2;
exports.messageYjsUpdate = messageYjsUpdate;
exports.readSyncMessage = readSyncMessage;
exports.readSyncStep1 = readSyncStep1;
exports.readSyncStep2 = readSyncStep2;
exports.readUpdate = readUpdate;
exports.writeSyncStep1 = writeSyncStep1;
exports.writeSyncStep2 = writeSyncStep2;
exports.writeUpdate = writeUpdate;
//# sourceMappingURL=sync.cjs.map
