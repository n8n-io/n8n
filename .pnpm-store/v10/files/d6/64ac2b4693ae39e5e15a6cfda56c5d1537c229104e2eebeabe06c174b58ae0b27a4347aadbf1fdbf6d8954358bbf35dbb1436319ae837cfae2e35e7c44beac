import type { Result, Router } from '../../router';
export declare class SmartRouter<T> implements Router<T> {
             
    name: string;
    constructor(init: {
        routers: Router<T>[];
    });
    add(method: string, path: string, handler: T): void;
    match(method: string, path: string): Result<T>;
    get activeRouter(): Router<T>;
}
