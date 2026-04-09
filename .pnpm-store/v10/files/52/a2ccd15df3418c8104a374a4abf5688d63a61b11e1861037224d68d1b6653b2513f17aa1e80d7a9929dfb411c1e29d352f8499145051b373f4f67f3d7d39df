import { CharLengthDict, COLOR, Dictionary, Row } from '../models/common';
import { CellValue, Valuetransform } from '../models/external-table';
import { Column, TableLineDetails } from '../models/internal-table';
export declare const cellText: (text: CellValue) => string;
export declare const evaluateCellText: (text: CellValue, transform?: Valuetransform) => string;
export interface RowOptionsRaw {
    color?: string;
    separator?: boolean;
}
export interface RowOptions {
    color: COLOR;
    separator: boolean;
}
export interface CreateRowFunction {
    (color: COLOR, text: Dictionary, separator: boolean): Row;
}
export declare const convertRawRowOptionsToStandard: (options?: RowOptionsRaw) => RowOptions | undefined;
export declare const createTableHorizontalBorders: ({ left, mid, right, other }: TableLineDetails, column_lengths: number[]) => string;
export declare const createColumFromOnlyName: (name: string) => {
    name: string;
    title: string;
};
export declare const createRow: CreateRowFunction;
export declare const findLenOfColumn: (column: Column, rows: Row[], charLength?: CharLengthDict) => number;
export declare const renderTableHorizontalBorders: (style: TableLineDetails, column_lengths: number[]) => string;
export declare const createHeaderAsRow: (createRowFn: CreateRowFunction, columns: Column[]) => Row;
export declare const getWidthLimitedColumnsArray: (columns: Column[], row: Row, charLength?: CharLengthDict) => {
    [key: string]: string[];
};
