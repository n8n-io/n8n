/**
 * Pick only the keys that match the Type `U`
 */
export type PickKeysByType<T, U> = string & keyof {
    [P in keyof T as T[P] extends U ? P : never]: T[P];
};
