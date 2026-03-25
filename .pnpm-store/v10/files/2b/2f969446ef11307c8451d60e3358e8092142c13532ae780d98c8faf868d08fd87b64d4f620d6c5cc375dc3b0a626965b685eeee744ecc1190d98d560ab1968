declare const NO_DATA_SYMBOL: unique symbol;
export type Segment<T = typeof NO_DATA_SYMBOL> = string | (T extends typeof NO_DATA_SYMBOL ? [
    text: string,
    source: string | undefined,
    sourceOffset: number
] : [
    text: string,
    source: string | undefined,
    sourceOffset: number,
    data: T
]);
export interface StackNode {
    length: number;
    stack: string;
}
export {};
