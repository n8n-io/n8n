// Type definitions for should.js

declare function should(obj: any): should.Assertion;

// node assert methods
/*interface NodeAssert {
  fail(actual: any, expected: any, message?: string, operator?: string): void;
  ok(value: any, message?: string): void;
  equal(actual: any, expected: any, message?: string): void;
  notEqual(actual: any, expected: any, message?: string): void;
  deepEqual(actual: any, expected: any, message?: string): void;
  notDeepEqual(actual: any, expected: any, message?: string): void;
  strictEqual(actual: any, expected: any, message?: string): void;
  notStrictEqual(actual: any, expected: any, message?: string): void;

  throws(block: Function, message?: string): void;
  throws(block: Function, error: Function, message?: string): void;
  throws(block: Function, error: RegExp, message?: string): void;
  throws(block: Function, error: (err: any) => boolean, message?: string): void;

  doesNotThrow(block: Function, message?: string): void;
  doesNotThrow(block: Function, error: Function, message?: string): void;
  doesNotThrow(block: Function, error: RegExp, message?: string): void;
  doesNotThrow(block: Function, error: (err: any) => boolean, message?: string): void;

  ifError(value: any): void;
}



interface should extends NodeAssert, ShouldAssertExt {
  not: ShouldAssertExt;
}*/

declare namespace should {
  interface ShouldAssertExt {
    exist(obj: any, msg?: string): void;
    exists(obj: any, msg?: string): void;
  }

  function fail(actual: any, expected: any, message?: string, operator?: string): void;
  function ok(value: any, message?: string): void;
  function equal(actual: any, expected: any, message?: string): void;
  function notEqual(actual: any, expected: any, message?: string): void;
  function deepEqual(actual: any, expected: any, message?: string): void;
  function notDeepEqual(actual: any, expected: any, message?: string): void;
  function strictEqual(actual: any, expected: any, message?: string): void;
  function notStrictEqual(actual: any, expected: any, message?: string): void;

  function throws(block: Function, message?: string): void;
  function throws(block: Function, error: Function, message?: string): void;
  function throws(block: Function, error: RegExp, message?: string): void;
  function throws(block: Function, error: (err: any) => boolean, message?: string): void;

  function doesNotThrow(block: Function, message?: string): void;
  function doesNotThrow(block: Function, error: Function, message?: string): void;
  function doesNotThrow(block: Function, error: RegExp, message?: string): void;
  function doesNotThrow(block: Function, error: (err: any) => boolean, message?: string): void;

  function ifError(value: any): void;

  function exist(obj: any, msg?: string): void;
  function exists(obj: any, msg?: string): void;

  const not: ShouldAssertExt;

  interface Assertion {
    assert(expr: boolean): this;
    fail(): this;

    not: this;
    any: this;
    only: this;

    // bool
    true(message?: string): this;
    True(message?: string): this;

    false(message?: string): this;
    False(message?: string): this;

    ok(): this;

    //chain
    an: this;
    of: this;
    a: this;
    and: this;
    be: this;
    been: this;
    has: this;
    have: this;
    with: this;
    is: this;
    which: this;
    the: this;
    it: this;

    //contain
    containEql(obj: any): this;
    containDeepOrdered(obj: any): this;
    containDeep(obj: any): this;

    // eql
    eql(obj: any, description?: string): this;
    eqls(obj: any, description?: string): this;
    deepEqual(obj: any, description?: string): this;

    equal(obj: any, description?: string): this;
    equals(obj: any, description?: string): this;
    exactly(obj: any, description?: string): this;

    equalOneOf(...objs: any[]): this;
    equalOneOf(obj: any[]): this;
    oneOf(...objs: any[]): this;
    oneOf(obj: any[]): this;

    //error
    throw(): this;
    throw(msg: RegExp | string | Function, properties?: {}): this;
    throw(properties: {}): this;
    //TODO how to express generators???
    throwError(): this;
    throwError(msg: RegExp | string | Function, properties?: {}): this;
    throwError(properties: {}): this;

    // match
    match(
      obj: RegExp | ((value: any, key: any) => boolean) | ((value: any, key: any) => void) | {},
      description?: string
    ): this;
    matchEach(
      obj: RegExp | ((value: any, key: any) => boolean) | ((value: any, key: any) => void) | {},
      description?: string
    ): this;
    matchEvery(
      obj: RegExp | ((value: any, key: any) => boolean) | ((value: any, key: any) => void) | {},
      description?: string
    ): this;
    matchAny(
      obj: RegExp | ((value: any, key: any) => boolean) | ((value: any, key: any) => void) | {},
      description?: string
    ): this;
    matchSome(
      obj: RegExp | ((value: any, key: any) => boolean) | ((value: any, key: any) => void) | {},
      description?: string
    ): this;

    //number
    NaN(): this;
    Infinity(): this;
    within(start: number, finish: number, description?: string): this;
    approximately(value: number, delta: number, description?: string): this;
    above(value: number, description?: string): this;
    greaterThan(value: number, description?: string): this;
    below(value: number, description?: string): this;
    lessThan(value: number, description?: string): this;
    aboveOrEqual(value: number, description?: string): this;
    greaterThanOrEqual(value: number, description?: string): this;
    belowOrEqual(value: number, description?: string): this;
    lessThanOrEqual(value: number, description?: string): this;

    //promise
    Promise(): this;

    fulfilled(): Promise<any>;
    resolved(): Promise<any>;
    rejected(): Promise<any>;

    fulfilledWith(obj: any): Promise<any>;
    resolvedWith(obj: any): Promise<any>;
    rejectedWith(msg: RegExp | string | Error, properties?: {}): Promise<any>;
    rejectedWith(properties: {}): Promise<any>;
    finally: PromisedAssertion;
    eventually: PromisedAssertion;

    // property
    propertyWithDescriptor(name: string, descriptor: {}): this;

    property(name: string, value?: any): this;
    properties(...names: string[]): this;
    properties(names: string[]): this;
    properties(props: {}): this;

    length(value: number, description?: string): this;
    lengthOf(value: number, description?: string): this;

    ownProperty(name: string, description?: string): this;
    hasOwnProperty(name: string, description?: string): this;

    empty(): this;

    keys(...keys: any[]): this;
    key(key: any): this;

    value(key: any, value: any): this;

    size(value: number): this;

    propertyByPath(...path: string[]): this;
    propertyByPath(path: string[]): this;

    //string
    startWith(prefix: string, description?: string): this;
    endWith(postfix: string, description?: string): this;

    //type
    Number(): this;
    arguments(): this;
    Arguments(): this;
    type(typeName: string, description?: string): this;
    instanceof(constructor: Function, description?: string): this;
    instanceOf(constructor: Function, description?: string): this;
    Function(): this;
    Object(): this;
    String(): this;
    Array(): this;
    Boolean(): this;
    Error(): this;
    Date(): this;
    null(): this;
    Null(): this;
    class(className: string): this;
    Class(className: string): this;
    undefined(): this;
    Undefined(): this;
    iterable(): this;
    iterator(): this;
    generator(): this;
  }

  interface PromisedAssertion extends Assertion, PromiseLike<any> {}
}

declare global {
  interface Object {
    should: should.Assertion;
  }
}

export as namespace should;

export = should;
