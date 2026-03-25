/** eslint-env browser */

export {
  Doc,
  Transaction,
  YArray as Array,
  YMap as Map,
  YText as Text,
  YXmlText as XmlText,
  YXmlHook as XmlHook,
  YXmlElement as XmlElement,
  YXmlFragment as XmlFragment,
  YXmlEvent,
  YMapEvent,
  YArrayEvent,
  YTextEvent,
  YEvent,
  Item,
  AbstractStruct,
  GC,
  Skip,
  ContentBinary,
  ContentDeleted,
  ContentDoc,
  ContentEmbed,
  ContentFormat,
  ContentJSON,
  ContentAny,
  ContentString,
  ContentType,
  AbstractType,
  getTypeChildren,
  createRelativePositionFromTypeIndex,
  createRelativePositionFromJSON,
  createAbsolutePositionFromRelativePosition,
  compareRelativePositions,
  AbsolutePosition,
  RelativePosition,
  ID,
  createID,
  compareIDs,
  getState,
  Snapshot,
  createSnapshot,
  createDeleteSet,
  createDeleteSetFromStructStore,
  cleanupYTextFormatting,
  snapshot,
  emptySnapshot,
  findRootTypeKey,
  findIndexSS,
  getItem,
  getItemCleanStart,
  getItemCleanEnd,
  typeListToArraySnapshot,
  typeMapGetSnapshot,
  typeMapGetAllSnapshot,
  createDocFromSnapshot,
  iterateDeletedStructs,
  applyUpdate,
  applyUpdateV2,
  readUpdate,
  readUpdateV2,
  encodeStateAsUpdate,
  encodeStateAsUpdateV2,
  encodeStateVector,
  UndoManager,
  decodeSnapshot,
  encodeSnapshot,
  decodeSnapshotV2,
  encodeSnapshotV2,
  decodeStateVector,
  logUpdate,
  logUpdateV2,
  decodeUpdate,
  decodeUpdateV2,
  relativePositionToJSON,
  isDeleted,
  isParentOf,
  equalSnapshots,
  PermanentUserData, // @TODO experimental
  tryGc,
  transact,
  AbstractConnector,
  logType,
  mergeUpdates,
  mergeUpdatesV2,
  parseUpdateMeta,
  parseUpdateMetaV2,
  encodeStateVectorFromUpdate,
  encodeStateVectorFromUpdateV2,
  encodeRelativePosition,
  decodeRelativePosition,
  diffUpdate,
  diffUpdateV2,
  convertUpdateFormatV1ToV2,
  convertUpdateFormatV2ToV1,
  obfuscateUpdate,
  obfuscateUpdateV2,
  UpdateEncoderV1,
  UpdateEncoderV2,
  UpdateDecoderV1,
  UpdateDecoderV2,
  equalDeleteSets,
  mergeDeleteSets,
  snapshotContainsUpdate
} from './internals.js'

const glo = /** @type {any} */ (typeof globalThis !== 'undefined'
  ? globalThis
  : typeof window !== 'undefined'
    ? window
    // @ts-ignore
    : typeof global !== 'undefined' ? global : {})

const importIdentifier = '__ $YJS$ __'

if (glo[importIdentifier] === true) {
  /**
   * Dear reader of this message. Please take this seriously.
   *
   * If you see this message, make sure that you only import one version of Yjs. In many cases,
   * your package manager installs two versions of Yjs that are used by different packages within your project.
   * Another reason for this message is that some parts of your project use the commonjs version of Yjs
   * and others use the EcmaScript version of Yjs.
   *
   * This often leads to issues that are hard to debug. We often need to perform constructor checks,
   * e.g. `struct instanceof GC`. If you imported different versions of Yjs, it is impossible for us to
   * do the constructor checks anymore - which might break the CRDT algorithm.
   *
   * https://github.com/yjs/yjs/issues/438
   */
  console.error('Yjs was already imported. This breaks constructor checks and will lead to issues! - https://github.com/yjs/yjs/issues/438')
}
glo[importIdentifier] = true
