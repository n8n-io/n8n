import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { DateCell } from './date-picker.type';
declare type DayRange = [Dayjs | undefined, Dayjs | undefined];
export declare const isValidRange: (range: DayRange) => boolean;
declare type GetDefaultValueParams = {
    lang: string;
    unit: 'month' | 'year';
    unlinkPanels: boolean;
};
export declare type DefaultValue = [Date, Date] | Date | undefined;
export declare const getDefaultValue: (defaultValue: DefaultValue, { lang, unit, unlinkPanels }: GetDefaultValueParams) => dayjs.Dayjs[];
declare type Dimension = {
    row: number;
    column: number;
};
declare type BuildPickerTableMetadata = {
    startDate?: Dayjs | null;
    unit: 'month' | 'day';
    columnIndexOffset: number;
    now: Dayjs;
    nextEndDate: Dayjs | null;
    relativeDateGetter: (index: number) => Dayjs;
    setCellMetadata?: (cell: DateCell, dimension: {
        rowIndex: number;
        columnIndex: number;
    }) => void;
    setRowMetadata?: (row: DateCell[]) => void;
};
export declare const buildPickerTable: (dimension: Dimension, rows: DateCell[][], { columnIndexOffset, startDate, nextEndDate, now, unit, relativeDateGetter, setCellMetadata, setRowMetadata, }: BuildPickerTableMetadata) => void;
export {};
