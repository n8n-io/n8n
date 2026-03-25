/**
 * @template T
 * @param { (...args: any) => Promise<T> } [asyncFunction]
 * Promise returning function that will only ever be invoked sequentially.
 * @returns { (...args: any) => Promise<T> }
 * Function that may invoke asyncFunction if there is not a currently executing invocation.
 * Returns promise from the currently executing invocation.
 */
module.exports = asyncFunction => {
  let promise = null

  return (...args) => {
    if (promise == null) {
      promise = asyncFunction(...args).finally(() => (promise = null))
    }
    return promise
  }
}
