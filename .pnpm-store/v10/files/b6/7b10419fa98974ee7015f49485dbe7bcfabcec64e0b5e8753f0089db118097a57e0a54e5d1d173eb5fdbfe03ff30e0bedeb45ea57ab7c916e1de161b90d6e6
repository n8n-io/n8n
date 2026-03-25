export type PickProperties<Type, Value> = {
    [Key in keyof Type as Type[Key] extends Value ? Key : never]: Type[Key];
};
