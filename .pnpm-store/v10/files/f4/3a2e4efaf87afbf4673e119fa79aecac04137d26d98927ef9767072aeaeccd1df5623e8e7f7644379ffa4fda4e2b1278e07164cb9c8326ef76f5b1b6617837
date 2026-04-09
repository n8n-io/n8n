export type Prettify<Type> = Type extends Function ? Type : Extract<{
    [Key in keyof Type]: Type[Key];
}, Type>;
