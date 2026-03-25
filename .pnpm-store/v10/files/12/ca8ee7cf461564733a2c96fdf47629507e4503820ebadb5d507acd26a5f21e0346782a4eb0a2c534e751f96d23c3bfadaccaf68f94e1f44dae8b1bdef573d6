import type { FC, PropsWithChildren } from './';
export interface Context<T> extends FC<PropsWithChildren<{
    value: T;
}>> {
    values: T[];
    Provider: FC<PropsWithChildren<{
        value: T;
    }>>;
}
export declare const globalContexts: Context<unknown>[];
export declare const createContext: <T>(defaultValue: T) => Context<T>;
export declare const useContext: <T>(context: Context<T>) => T;
