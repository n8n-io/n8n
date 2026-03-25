export type FormatValidationFunction = (value: string) => boolean;
/** Provides functions to create user defined string formats */
export declare namespace Format {
    /** Clears all user defined string formats */
    function Clear(): void;
    /** Returns true if the user defined string format exists */
    function Has(format: string): boolean;
    /** Sets a validation function for a user defined string format */
    function Set(format: string, func: FormatValidationFunction): void;
    /** Gets a validation function for a user defined string format */
    function Get(format: string): FormatValidationFunction | undefined;
}
