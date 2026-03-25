import { ColumnMetadata } from "../metadata/ColumnMetadata";
/**
 * Provides utilities to transform hydrated and persisted data.
 */
export declare class DateUtils {
    /**
     * Normalizes date object hydrated from the database.
     */
    static normalizeHydratedDate(mixedDate: Date | string | undefined): Date | string | undefined;
    /**
     * Converts given value into date string in a "YYYY-MM-DD" format.
     */
    static mixedDateToDateString(value: string | Date): string;
    /**
     * Converts given value into date object.
     */
    static mixedDateToDate(mixedDate: Date | string, toUtc?: boolean, useMilliseconds?: boolean): Date;
    /**
     * Converts given value into time string in a "HH:mm:ss" format.
     */
    static mixedDateToTimeString(value: Date | any, skipSeconds?: boolean): string | any;
    /**
     * Converts given value into time string in a "HH:mm:ss" format.
     */
    static mixedTimeToDate(value: Date | any): string | any;
    /**
     * Converts given string value with "-" separator into a "HH:mm:ss" format.
     */
    static mixedTimeToString(value: string | any, skipSeconds?: boolean): string | any;
    /**
     * Converts given value into datetime string in a "YYYY-MM-DD HH-mm-ss" format.
     */
    static mixedDateToDatetimeString(value: Date | any, useMilliseconds?: boolean): string | any;
    /**
     * Converts given value into utc datetime string in a "YYYY-MM-DD HH-mm-ss.sss" format.
     */
    static mixedDateToUtcDatetimeString(value: Date | any): string | any;
    /**
     * Converts each item in the given array to string joined by "," separator.
     */
    static simpleArrayToString(value: any[] | any): string[] | any;
    /**
     * Converts given string to simple array split by "," separator.
     */
    static stringToSimpleArray(value: string | any): string | any;
    static simpleJsonToString(value: any): string;
    static stringToSimpleJson(value: any): any;
    static simpleEnumToString(value: any): string;
    static stringToSimpleEnum(value: any, columnMetadata: ColumnMetadata): any;
    /**
     * Formats given number to "0x" format, e.g. if the totalLength = 2 and the value is 1 then it will return "01".
     */
    private static formatZerolessValue;
    /**
     * Formats given number to "0x" format, e.g. if it is 1 then it will return "01".
     */
    private static formatMilliseconds;
}
