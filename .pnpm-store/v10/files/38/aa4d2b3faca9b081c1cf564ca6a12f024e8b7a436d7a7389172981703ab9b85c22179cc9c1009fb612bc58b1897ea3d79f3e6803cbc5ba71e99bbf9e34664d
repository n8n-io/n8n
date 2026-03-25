export interface EmitterAugmentation1<Name extends string | symbol, Arg> {
    addListener(event: Name, listener: (arg1: Arg) => void): this;
    emit(event: Name, arg1: Arg): boolean;
    on(event: Name, listener: (arg1: Arg) => void): this;
    once(event: Name, listener: (arg1: Arg) => void): this;
    prependListener(event: Name, listener: (arg1: Arg) => void): this;
    prependOnceListener(event: Name, listener: (arg1: Arg) => void): this;
    removeListener(event: Name, listener: (arg1: Arg) => void): this;
}
