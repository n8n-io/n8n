import { endBatch, startBatch } from "../internal"

/**
 * During a transaction no views are updated until the end of the transaction.
 * The transaction will be run synchronously nonetheless.
 *
 * @param action a function that updates some reactive state
 * @returns any value that was returned by the 'action' parameter.
 */
export function transaction<T>(action: () => T, thisArg = undefined): T {
    startBatch()
    try {
        return action.apply(thisArg)
    } finally {
        endBatch()
    }
}
