import dayjs from 'dayjs';
import type { ComputedRef, SetupContext } from 'vue';
import type { Dayjs } from 'dayjs';
import type { CalendarDateType, CalendarEmits, CalendarProps } from './calendar';
export declare const useCalendar: (props: CalendarProps, emit: SetupContext<CalendarEmits>['emit'], componentName: string) => {
    calculateValidatedDateRange: (startDayjs: Dayjs, endDayjs: Dayjs) => [Dayjs, Dayjs][];
    date: ComputedRef<dayjs.Dayjs>;
    realSelectedDay: import("vue").WritableComputedRef<dayjs.Dayjs | undefined>;
    pickDay: (day: Dayjs) => void;
    selectDate: (type: CalendarDateType) => void;
    validatedRange: ComputedRef<[dayjs.Dayjs, dayjs.Dayjs][]>;
};
