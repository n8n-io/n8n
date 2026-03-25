import type { Router } from '../../router';
import type { MatcherMap } from './matcher';
import { match } from './matcher';
export declare class RegExpRouter<T> implements Router<T> {
             
    name: string;
    constructor();
    add(method: string, path: string, handler: T): void;
    match: typeof match<Router<T>, T>;
    protected buildAllMatchers(): MatcherMap<T>;
}
