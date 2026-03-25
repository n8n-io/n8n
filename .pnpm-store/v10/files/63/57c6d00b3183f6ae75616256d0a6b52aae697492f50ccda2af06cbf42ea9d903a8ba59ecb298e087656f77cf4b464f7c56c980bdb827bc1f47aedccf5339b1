import type { Locator } from './context.js'
import type { TestingLibraryMatchers } from './jest-dom.js'
import type { Assertion, ExpectPollOptions } from 'vitest'

declare module 'vitest' {
  interface JestAssertion<T = any> extends TestingLibraryMatchers<void, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<void, void> {}

  type Promisify<O> = {
    [K in keyof O]: O[K] extends (...args: infer A) => infer R
      ? O extends R
        ? Promisify<O[K]>
        : (...args: A) => Promise<R>
      : O[K];
  }

  type PromisifyDomAssertion<T> = Promisify<Assertion<T>>

  interface ExpectStatic {
    /**
     * `expect.element(locator)` is a shorthand for `expect.poll(() => locator.element())`.
     * You can set default timeout via `expect.poll.timeout` option in the config.
     * @see {@link https://vitest.dev/api/expect#poll}
     */
    element: <T extends HTMLElement | SVGElement | null | Locator>(element: T, options?: ExpectPollOptions) => PromisifyDomAssertion<Awaited<HTMLElement | SVGElement | null>>
  }
}

export {}
