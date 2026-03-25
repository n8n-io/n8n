"use strict";
/**
 * Experimental task interfaces for MCP SDK.
 * WARNING: These APIs are experimental and may change without notice.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTerminal = isTerminal;
/**
 * Checks if a task status represents a terminal state.
 * Terminal states are those where the task has finished and will not change.
 *
 * @param status - The task status to check
 * @returns True if the status is terminal (completed, failed, or cancelled)
 * @experimental
 */
function isTerminal(status) {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
}
//# sourceMappingURL=interfaces.js.map