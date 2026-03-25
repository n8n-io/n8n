declare module 'check-more-types' {
  type predicate = (s: any) => boolean
  interface Predicates {
    unemptyString: predicate,
    defined: predicate,
    webUrl: predicate,
    empty: predicate,
    object: predicate,
    number: predicate,
    fn: predicate,
    // for now, should be curried functions
    oneOf: any,
    schema: any
  }
  interface CheckModeTypes extends Predicates {
    not: Predicates
  }
  const is: CheckModeTypes
  export = is
}
