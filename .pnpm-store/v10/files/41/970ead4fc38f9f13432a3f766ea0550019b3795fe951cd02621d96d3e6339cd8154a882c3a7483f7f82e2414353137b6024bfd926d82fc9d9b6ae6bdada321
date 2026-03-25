export type CustomValidationFunction<TSchema> = (schema: TSchema, value: unknown) => boolean;
/** Provides functions to create user defined types */
export declare namespace Custom {
    /** Clears all user defined types */
    function Clear(): void;
    /** Returns true if this user defined type exists */
    function Has(kind: string): boolean;
    /** Sets a validation function for a user defined type */
    function Set<TSchema = unknown>(kind: string, func: CustomValidationFunction<TSchema>): void;
    /** Gets a custom validation function for a user defined type */
    function Get(kind: string): CustomValidationFunction<any> | undefined;
}
