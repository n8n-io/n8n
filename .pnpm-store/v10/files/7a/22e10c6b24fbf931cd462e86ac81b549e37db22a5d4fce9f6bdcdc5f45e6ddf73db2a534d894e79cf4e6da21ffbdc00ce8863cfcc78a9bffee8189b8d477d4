export type MarkOptional<Type, Keys extends keyof Type> = Type extends Type ? Omit<Type, Keys> & Partial<Pick<Type, Keys>> : never;
