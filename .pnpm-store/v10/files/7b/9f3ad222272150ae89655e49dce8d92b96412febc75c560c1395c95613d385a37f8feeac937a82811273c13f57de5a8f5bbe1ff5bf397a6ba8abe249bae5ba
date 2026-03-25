import type { Dayjs } from 'dayjs';
import type { GetDisabledHoursState, GetDisabledMinutesState, GetDisabledSecondsState } from '../types';
declare type UseTimePanelProps = {
    getAvailableHours: GetDisabledHoursState;
    getAvailableMinutes: GetDisabledMinutesState;
    getAvailableSeconds: GetDisabledSecondsState;
};
export declare const useTimePanel: ({ getAvailableHours, getAvailableMinutes, getAvailableSeconds, }: UseTimePanelProps) => {
    timePickerOptions: Record<string, (...args: any[]) => void>;
    getAvailableTime: (date: Dayjs, role: string, first: boolean, compareDate?: Dayjs | undefined) => Dayjs;
    onSetOption: ([key, val]: [string, (...args: any[]) => void]) => void;
};
export {};
