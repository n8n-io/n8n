export type UIOptions = {
    width: number;
    wrap?: boolean;
    rows?: string[];
};
export type Column = {
    text: string;
    width?: number;
    align?: 'right' | 'left' | 'center';
    padding?: number[];
    border?: boolean;
};
export type ColumnArray = Column[] & {
    span?: boolean;
};
export type Line = {
    hidden?: boolean;
    text: string;
    span?: boolean;
};
export declare class UI {
    width: number;
    wrap: boolean;
    rows: ColumnArray[];
    constructor(opts: UIOptions);
    span(...args: ColumnArray): void;
    resetOutput(): void;
    div(...args: (Column | string)[]): ColumnArray;
    shouldApplyLayoutDSL(...args: (Column | string)[]): boolean;
    applyLayoutDSL(str: string): ColumnArray;
    colFromString(text: string): Column;
    measurePadding(str: string): number[];
    toString(): string;
    rowToString(row: ColumnArray, lines: Line[]): Line[];
    renderInline(source: string, previousLine: Line): string;
    rasterize(row: ColumnArray): string[][];
    negatePadding(col: Column): number;
    columnWidths(row: ColumnArray): number[];
}
export declare const cliui: (opts?: Partial<UIOptions>) => UI;
//# sourceMappingURL=index.d.ts.map