export type OptionalKeys<Type> = Type extends object ? keyof {
    [Key in keyof Type as Type extends Required<Pick<Type, Key>> ? never : Key]: never;
} : never;
