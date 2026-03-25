import { CharLengthDict, COLOR, Dictionary, Row } from '../models/common';
import { Column } from '../models/internal-table';
export declare const cellText: (text: string | number) => string;
export interface RowOptionsRaw {
    color?: string;
    separator?: boolean;
}
export interface RowOptions {
    color: COLOR;
    separator: boolean;
}
export declare const convertRawRowOptionsToStandard: (options?: RowOptionsRaw) => RowOptions | undefined;
export declare const createTableHorizontalBorders: ({ left, mid, right, other, }: {
    left: string;
    mid: string;
    right: string;
    other: string;
}, column_lengths: number[]) => string;
export declare const createColumFromOnlyName: (name: string) => Column;
export declare const createRow: (color: COLOR, text: Dictionary, separator: boolean) => Row;
export declare const findLenOfColumn: (column: Column, rows: Row[], charLength?: CharLengthDict) => number;
export declare const renderTableHorizontalBorders: (style: any, column_lengths: number[]) => string;
export declare const createHeaderAsRow: (createRowFn: any, columns: Column[]) => Row;
export declare const getWidthLimitedColumnsArray: (columns: Column[], row: Row, charLength?: CharLengthDict) => {
    [key: string]: string[];
};
