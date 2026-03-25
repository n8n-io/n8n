export type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F, false>>;
type Enumerate<N extends number, WithTail extends boolean = true, Acc extends number[] = []> = Acc['length'] extends N ? WithTail extends true ? [...Acc, Acc['length']][number] : Acc[number] : Enumerate<N, WithTail, [...Acc, Acc['length']]>;
export {};
