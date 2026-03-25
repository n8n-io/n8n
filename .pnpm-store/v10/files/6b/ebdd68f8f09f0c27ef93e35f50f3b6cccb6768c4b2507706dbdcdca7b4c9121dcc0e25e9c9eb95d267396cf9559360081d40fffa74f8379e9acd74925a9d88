export type DateType = Date | number | string

export interface CronDate {
    addYear(): void

    addMonth(): void

    addDay(): void

    addHour(): void

    addMinute(): void

    addSecond(): void

    subtractYear(): void

    subtractMonth(): void

    subtractDay(): void

    subtractHour(): void

    subtractMinute(): void

    subtractSecond(): void

    getDate(): number

    getFullYear(): number

    getDay(): number

    getMonth(): number

    getHours(): number

    getMinutes(): number

    getSeconds(): number

    getMilliseconds(): number

    getTime(): number

    getUTCDate(): number

    getUTCFullYear(): number

    getUTCDay(): number

    getUTCMonth(): number

    getUTCHours(): number

    getUTCMinutes(): number

    getUTCSeconds(): number

    toISOString(): string

    toJSON(): string

    setDate(d: number): void

    setFullYear(y: number): void

    setDay(d: number): void

    setMonth(m: number): void

    setHours(h: number): void

    setMinutes(m: number): void

    setSeconds(s: number): void

    setMilliseconds(s: number): void

    getTime(): number

    toString(): string

    toDate(): Date

    isLastDayOfMonth(): boolean
}

export interface ParserOptions<IsIterable extends boolean = false> {
    currentDate?: DateType
    startDate?: DateType
    endDate?: DateType
    utc?: boolean
    tz?: string
    nthDayOfWeek?: number
    iterator?: IsIterable
}

type IteratorResultOrCronDate<IsIterable extends boolean> = IsIterable extends true
    ? IteratorResult<CronDate, CronDate>
    : CronDate;

export interface ICronExpression<CronFields, IsIterable extends boolean> {
    readonly fields: CronFields;

    /** Find next suitable date */
    next(): IteratorResultOrCronDate<IsIterable>

    /** Find previous suitable date */
    prev(): IteratorResultOrCronDate<IsIterable>

    /** Check if next suitable date exists */
    hasNext(): boolean

    /** Check if previous suitable date exists */
    hasPrev(): boolean

    /** Iterate over expression iterator */
    iterate(steps: number, callback?: (item: IteratorResultOrCronDate<IsIterable>, i: number) => void): IteratorResultOrCronDate<IsIterable>[]

    /** Reset expression iterator state */
    reset(resetDate?: string | number | Date): void

    stringify(includeSeconds?: boolean): string
}

export interface IStringResult<CronFields> {
    variables: Record<string, string>,
    expressions: ICronExpression<CronFields, false>[],
    errors: Record<string, any>,
}
