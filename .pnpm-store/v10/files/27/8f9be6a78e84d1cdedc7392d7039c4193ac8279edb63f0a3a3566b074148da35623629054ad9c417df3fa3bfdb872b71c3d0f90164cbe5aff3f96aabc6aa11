/**
 * 條件類型工具
 * Conditional Type Utilities
 *
 * 提供基於條件的類型選擇工具
 * Provides conditional-based type selection utilities
 */
/**
 * 條件類型：根據條件 C 選擇 T 或 U
 * Conditional type: select T or U based on condition C
 *
 * @example
 * type IsString<T> = T extends string ? true : false;
 * type Result = ITSIf<IsString<T>, 'is string', 'not string'>;
 */
export type ITSHelperIf<C extends boolean, T, U> = C extends true ? T : U;
/**
 * 條件類型：根據類型匹配選擇 T 或 U
 * Conditional type: select T or U based on type match
 *
 * @example
 * type Result = ITSIfExtends<string, 'text', 'other'>; // 'text'
 * type Result2 = ITSIfExtends<number, 'text', 'other'>; // 'other'
 */
export type ITSHelperIfExtends<T, U, IfTrue, IfFalse> = T extends U ? IfTrue : IfFalse;
/**
 * 條件類型：根據類型相等選擇 T 或 U
 * Conditional type: select T or U based on type equality
 *
 * @example
 * type Result = ITSIfEquals<string, string, 'same', 'different'>; // 'same'
 * type Result2 = ITSIfEquals<string, number, 'same', 'different'>; // 'different'
 */
export type ITSHelperIfEquals<T, U, IfTrue, IfFalse> = T extends U ? U extends T ? IfTrue : IfFalse : IfFalse;
