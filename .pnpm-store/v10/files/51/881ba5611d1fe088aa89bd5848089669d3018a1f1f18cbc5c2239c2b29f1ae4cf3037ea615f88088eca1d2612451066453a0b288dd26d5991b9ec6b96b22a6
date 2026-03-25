import { IterArgs } from './iterresult';
export declare type CacheKeys = 'before' | 'after' | 'between';
export declare class Cache {
    all: Date[] | Partial<IterArgs> | false;
    before: IterArgs[];
    after: IterArgs[];
    between: IterArgs[];
    /**
     * @param {String} what - all/before/after/between
     * @param {Array,Date} value - an array of dates, one date, or null
     * @param {Object?} args - _iter arguments
     */
    _cacheAdd(what: CacheKeys | 'all', value: Date[] | Date | null, args?: Partial<IterArgs>): void;
    /**
     * @return false - not in the cache
     * @return null  - cached, but zero occurrences (before/after)
     * @return Date  - cached (before/after)
     * @return []    - cached, but zero occurrences (all/between)
     * @return [Date1, DateN] - cached (all/between)
     */
    _cacheGet(what: CacheKeys | 'all', args?: Partial<IterArgs>): Date | Date[] | false | null;
}
//# sourceMappingURL=cache.d.ts.map