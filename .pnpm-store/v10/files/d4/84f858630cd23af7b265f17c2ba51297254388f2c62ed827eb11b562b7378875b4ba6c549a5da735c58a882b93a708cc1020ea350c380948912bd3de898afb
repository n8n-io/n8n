//#region src/utils/context.d.ts
/**
 * A tagged template function for creating formatted strings.
 *
 * This utility provides a clean, template literal-based API for string formatting
 * that can be used for prompts, descriptions, and other text formatting needs.
 *
 * It automatically handles whitespace normalization and indentation, making it
 * ideal for multi-line strings in code.
 *
 * When using this utility, it will:
 * - Strip common leading indentation from all lines
 * - Trim leading/trailing whitespace
 * - Align multi-line interpolated values to match indentation
 * - Support escape sequences: `\\n` (newline), `\\`` (backtick), `\\$` (dollar), `\\{` (brace)
 *
 * @example
 * ```typescript
 * import { context } from "@langchain/core/utils/context";
 *
 * const role = "agent";
 * const prompt = context`
 *   You are an ${role}.
 *   Your task is to help users.
 * `;
 * // Returns: "You are an agent.\nYour task is to help users."
 * ```
 *
 * @example
 * ```typescript
 * // Multi-line interpolated values are aligned
 * const items = "- Item 1\n- Item 2\n- Item 3";
 * const message = context`
 *   Shopping list:
 *     ${items}
 *   End of list.
 * `;
 * // The items will be indented to match "    " (4 spaces)
 * ```
 */
declare function context(strings: TemplateStringsArray, ...values: unknown[]): string;
//#endregion
export { context };
//# sourceMappingURL=context.d.cts.map