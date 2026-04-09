import { Interrupt, ThreadState } from "../schema.js";

//#region src/ui/interrupts.d.ts
/**
 * Rewrites Python/API snake_case on interrupt `value` to JS camelCase for HITL.
 */
declare function normalizeInterruptForClient<T = unknown>(interrupt: Interrupt<T>): Interrupt<T>;
/**
 * Applies {@link normalizeInterruptForClient} to each interrupt.
 */
declare function normalizeInterruptsList<T = unknown>(interrupts: Interrupt<T>[]): Interrupt<T>[];
declare function extractInterrupts<InterruptType = unknown>(values: unknown, options?: {
  isLoading: boolean;
  threadState: ThreadState | undefined;
  error: unknown;
}): Interrupt<InterruptType> | undefined;
//#endregion
export { extractInterrupts, normalizeInterruptForClient, normalizeInterruptsList };
//# sourceMappingURL=interrupts.d.ts.map