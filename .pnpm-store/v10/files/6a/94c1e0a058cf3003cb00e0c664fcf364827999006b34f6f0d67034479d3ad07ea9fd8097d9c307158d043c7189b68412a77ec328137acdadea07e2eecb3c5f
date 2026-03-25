import JsHistogram from "./JsHistogram";
type TypedArray = ArrayLike<number> & {
    readonly BYTES_PER_ELEMENT: number;
    [key: number]: number;
    fill(v: number): void;
    set(other: TypedArray): void;
};
declare class TypedArrayHistogram extends JsHistogram {
    private arrayCtr;
    _counts: TypedArray;
    _totalCount: number;
    constructor(arrayCtr: new (size: number) => TypedArray, lowestDiscernibleValue: number, highestTrackableValue: number, numberOfSignificantValueDigits: number);
    clearCounts(): void;
    incrementCountAtIndex(index: number): void;
    addToCountAtIndex(index: number, value: number): void;
    setCountAtIndex(index: number, value: number): void;
    resize(newHighestTrackableValue: number): void;
    getCountAtIndex(index: number): number;
    protected _getEstimatedFootprintInBytes(): number;
    copyCorrectedForCoordinatedOmission(expectedIntervalBetweenValueSamples: number): TypedArrayHistogram;
    toString(): string;
}
export default TypedArrayHistogram;
