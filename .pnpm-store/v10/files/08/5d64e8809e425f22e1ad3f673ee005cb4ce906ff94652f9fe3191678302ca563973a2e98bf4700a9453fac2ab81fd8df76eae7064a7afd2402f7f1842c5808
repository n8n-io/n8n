export class StackItem {
    /**
     * @param {DeleteSet} deletions
     * @param {DeleteSet} insertions
     */
    constructor(deletions: DeleteSet, insertions: DeleteSet);
    insertions: DeleteSet;
    deletions: DeleteSet;
    /**
     * Use this to save and restore metadata like selection range
     */
    meta: Map<any, any>;
}
/**
 * @typedef {Object} UndoManagerOptions
 * @property {number} [UndoManagerOptions.captureTimeout=500]
 * @property {function(Transaction):boolean} [UndoManagerOptions.captureTransaction] Do not capture changes of a Transaction if result false.
 * @property {function(Item):boolean} [UndoManagerOptions.deleteFilter=()=>true] Sometimes
 * it is necessary to filter what an Undo/Redo operation can delete. If this
 * filter returns false, the type/item won't be deleted even it is in the
 * undo/redo scope.
 * @property {Set<any>} [UndoManagerOptions.trackedOrigins=new Set([null])]
 * @property {boolean} [ignoreRemoteMapChanges] Experimental. By default, the UndoManager will never overwrite remote changes. Enable this property to enable overwriting remote changes on key-value changes (Y.Map, properties on Y.Xml, etc..).
 * @property {Doc} [doc] The document that this UndoManager operates on. Only needed if typeScope is empty.
 */
/**
 * @typedef {Object} StackItemEvent
 * @property {StackItem} StackItemEvent.stackItem
 * @property {any} StackItemEvent.origin
 * @property {'undo'|'redo'} StackItemEvent.type
 * @property {Map<AbstractType<YEvent<any>>,Array<YEvent<any>>>} StackItemEvent.changedParentTypes
 */
/**
 * Fires 'stack-item-added' event when a stack item was added to either the undo- or
 * the redo-stack. You may store additional stack information via the
 * metadata property on `event.stackItem.meta` (it is a `Map` of metadata properties).
 * Fires 'stack-item-popped' event when a stack item was popped from either the
 * undo- or the redo-stack. You may restore the saved stack information from `event.stackItem.meta`.
 *
 * @extends {ObservableV2<{'stack-item-added':function(StackItemEvent, UndoManager):void, 'stack-item-popped': function(StackItemEvent, UndoManager):void, 'stack-cleared': function({ undoStackCleared: boolean, redoStackCleared: boolean }):void, 'stack-item-updated': function(StackItemEvent, UndoManager):void }>}
 */
export class UndoManager extends ObservableV2<{
    'stack-item-added': (arg0: StackItemEvent, arg1: UndoManager) => void;
    'stack-item-popped': (arg0: StackItemEvent, arg1: UndoManager) => void;
    'stack-cleared': (arg0: {
        undoStackCleared: boolean;
        redoStackCleared: boolean;
    }) => void;
    'stack-item-updated': (arg0: StackItemEvent, arg1: UndoManager) => void;
}> {
    /**
     * @param {Doc|AbstractType<any>|Array<AbstractType<any>>} typeScope Limits the scope of the UndoManager. If this is set to a ydoc instance, all changes on that ydoc will be undone. If set to a specific type, only changes on that type or its children will be undone. Also accepts an array of types.
     * @param {UndoManagerOptions} options
     */
    constructor(typeScope: Doc | AbstractType<any> | Array<AbstractType<any>>, { captureTimeout, captureTransaction, deleteFilter, trackedOrigins, ignoreRemoteMapChanges, doc }?: UndoManagerOptions);
    /**
     * @type {Array<AbstractType<any> | Doc>}
     */
    scope: Array<AbstractType<any> | Doc>;
    doc: Doc;
    deleteFilter: (arg0: Item) => boolean;
    trackedOrigins: Set<any>;
    captureTransaction: (arg0: Transaction) => boolean;
    /**
     * @type {Array<StackItem>}
     */
    undoStack: Array<StackItem>;
    /**
     * @type {Array<StackItem>}
     */
    redoStack: Array<StackItem>;
    /**
     * Whether the client is currently undoing (calling UndoManager.undo)
     *
     * @type {boolean}
     */
    undoing: boolean;
    redoing: boolean;
    /**
     * The currently popped stack item if UndoManager.undoing or UndoManager.redoing
     *
     * @type {StackItem|null}
     */
    currStackItem: StackItem | null;
    lastChange: number;
    ignoreRemoteMapChanges: boolean;
    captureTimeout: number;
    /**
     * @param {Transaction} transaction
     */
    afterTransactionHandler: (transaction: Transaction) => void;
    /**
     * Extend the scope.
     *
     * @param {Array<AbstractType<any> | Doc> | AbstractType<any> | Doc} ytypes
     */
    addToScope(ytypes: Array<AbstractType<any> | Doc> | AbstractType<any> | Doc): void;
    /**
     * @param {any} origin
     */
    addTrackedOrigin(origin: any): void;
    /**
     * @param {any} origin
     */
    removeTrackedOrigin(origin: any): void;
    clear(clearUndoStack?: boolean, clearRedoStack?: boolean): void;
    /**
     * UndoManager merges Undo-StackItem if they are created within time-gap
     * smaller than `options.captureTimeout`. Call `um.stopCapturing()` so that the next
     * StackItem won't be merged.
     *
     *
     * @example
     *     // without stopCapturing
     *     ytext.insert(0, 'a')
     *     ytext.insert(1, 'b')
     *     um.undo()
     *     ytext.toString() // => '' (note that 'ab' was removed)
     *     // with stopCapturing
     *     ytext.insert(0, 'a')
     *     um.stopCapturing()
     *     ytext.insert(0, 'b')
     *     um.undo()
     *     ytext.toString() // => 'a' (note that only 'b' was removed)
     *
     */
    stopCapturing(): void;
    /**
     * Undo last changes on type.
     *
     * @return {StackItem?} Returns StackItem if a change was applied
     */
    undo(): StackItem | null;
    /**
     * Redo last undo operation.
     *
     * @return {StackItem?} Returns StackItem if a change was applied
     */
    redo(): StackItem | null;
    /**
     * Are undo steps available?
     *
     * @return {boolean} `true` if undo is possible
     */
    canUndo(): boolean;
    /**
     * Are redo steps available?
     *
     * @return {boolean} `true` if redo is possible
     */
    canRedo(): boolean;
}
export type UndoManagerOptions = {
    captureTimeout?: number | undefined;
    /**
     * Do not capture changes of a Transaction if result false.
     */
    captureTransaction?: ((arg0: Transaction) => boolean) | undefined;
    /**
     * Sometimes
     * it is necessary to filter what an Undo/Redo operation can delete. If this
     * filter returns false, the type/item won't be deleted even it is in the
     * undo/redo scope.
     */
    deleteFilter?: ((arg0: Item) => boolean) | undefined;
    trackedOrigins?: Set<any> | undefined;
    /**
     * Experimental. By default, the UndoManager will never overwrite remote changes. Enable this property to enable overwriting remote changes on key-value changes (Y.Map, properties on Y.Xml, etc..).
     */
    ignoreRemoteMapChanges?: boolean | undefined;
    /**
     * The document that this UndoManager operates on. Only needed if typeScope is empty.
     */
    doc?: Doc | undefined;
};
export type StackItemEvent = {
    stackItem: StackItem;
    origin: any;
    type: 'undo' | 'redo';
    changedParentTypes: Map<AbstractType<YEvent<any>>, Array<YEvent<any>>>;
};
import { DeleteSet } from "./DeleteSet.js";
import { ObservableV2 } from "lib0/observable";
import { AbstractType } from "../types/AbstractType.js";
import { Doc } from "./Doc.js";
import { Item } from "../structs/Item.js";
import { Transaction } from "./Transaction.js";
import { YEvent } from "./YEvent.js";
//# sourceMappingURL=UndoManager.d.ts.map