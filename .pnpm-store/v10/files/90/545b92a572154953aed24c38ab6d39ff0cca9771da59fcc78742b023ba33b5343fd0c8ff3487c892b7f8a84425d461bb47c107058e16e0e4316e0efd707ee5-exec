export type DateTimeFormatOptions = Intl.DateTimeFormatOptions;

export interface ZoneOptions {
    /**
     * If true, adjust the underlying time so that the local time stays the same, but in the target zone.
     * You should rarely need this.
     * Defaults to false.
     */
    keepLocalTime?: boolean | undefined;
    /**
     * @deprecated since 0.2.12. Use keepLocalTime instead
     */
    keepCalendarTime?: boolean | undefined;
}

/** @deprecated */
export type EraLength = StringUnitLength;

export type NumberingSystem = Intl.DateTimeFormatOptions extends { numberingSystem?: infer T }
    ? T
    :
          | 'arab'
          | 'arabext'
          | 'bali'
          | 'beng'
          | 'deva'
          | 'fullwide'
          | 'gujr'
          | 'guru'
          | 'hanidec'
          | 'khmr'
          | 'knda'
          | 'laoo'
          | 'latn'
          | 'limb'
          | 'mlym'
          | 'mong'
          | 'mymr'
          | 'orya'
          | 'tamldec'
          | 'telu'
          | 'thai'
          | 'tibt';

export type CalendarSystem = Intl.DateTimeFormatOptions extends { calendar?: infer T }
    ? T
    :
          | 'buddhist'
          | 'chinese'
          | 'coptic'
          | 'ethioaa'
          | 'ethiopic'
          | 'gregory'
          | 'hebrew'
          | 'indian'
          | 'islamic'
          | 'islamicc'
          | 'iso8601'
          | 'japanese'
          | 'persian'
          | 'roc';

export type HourCycle = 'h11' | 'h12' | 'h23' | 'h24';

export type StringUnitLength = 'narrow' | 'short' | 'long';
export type NumberUnitLength = 'numeric' | '2-digit';
export type UnitLength = StringUnitLength | NumberUnitLength;
