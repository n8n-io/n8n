import type { WeekDayFormat } from 'reka-ui/date';

/**
 * The picker's `weekdayFormat` default, typed rather than passed as a bare
 * literal. `withDefaults` makes the defaulted props required, so the compiler
 * writes their types out structurally instead of referencing
 * `DateRangePickerRootProps` by name — and `WeekDayFormat` only reaches this
 * package through reka-ui's `./date` entry, not its root. Without this named
 * reference it is unnameable and the picker's declaration is silently skipped
 * (TS2883).
 *
 * Kept out of `index.ts` so it stays off the package's public barrel.
 */
export const DEFAULT_WEEKDAY_FORMAT: WeekDayFormat = 'short';
