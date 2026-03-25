import IterResult, { IterArgs } from './iterresult';
declare type Iterator = (d: Date, len: number) => boolean;
/**
 * IterResult subclass that calls a callback function on each add,
 * and stops iterating when the callback returns false.
 */
export default class CallbackIterResult extends IterResult<'all' | 'between'> {
    private iterator;
    constructor(method: 'all' | 'between', args: Partial<IterArgs>, iterator: Iterator);
    add(date: Date): boolean;
}
export {};
//# sourceMappingURL=callbackiterresult.d.ts.map