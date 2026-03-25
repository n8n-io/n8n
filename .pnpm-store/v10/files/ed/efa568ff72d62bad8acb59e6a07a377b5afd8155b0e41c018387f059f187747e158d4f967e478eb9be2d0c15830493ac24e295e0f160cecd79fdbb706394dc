import { Effect } from '../effect.js';
import { Dependency } from '../system.js';
export declare function asyncEffect<T>(fn: () => AsyncGenerator<Dependency, T>): AsyncEffect<T>;
export declare class AsyncEffect<T = any> extends Effect {
    notify(): Promise<void>;
    run(): Promise<T>;
}
