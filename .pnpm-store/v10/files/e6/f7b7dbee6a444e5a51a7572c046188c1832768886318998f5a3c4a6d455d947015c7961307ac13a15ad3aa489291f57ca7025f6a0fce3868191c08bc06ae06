export type OptionalKeys<Type> = Type extends unknown ? {
    [Key in keyof Type]-?: undefined extends {
        [Key2 in keyof Type]: Key2;
    }[Key] ? Key : never;
}[keyof Type] : never;
