export declare type Defined<T> = T extends undefined ? never : T;
export declare type TypedSchema = {
    __inputType: any;
    __outputType: any;
};
export declare type TypeOf<TSchema extends TypedSchema> = TSchema['__inputType'];
export declare type Asserts<TSchema extends TypedSchema> = TSchema['__outputType'];
export declare type Thunk<T> = T | (() => T);
export declare type If<T, Y, N> = T extends undefined ? Y : N;
