export type NonNever<Type extends {}> = Pick<Type, {
    [Key in keyof Type]: Type[Key] extends never ? never : Key;
}[keyof Type]>;
