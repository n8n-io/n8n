declare const symbol: unique symbol;
export type CommandOptions<T> = T & {
    readonly [symbol]: true;
};
export declare function commandOptions<T>(options: T): CommandOptions<T>;
export declare function isCommandOptions<T>(options: any): options is CommandOptions<T>;
export {};
