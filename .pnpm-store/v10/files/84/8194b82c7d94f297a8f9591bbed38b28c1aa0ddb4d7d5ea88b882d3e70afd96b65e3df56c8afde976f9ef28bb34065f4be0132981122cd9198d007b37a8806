import type { CellRange } from '../interfaces/IRangeService';
import type { CellValueChange } from '../interfaces/iUndoRedo';
export declare class UndoRedoAction {
    cellValueChanges: CellValueChange[];
    constructor(cellValueChanges: CellValueChange[]);
}
export declare class RangeUndoRedoAction extends UndoRedoAction {
    readonly initialRange?: CellRange | undefined;
    readonly finalRange?: CellRange | undefined;
    readonly ranges?: CellRange[] | undefined;
    constructor(cellValueChanges: CellValueChange[], initialRange?: CellRange | undefined, finalRange?: CellRange | undefined, ranges?: CellRange[] | undefined);
}
export declare class UndoRedoStack {
    private readonly maxStackSize;
    private actionStack;
    constructor(maxStackSize?: number);
    pop(): UndoRedoAction | undefined;
    push(item: UndoRedoAction): void;
    clear(): void;
    getCurrentStackSize(): number;
}
