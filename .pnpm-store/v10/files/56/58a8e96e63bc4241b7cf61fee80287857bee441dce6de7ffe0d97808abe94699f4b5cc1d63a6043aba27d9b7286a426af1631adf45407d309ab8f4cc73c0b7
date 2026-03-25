import dayjs from 'dayjs';
import type { SetupContext } from 'vue';
import type { Dayjs } from 'dayjs';
import type { CalendarDateCell, CalendarDateCellType, DateTableEmits, DateTableProps } from './date-table';
export declare const useDateTable: (props: DateTableProps, emit: SetupContext<DateTableEmits>['emit']) => {
    now: dayjs.Dayjs;
    isInRange: import("vue").ComputedRef<boolean>;
    rows: import("vue").ComputedRef<CalendarDateCell[][]>;
    weekDays: import("vue").ComputedRef<string[]>;
    getFormattedDate: (day: number, type: CalendarDateCellType) => Dayjs;
    handlePickDay: ({ text, type }: CalendarDateCell) => void;
    getSlotData: ({ text, type }: CalendarDateCell) => {
        isSelected: boolean;
        type: string;
        day: string;
        date: Date;
    };
};
