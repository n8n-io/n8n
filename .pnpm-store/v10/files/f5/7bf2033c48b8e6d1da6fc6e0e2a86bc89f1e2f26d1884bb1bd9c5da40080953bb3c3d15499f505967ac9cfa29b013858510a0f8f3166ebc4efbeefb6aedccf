type Removed<T, Drop> = T extends Record<string, any> ? T extends ArrayLike<any> ? Array<Removed<T[number], Drop>> : {
    [K in Exclude<keyof T, Drop>]: Removed<T[K], Drop>;
} : T;
export declare function removePropertyRecursively<TObject extends object, TProp extends string>(object: TObject, propToRemove: TProp): Removed<TObject, TProp>;
export {};
