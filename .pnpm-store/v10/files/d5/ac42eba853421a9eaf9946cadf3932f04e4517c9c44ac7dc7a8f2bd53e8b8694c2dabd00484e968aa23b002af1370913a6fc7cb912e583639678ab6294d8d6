export type OmitProperties<Type, Value> = {
    [Key in keyof Type as Type[Key] extends Value ? never : Key]: Type[Key];
};
