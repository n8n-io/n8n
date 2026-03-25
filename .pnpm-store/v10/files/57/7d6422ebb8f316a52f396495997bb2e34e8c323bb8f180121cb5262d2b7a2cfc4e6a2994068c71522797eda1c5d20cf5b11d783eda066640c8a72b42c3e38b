import { Lambda } from "../internal";
export type IInterceptor<T> = (change: T) => T | null;
export interface IInterceptable<T> {
    interceptors_: IInterceptor<T>[] | undefined;
}
export declare function hasInterceptors(interceptable: IInterceptable<any>): boolean;
export declare function registerInterceptor<T>(interceptable: IInterceptable<T>, handler: IInterceptor<T>): Lambda;
export declare function interceptChange<T>(interceptable: IInterceptable<T | null>, change: T | null): T | null;
