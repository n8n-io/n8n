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
export const messageYjsSyncStep1: 0;
export const messageYjsSyncStep2: 1;
export const messageYjsUpdate: 2;
export function writeSyncStep1(encoder: encoding.Encoder, doc: Y.Doc): void;
export function writeSyncStep2(encoder: encoding.Encoder, doc: Y.Doc, encodedStateVector?: Uint8Array | undefined): void;
export function readSyncStep1(decoder: decoding.Decoder, encoder: encoding.Encoder, doc: Y.Doc): void;
export function readSyncStep2(decoder: decoding.Decoder, doc: Y.Doc, transactionOrigin: any, errorHandler?: ((error: Error) => any) | undefined): void;
export function writeUpdate(encoder: encoding.Encoder, update: Uint8Array): void;
export function readUpdate(decoder: decoding.Decoder, doc: Y.Doc, transactionOrigin: any, errorHandler?: ((error: Error) => any) | undefined): void;
export function readSyncMessage(decoder: decoding.Decoder, encoder: encoding.Encoder, doc: Y.Doc, transactionOrigin: any, errorHandler?: ((error: Error) => any) | undefined): 0 | 2 | 1;
export type StateMap = Map<number, number>;
import * as encoding from 'lib0/encoding';
import * as Y from 'yjs';
import * as decoding from 'lib0/decoding';
//# sourceMappingURL=sync.d.ts.map