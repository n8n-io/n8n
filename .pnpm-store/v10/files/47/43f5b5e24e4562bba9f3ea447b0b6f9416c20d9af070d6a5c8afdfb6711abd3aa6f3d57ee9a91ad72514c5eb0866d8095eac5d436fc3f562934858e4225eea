import { Computed } from '../computed.js';
import { Dependency } from '../system.js';
export declare function asyncComputed<T>(getter: (cachedValue?: T) => AsyncGenerator<Dependency, T>): AsyncComputed<T>;
export declare class AsyncComputed<T = any> extends Computed {
    get(): Promise<T>;
    update(): Promise<boolean>;
}
