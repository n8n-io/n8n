declare class Failure extends Error {}

declare const ist: {
  (a: any, b?: any, cmp?: string | ((a: any, b: any) => boolean)): void
  Failure: typeof Failure
  throws: (f: () => void, expected?: null | RegExp | string | ((error: any) => boolean)) => void
}

export default ist
