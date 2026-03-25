import { SpawnOptions } from 'child_process';
import { DateTime } from 'luxon';
import { CONSTRAINTS, TIME_UNITS_MAP } from '../constants';
import { CronJob } from '../job';
import { IntRange } from './utils';
interface BaseCronJobParams<OC extends CronOnCompleteCommand | null = null, C = null> {
    cronTime: string | Date | DateTime;
    onTick: CronCommand<C, WithOnComplete<OC>>;
    onComplete?: OC;
    start?: boolean | null;
    context?: C;
    runOnInit?: boolean | null;
    unrefTimeout?: boolean | null;
    waitForCompletion?: boolean | null;
    errorHandler?: ((error: unknown) => void) | null;
    threshold?: number | null;
    name?: string | null;
}
export type CronJobParams<OC extends CronOnCompleteCommand | null = null, C = null> = BaseCronJobParams<OC, C> & ({
    timeZone?: string | null;
    utcOffset?: never;
} | {
    timeZone?: never;
    utcOffset?: number | null;
});
export type CronContext<C> = C extends null ? CronJob : NonNullable<C>;
export type CronCallback<C, WithOnCompleteBool extends boolean = false> = (this: CronContext<C>, onComplete: WithOnCompleteBool extends true ? CronOnCompleteCallback : never) => void | Promise<void>;
export type CronOnCompleteCallback = () => void | Promise<void>;
export type CronSystemCommand = string | {
    command: string;
    args?: readonly string[] | null;
    options?: SpawnOptions | null;
};
export type CronCommand<C, WithOnCompleteBool extends boolean = false> = CronCallback<C, WithOnCompleteBool> | CronSystemCommand;
export type CronOnCompleteCommand = CronOnCompleteCallback | CronSystemCommand;
export type WithOnComplete<OC> = OC extends null ? false : true;
export type TimeUnit = (typeof TIME_UNITS_MAP)[keyof typeof TIME_UNITS_MAP];
export type TimeUnitField<T extends TimeUnit> = Partial<Record<Ranges[T], boolean>>;
export interface Ranges {
    second: SecondRange;
    minute: MinuteRange;
    hour: HourRange;
    dayOfMonth: DayOfMonthRange;
    month: MonthRange;
    dayOfWeek: DayOfWeekRange;
}
export type SecondRange = IntRange<(typeof CONSTRAINTS)['second'][0], (typeof CONSTRAINTS)['second'][1]>;
export type MinuteRange = IntRange<(typeof CONSTRAINTS)['minute'][0], (typeof CONSTRAINTS)['minute'][1]>;
export type HourRange = IntRange<(typeof CONSTRAINTS)['hour'][0], (typeof CONSTRAINTS)['hour'][1]>;
export type DayOfMonthRange = IntRange<(typeof CONSTRAINTS)['dayOfMonth'][0], (typeof CONSTRAINTS)['dayOfMonth'][1]>;
export type MonthRange = IntRange<(typeof CONSTRAINTS)['month'][0], (typeof CONSTRAINTS)['month'][1]>;
export type DayOfWeekRange = IntRange<(typeof CONSTRAINTS)['dayOfWeek'][0], (typeof CONSTRAINTS)['dayOfWeek'][1]>;
export {};
