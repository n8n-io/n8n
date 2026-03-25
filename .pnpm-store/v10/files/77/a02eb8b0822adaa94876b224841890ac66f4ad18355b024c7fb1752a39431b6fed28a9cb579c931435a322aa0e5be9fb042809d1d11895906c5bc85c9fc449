import { QueryMethodTypes, IterResultType } from './types';
export interface IterArgs {
    inc: boolean;
    before: Date;
    after: Date;
    dt: Date;
    _value: Date | Date[] | null;
}
/**
 * This class helps us to emulate python's generators, sorta.
 */
export default class IterResult<M extends QueryMethodTypes> {
    readonly method: M;
    readonly args: Partial<IterArgs>;
    readonly minDate: Date | null;
    readonly maxDate: Date | null;
    _result: Date[];
    total: number;
    constructor(method: M, args: Partial<IterArgs>);
    /**
     * Possibly adds a date into the result.
     *
     * @param {Date} date - the date isn't necessarly added to the result
     * list (if it is too late/too early)
     * @return {Boolean} true if it makes sense to continue the iteration
     * false if we're done.
     */
    accept(date: Date): boolean;
    /**
     *
     * @param {Date} date that is part of the result.
     * @return {Boolean} whether we are interested in more values.
     */
    add(date: Date): boolean;
    /**
     * 'before' and 'after' return only one date, whereas 'all'
     * and 'between' an array.
     *
     * @return {Date,Array?}
     */
    getValue(): IterResultType<M>;
    clone(): IterResult<M>;
}
//# sourceMappingURL=iterresult.d.ts.map