// Type definitions for Jest 29.5
// Project: https://jestjs.io/
// Definitions by: Asana (https://asana.com)
//                 Ivo Stratev <https://github.com/NoHomey>
//                 jwbay <https://github.com/jwbay>
//                 Alexey Svetliakov <https://github.com/asvetliakov>
//                 Alex Jover Morales <https://github.com/alexjoverm>
//                 Allan Lukwago <https://github.com/epicallan>
//                 Ika <https://github.com/ikatyang>
//                 Waseem Dahman <https://github.com/wsmd>
//                 Jamie Mason <https://github.com/JamieMason>
//                 Douglas Duteil <https://github.com/douglasduteil>
//                 Ahn <https://github.com/ahnpnl>
//                 Jeff Lau <https://github.com/UselessPickles>
//                 Andrew Makarov <https://github.com/r3nya>
//                 Martin Hochel <https://github.com/hotell>
//                 Sebastian Sebald <https://github.com/sebald>
//                 Andy <https://github.com/andys8>
//                 Antoine Brault <https://github.com/antoinebrault>
//                 Gregor Stamać <https://github.com/gstamac>
//                 ExE Boss <https://github.com/ExE-Boss>
//                 Alex Bolenok <https://github.com/quassnoi>
//                 Mario Beltrán Alarcón <https://github.com/Belco90>
//                 Tony Hallett <https://github.com/tonyhallett>
//                 Jason Yu <https://github.com/ycmjason>
//                 Pawel Fajfer <https://github.com/pawfa>
//                 Alexandre Germain <https://github.com/gerkindev>
//                 Adam Jones <https://github.com/domdomegg>
//                 Tom Mrazauskas <https://github.com/mrazauskas>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// Minimum TypeScript Version: 4.3

declare var beforeAll: jest.Lifecycle;
declare var beforeEach: jest.Lifecycle;
declare var afterAll: jest.Lifecycle;
declare var afterEach: jest.Lifecycle;
declare var describe: jest.Describe;
declare var fdescribe: jest.Describe;
declare var xdescribe: jest.Describe;
declare var it: jest.It;
declare var fit: jest.It;
declare var xit: jest.It;
declare var test: jest.It;
declare var xtest: jest.It;

declare const expect: jest.Expect;

// Remove once https://github.com/microsoft/TypeScript/issues/53255 is fixed.
type ExtractEachCallbackArgs<T extends ReadonlyArray<any>> = {
    1: [T[0]];
    2: [T[0], T[1]];
    3: [T[0], T[1], T[2]];
    4: [T[0], T[1], T[2], T[3]];
    5: [T[0], T[1], T[2], T[3], T[4]];
    6: [T[0], T[1], T[2], T[3], T[4], T[5]];
    7: [T[0], T[1], T[2], T[3], T[4], T[5], T[6]];
    8: [T[0], T[1], T[2], T[3], T[4], T[5], T[6], T[7]];
    9: [T[0], T[1], T[2], T[3], T[4], T[5], T[6], T[7], T[8]];
    10: [T[0], T[1], T[2], T[3], T[4], T[5], T[6], T[7], T[8], T[9]];
    fallback: Array<T extends ReadonlyArray<infer U> ? U : any>;
}[T extends Readonly<[any]>
    ? 1
    : T extends Readonly<[any, any]>
    ? 2
    : T extends Readonly<[any, any, any]>
    ? 3
    : T extends Readonly<[any, any, any, any]>
    ? 4
    : T extends Readonly<[any, any, any, any, any]>
    ? 5
    : T extends Readonly<[any, any, any, any, any, any]>
    ? 6
    : T extends Readonly<[any, any, any, any, any, any, any]>
    ? 7
    : T extends Readonly<[any, any, any, any, any, any, any, any]>
    ? 8
    : T extends Readonly<[any, any, any, any, any, any, any, any, any]>
    ? 9
    : T extends Readonly<[any, any, any, any, any, any, any, any, any, any]>
    ? 10
    : 'fallback'];

type FakeableAPI =
    | 'Date'
    | 'hrtime'
    | 'nextTick'
    | 'performance'
    | 'queueMicrotask'
    | 'requestAnimationFrame'
    | 'cancelAnimationFrame'
    | 'requestIdleCallback'
    | 'cancelIdleCallback'
    | 'setImmediate'
    | 'clearImmediate'
    | 'setInterval'
    | 'clearInterval'
    | 'setTimeout'
    | 'clearTimeout';

interface FakeTimersConfig {
    /**
     * If set to `true` all timers will be advanced automatically
     * by 20 milliseconds every 20 milliseconds. A custom time delta
     * may be provided by passing a number.
     *
     * @defaultValue
     * The default is `false`.
     */
    advanceTimers?: boolean | number;
    /**
     * List of names of APIs (e.g. `Date`, `nextTick()`, `setImmediate()`,
     * `setTimeout()`) that should not be faked.
     *
     * @defaultValue
     * The default is `[]`, meaning all APIs are faked.
     */
    doNotFake?: FakeableAPI[];
    /**
     * Sets current system time to be used by fake timers.
     *
     * @defaultValue
     * The default is `Date.now()`.
     */
    now?: number | Date;
    /**
     * The maximum number of recursive timers that will be run when calling
     * `jest.runAllTimers()`.
     *
     * @defaultValue
     * The default is `100_000` timers.
     */
    timerLimit?: number;
    /**
     * Use the old fake timers implementation instead of one backed by
     * [`@sinonjs/fake-timers`](https://github.com/sinonjs/fake-timers).
     *
     * @defaultValue
     * The default is `false`.
     */
    legacyFakeTimers?: false;
}

interface LegacyFakeTimersConfig {
    /**
     * Use the old fake timers implementation instead of one backed by
     * [`@sinonjs/fake-timers`](https://github.com/sinonjs/fake-timers).
     *
     * @defaultValue
     * The default is `false`.
     */
    legacyFakeTimers?: true;
}

declare namespace jest {
    /**
     * Disables automatic mocking in the module loader.
     */
    function autoMockOff(): typeof jest;
    /**
     * Enables automatic mocking in the module loader.
     */
    function autoMockOn(): typeof jest;
    /**
     * Clears the mock.calls and mock.instances properties of all mocks.
     * Equivalent to calling .mockClear() on every mocked function.
     */
    function clearAllMocks(): typeof jest;
    /**
     * Use the automatic mocking system to generate a mocked version of the given module.
     */
    // eslint-disable-next-line no-unnecessary-generics
    function createMockFromModule<T>(moduleName: string): T;
    /**
     * Resets the state of all mocks.
     * Equivalent to calling .mockReset() on every mocked function.
     */
    function resetAllMocks(): typeof jest;
    /**
     * Restores all mocks and replaced properties back to their original value.
     * Equivalent to calling `.mockRestore()` on every mocked function
     * and `.restore()` on every replaced property.
     *
     * Beware that `jest.restoreAllMocks()` only works when the mock was created
     * with `jest.spyOn()`; other mocks will require you to manually restore them.
     */
    function restoreAllMocks(): typeof jest;
    /**
     * Removes any pending timers from the timer system. If any timers have
     * been scheduled, they will be cleared and will never have the opportunity
     * to execute in the future.
     */
    function clearAllTimers(): void;
    /**
     * Returns the number of fake timers still left to run.
     */
    function getTimerCount(): number;
    /**
     * Set the current system time used by fake timers. Simulates a user
     * changing the system clock while your program is running. It affects the
     * current time but it does not in itself cause e.g. timers to fire; they
     * will fire exactly as they would have done without the call to
     * jest.setSystemTime().
     *
     * > Note: This function is only available when using modern fake timers
     * > implementation
     */
    function setSystemTime(now?: number | Date): void;
    /**
     * When mocking time, Date.now() will also be mocked. If you for some
     * reason need access to the real current time, you can invoke this
     * function.
     *
     * > Note: This function is only available when using modern fake timers
     * > implementation
     */
    function getRealSystemTime(): number;
    /**
     * Retrieves the seed value. It will be randomly generated for each test run
     * or can be manually set via the `--seed` CLI argument.
     */
    function getSeed(): number;
    /**
     * Returns the current time in ms of the fake timer clock.
     */
    function now(): number;
    /**
     * Indicates that the module system should never return a mocked version
     * of the specified module, including all of the specified module's dependencies.
     */
    function deepUnmock(moduleName: string): typeof jest;
    /**
     * Disables automatic mocking in the module loader.
     */
    function disableAutomock(): typeof jest;
    /**
     * Mocks a module with an auto-mocked version when it is being required.
     */
    // eslint-disable-next-line no-unnecessary-generics
    function doMock<T = unknown>(moduleName: string, factory?: () => T, options?: MockOptions): typeof jest;
    /**
     * Indicates that the module system should never return a mocked version
     * of the specified module from require() (e.g. that it should always return the real module).
     */
    function dontMock(moduleName: string): typeof jest;
    /**
     * Enables automatic mocking in the module loader.
     */
    function enableAutomock(): typeof jest;
    /**
     * Creates a mock function. Optionally takes a mock implementation.
     */
    function fn(): Mock;
    /**
     * Creates a mock function. Optionally takes a mock implementation.
     */
    function fn<T, Y extends any[], C = any>(implementation?: (this: C, ...args: Y) => T): Mock<T, Y, C>;
    /**
     * (renamed to `createMockFromModule` in Jest 26.0.0+)
     * Use the automatic mocking system to generate a mocked version of the given module.
     */
    // eslint-disable-next-line no-unnecessary-generics
    function genMockFromModule<T>(moduleName: string): T;
    /**
     * Returns `true` if test environment has been torn down.
     *
     * @example
     *
     * if (jest.isEnvironmentTornDown()) {
     *   // The Jest environment has been torn down, so stop doing work
     *   return;
     * }
     */
    function isEnvironmentTornDown(): boolean;
    /**
     * Returns whether the given function is a mock function.
     */
    function isMockFunction(fn: any): fn is Mock;
    /**
     * Mocks a module with an auto-mocked version when it is being required.
     */
    // eslint-disable-next-line no-unnecessary-generics
    function mock<T = unknown>(moduleName: string, factory?: () => T, options?: MockOptions): typeof jest;
    /**
     * Wraps types of the `source` object and its deep members with type definitions
     * of Jest mock function. Pass `{shallow: true}` option to disable the deeply
     * mocked behavior.
     */
    function mocked<T>(source: T, options?: { shallow: false }): MaybeMockedDeep<T>;
    /**
     * Wraps types of the `source` object with type definitions of Jest mock function.
     */
    function mocked<T>(source: T, options: { shallow: true }): MaybeMocked<T>;
    /**
     * Returns the actual module instead of a mock, bypassing all checks on
     * whether the module should receive a mock implementation or not.
     */
    // eslint-disable-next-line no-unnecessary-generics
    function requireActual<TModule extends {} = any>(moduleName: string): TModule;
    /**
     * Returns a mock module instead of the actual module, bypassing all checks
     * on whether the module should be required normally or not.
     */
    // eslint-disable-next-line no-unnecessary-generics
    function requireMock<TModule extends {} = any>(moduleName: string): TModule;
    /**
     * Resets the module registry - the cache of all required modules. This is
     * useful to isolate modules where local state might conflict between tests.
     */
    function resetModules(): typeof jest;
    /**
     * Creates a sandbox registry for the modules that are loaded inside the callback function.
     * This is useful to isolate specific modules for every test so that local module state doesn't conflict between tests.
     */
    function isolateModules(fn: () => void): typeof jest;
    /**
     * Equivalent of `jest.isolateModules()` for async functions to be wrapped.
     * The caller is expected to `await` the completion of `jest.isolateModulesAsync()`.
     */
    function isolateModulesAsync(fn: () => Promise<void>): Promise<void>;
    /**
     * Runs failed tests n-times until they pass or until the max number of retries is exhausted.
     * This only works with jest-circus!
     */
    function retryTimes(numRetries: number, options?: { logErrorsBeforeRetry?: boolean }): typeof jest;
    /**
     * Replaces property on an object with another value.
     *
     * @remarks
     * For mocking functions, and 'get' or 'set' accessors, use `jest.spyOn()` instead.
     */
    function replaceProperty<T extends object, K extends keyof T>(obj: T, key: K, value: T[K]): ReplaceProperty<T[K]>;
    /**
     * Exhausts tasks queued by `setImmediate()`.
     *
     * @remarks
     * This function is only available when using legacy fake timers implementation.
     */
    function runAllImmediates(): void;
    /**
     * Exhausts the micro-task queue (i.e., tasks in Node.js scheduled with `process.nextTick()`).
     */
    function runAllTicks(): void;
    /**
     * Exhausts both the macro-task queue (i.e., tasks queued by `setTimeout()`, `setInterval()`
     * and `setImmediate()`) and the micro-task queue (i.e., tasks in Node.js scheduled with
     * `process.nextTick()`).
     */
    function runAllTimers(): void;
    /**
     * Asynchronous equivalent of `jest.runAllTimers()`. It also yields to the event loop,
     * allowing any scheduled promise callbacks to execute _before_ running the timers.
     *
     * @remarks
     * Not available when using legacy fake timers implementation.
     */
    function runAllTimersAsync(): Promise<void>;
    /**
     * Executes only the macro-tasks that are currently pending (i.e., only the tasks that
     * have been queued by `setTimeout()`, `setInterval()` and `setImmediate()` up to this point).
     */
    function runOnlyPendingTimers(): void;
    /**
     * Asynchronous equivalent of `jest.runOnlyPendingTimers()`. It also yields to the event loop,
     * allowing any scheduled promise callbacks to execute _before_ running the timers.
     *
     * @remarks
     * Not available when using legacy fake timers implementation.
     */
    function runOnlyPendingTimersAsync(): Promise<void>;
    /**
     * Advances all timers by `msToRun` milliseconds. All pending macro-tasks that have been
     * queued by `setTimeout()`, `setInterval()` and `setImmediate()`, and would be executed
     * within this time frame will be executed.
     */
    function advanceTimersByTime(msToRun: number): void;
    /**
     * Asynchronous equivalent of `jest.advanceTimersByTime()`. It also yields to the event loop,
     * allowing any scheduled promise callbacks to execute _before_ running the timers.
     *
     * @remarks
     * Not available when using legacy fake timers implementation.
     */
    function advanceTimersByTimeAsync(msToRun: number): Promise<void>;
    /**
     * Advances all timers by the needed milliseconds so that only the next timeouts/intervals will run.
     * Optionally, you can provide steps, so it will run steps amount of next timeouts/intervals.
     */
    function advanceTimersToNextTimer(step?: number): void;
    /**
     * Asynchronous equivalent of `jest.advanceTimersToNextTimer()`. It also yields to the event loop,
     * allowing any scheduled promise callbacks to execute _before_ running the timers.
     *
     * @remarks
     * Not available when using legacy fake timers implementation.
     */
    function advanceTimersToNextTimerAsync(steps?: number): Promise<void>;
    /**
     * Explicitly supplies the mock object that the module system should return
     * for the specified module.
     */
    // eslint-disable-next-line no-unnecessary-generics
    function setMock<T>(moduleName: string, moduleExports: T): typeof jest;
    /**
     * Set the default timeout interval for tests and before/after hooks in milliseconds.
     * Note: The default timeout interval is 5 seconds if this method is not called.
     */
    function setTimeout(timeout: number): typeof jest;
    /**
     * Creates a mock function similar to jest.fn but also tracks calls to `object[methodName]`
     *
     * Note: By default, jest.spyOn also calls the spied method. This is different behavior from most
     * other test libraries.
     *
     * @example
     *
     * const video = require('./video');
     *
     * test('plays video', () => {
     *   const spy = jest.spyOn(video, 'play');
     *   const isPlaying = video.play();
     *
     *   expect(spy).toHaveBeenCalled();
     *   expect(isPlaying).toBe(true);
     *
     *   spy.mockReset();
     *   spy.mockRestore();
     * });
     */
    function spyOn<
        T extends {},
        Key extends keyof T,
        A extends PropertyAccessors<Key, T> = PropertyAccessors<Key, T>,
        Value extends Required<T>[Key] = Required<T>[Key],
    >(
        object: T,
        method: Key,
        accessType: A,
    ): A extends SetAccessor
        ? SpyInstance<void, [Value]>
        : A extends GetAccessor
        ? SpyInstance<Value, []>
        : Value extends Constructor
        ? SpyInstance<InstanceType<Value>, ConstructorArgsType<Value>>
        : Value extends Func
        ? SpyInstance<ReturnType<Value>, ArgsType<Value>>
        : never;
    function spyOn<T extends {}, M extends ConstructorPropertyNames<Required<T>>>(
        object: T,
        method: M,
    ): ConstructorProperties<Required<T>>[M] extends new (...args: any[]) => any
        ? SpyInstance<
              InstanceType<ConstructorProperties<Required<T>>[M]>,
              ConstructorArgsType<ConstructorProperties<Required<T>>[M]>
          >
        : never;
    function spyOn<T extends {}, M extends FunctionPropertyNames<Required<T>>>(
        object: T,
        method: M,
    ): FunctionProperties<Required<T>>[M] extends Func
        ? SpyInstance<ReturnType<FunctionProperties<Required<T>>[M]>, ArgsType<FunctionProperties<Required<T>>[M]>>
        : never;
    /**
     * Indicates that the module system should never return a mocked version of
     * the specified module from require() (e.g. that it should always return the real module).
     */
    function unmock(moduleName: string): typeof jest;
    /**
     * Instructs Jest to use fake versions of the standard timer functions.
     */
    function useFakeTimers(config?: FakeTimersConfig | LegacyFakeTimersConfig): typeof jest;
    /**
     * Instructs Jest to use the real versions of the standard timer functions.
     */
    function useRealTimers(): typeof jest;

    interface MockOptions {
        virtual?: boolean | undefined;
    }

    type MockableFunction = (...args: any[]) => any;
    type MethodKeysOf<T> = { [K in keyof T]: T[K] extends MockableFunction ? K : never }[keyof T];
    type PropertyKeysOf<T> = { [K in keyof T]: T[K] extends MockableFunction ? never : K }[keyof T];
    type ArgumentsOf<T> = T extends (...args: infer A) => any ? A : never;
    type ConstructorArgumentsOf<T> = T extends new (...args: infer A) => any ? A : never;
    type ConstructorReturnType<T> = T extends new (...args: any) => infer C ? C : any;

    interface MockWithArgs<T extends MockableFunction>
        extends MockInstance<ReturnType<T>, ArgumentsOf<T>, ConstructorReturnType<T>> {
        new (...args: ConstructorArgumentsOf<T>): T;
        (...args: ArgumentsOf<T>): ReturnType<T>;
    }
    type MaybeMockedConstructor<T> = T extends new (...args: any[]) => infer R
        ? MockInstance<R, ConstructorArgumentsOf<T>, R>
        : T;
    type MockedFn<T extends MockableFunction> = MockWithArgs<T> & { [K in keyof T]: T[K] };
    type MockedFunctionDeep<T extends MockableFunction> = MockWithArgs<T> & MockedObjectDeep<T>;
    type MockedObject<T> = MaybeMockedConstructor<T> & {
        [K in MethodKeysOf<T>]: T[K] extends MockableFunction ? MockedFn<T[K]> : T[K];
    } & { [K in PropertyKeysOf<T>]: T[K] };
    type MockedObjectDeep<T> = MaybeMockedConstructor<T> & {
        [K in MethodKeysOf<T>]: T[K] extends MockableFunction ? MockedFunctionDeep<T[K]> : T[K];
    } & { [K in PropertyKeysOf<T>]: MaybeMockedDeep<T[K]> };
    type MaybeMockedDeep<T> = T extends MockableFunction
        ? MockedFunctionDeep<T>
        : T extends object // eslint-disable-line @typescript-eslint/ban-types
        ? MockedObjectDeep<T>
        : T;
    // eslint-disable-next-line @typescript-eslint/ban-types
    type MaybeMocked<T> = T extends MockableFunction ? MockedFn<T> : T extends object ? MockedObject<T> : T;
    type EmptyFunction = () => void;
    type ArgsType<T> = T extends (...args: infer A) => any ? A : never;
    type Constructor = new (...args: any[]) => any;
    type Func = (...args: any[]) => any;
    type ConstructorArgsType<T> = T extends new (...args: infer A) => any ? A : never;
    type RejectedValue<T> = T extends PromiseLike<any> ? any : never;
    type ResolvedValue<T> = T extends PromiseLike<infer U> ? U | T : never;
    // see https://github.com/Microsoft/TypeScript/issues/25215
    type NonFunctionPropertyNames<T> = keyof { [K in keyof T as T[K] extends Func ? never : K]: T[K] };
    type GetAccessor = 'get';
    type SetAccessor = 'set';
    type PropertyAccessors<M extends keyof T, T extends {}> = M extends NonFunctionPropertyNames<Required<T>>
        ? GetAccessor | SetAccessor
        : never;
    type FunctionProperties<T> = { [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K] };
    type FunctionPropertyNames<T> = keyof FunctionProperties<T>;
    type RemoveIndex<T> = {
        // from https://stackoverflow.com/a/66252656/4536543
        [P in keyof T as string extends P ? never : number extends P ? never : P]: T[P];
    };
    type ConstructorProperties<T> = {
        [K in keyof RemoveIndex<T> as RemoveIndex<T>[K] extends Constructor ? K : never]: RemoveIndex<T>[K];
    };
    type ConstructorPropertyNames<T> = RemoveIndex<keyof ConstructorProperties<T>>;

    interface DoneCallback {
        (...args: any[]): any;
        fail(error?: string | { message: string }): any;
    }

    type ProvidesCallback = ((cb: DoneCallback) => void | undefined) | (() => PromiseLike<unknown>);
    type ProvidesHookCallback = (() => any) | ProvidesCallback;

    type Lifecycle = (fn: ProvidesHookCallback, timeout?: number) => any;

    interface FunctionLike {
        readonly name: string;
    }

    interface Each {
        // Exclusively arrays.
        <T extends any[] | [any]>(cases: ReadonlyArray<T>): (
            name: string,
            fn: (...args: T) => any,
            timeout?: number,
        ) => void;
        <T extends ReadonlyArray<any>>(cases: ReadonlyArray<T>): (
            name: string,
            fn: (...args: ExtractEachCallbackArgs<T>) => any,
            timeout?: number,
        ) => void;
        // Not arrays.
        <T>(cases: ReadonlyArray<T>): (name: string, fn: (arg: T, done: DoneCallback) => any, timeout?: number) => void;
        (cases: ReadonlyArray<ReadonlyArray<any>>): (
            name: string,
            fn: (...args: any[]) => any,
            timeout?: number,
        ) => void;
        (strings: TemplateStringsArray, ...placeholders: any[]): (
            name: string,
            fn: (arg: any, done: DoneCallback) => any,
            timeout?: number,
        ) => void;
    }

    /**
     * Creates a test closure
     */
    interface It {
        /**
         * Creates a test closure.
         *
         * @param name The name of your test
         * @param fn The function for your test
         * @param timeout The timeout for an async function test
         */
        (name: string, fn?: ProvidesCallback, timeout?: number): void;
        /**
         * Only runs this test in the current file.
         */
        only: It;
        /**
         * Mark this test as expecting to fail.
         *
         * Only available in the default `jest-circus` runner.
         */
        failing: It;
        /**
         * Skips running this test in the current file.
         */
        skip: It;
        /**
         * Sketch out which tests to write in the future.
         */
        todo: It;
        /**
         * Experimental and should be avoided.
         */
        concurrent: It;
        /**
         * Use if you keep duplicating the same test with different data. `.each` allows you to write the
         * test once and pass data in.
         *
         * `.each` is available with two APIs:
         *
         * #### 1  `test.each(table)(name, fn)`
         *
         * - `table`: Array of Arrays with the arguments that are passed into the test fn for each row.
         * - `name`: String the title of the test block.
         * - `fn`: Function the test to be ran, this is the function that will receive the parameters in each row as function arguments.
         *
         *
         * #### 2  `test.each table(name, fn)`
         *
         * - `table`: Tagged Template Literal
         * - `name`: String the title of the test, use `$variable` to inject test data into the test title from the tagged template expressions.
         * - `fn`: Function the test to be ran, this is the function that will receive the test data object..
         *
         * @example
         *
         * // API 1
         * test.each([[1, 1, 2], [1, 2, 3], [2, 1, 3]])(
         *   '.add(%i, %i)',
         *   (a, b, expected) => {
         *     expect(a + b).toBe(expected);
         *   },
         * );
         *
         * // API 2
         * test.each`
         * a    | b    | expected
         * ${1} | ${1} | ${2}
         * ${1} | ${2} | ${3}
         * ${2} | ${1} | ${3}
         * `('returns $expected when $a is added $b', ({a, b, expected}) => {
         *    expect(a + b).toBe(expected);
         * });
         *
         */
        each: Each;
    }

    interface Describe {
        // tslint:disable-next-line ban-types
        (name: number | string | Function | FunctionLike, fn: EmptyFunction): void;
        /** Only runs the tests inside this `describe` for the current file */
        only: Describe;
        /** Skips running the tests inside this `describe` for the current file */
        skip: Describe;
        each: Each;
    }

    type EqualityTester = (a: any, b: any) => boolean | undefined;

    type MatcherUtils = import('expect').MatcherUtils & { [other: string]: any };

    interface ExpectExtendMap {
        [key: string]: CustomMatcher;
    }

    type MatcherContext = MatcherUtils & Readonly<MatcherState>;
    type CustomMatcher = (
        this: MatcherContext,
        received: any,
        ...actual: any[]
    ) => CustomMatcherResult | Promise<CustomMatcherResult>;

    interface CustomMatcherResult {
        pass: boolean;
        message: () => string;
    }

    type SnapshotSerializerPlugin = import('pretty-format').Plugin;

    interface InverseAsymmetricMatchers {
        /**
         * `expect.not.arrayContaining(array)` matches a received array which
         * does not contain all of the elements in the expected array. That is,
         * the expected array is not a subset of the received array. It is the
         * inverse of `expect.arrayContaining`.
         *
         * Optionally, you can provide a type for the elements via a generic.
         */
        // eslint-disable-next-line no-unnecessary-generics
        arrayContaining<E = any>(arr: readonly E[]): any;
        /**
         * `expect.not.objectContaining(object)` matches any received object
         * that does not recursively match the expected properties. That is, the
         * expected object is not a subset of the received object. Therefore,
         * it matches a received object which contains properties that are not
         * in the expected object. It is the inverse of `expect.objectContaining`.
         *
         * Optionally, you can provide a type for the object via a generic.
         * This ensures that the object contains the desired structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        objectContaining<E = {}>(obj: E): any;
        /**
         * `expect.not.stringMatching(string | regexp)` matches the received
         * string that does not match the expected regexp. It is the inverse of
         * `expect.stringMatching`.
         */
        stringMatching(str: string | RegExp): any;
        /**
         * `expect.not.stringContaining(string)` matches the received string
         * that does not contain the exact expected string. It is the inverse of
         * `expect.stringContaining`.
         */
        stringContaining(str: string): any;
    }
    type MatcherState = import('expect').MatcherState;
    /**
     * The `expect` function is used every time you want to test a value.
     * You will rarely call `expect` by itself.
     */
    interface Expect {
        /**
         * The `expect` function is used every time you want to test a value.
         * You will rarely call `expect` by itself.
         *
         * @param actual The value to apply matchers against.
         */
        <T = any>(actual: T): JestMatchers<T>;
        /**
         * Matches anything but null or undefined. You can use it inside `toEqual` or `toBeCalledWith` instead
         * of a literal value. For example, if you want to check that a mock function is called with a
         * non-null argument:
         *
         * @example
         *
         * test('map calls its argument with a non-null argument', () => {
         *   const mock = jest.fn();
         *   [1].map(x => mock(x));
         *   expect(mock).toBeCalledWith(expect.anything());
         * });
         *
         */
        anything(): any;
        /**
         * Matches anything that was created with the given constructor.
         * You can use it inside `toEqual` or `toBeCalledWith` instead of a literal value.
         *
         * @example
         *
         * function randocall(fn) {
         *   return fn(Math.floor(Math.random() * 6 + 1));
         * }
         *
         * test('randocall calls its callback with a number', () => {
         *   const mock = jest.fn();
         *   randocall(mock);
         *   expect(mock).toBeCalledWith(expect.any(Number));
         * });
         */
        any(classType: any): any;
        /**
         * Matches any array made up entirely of elements in the provided array.
         * You can use it inside `toEqual` or `toBeCalledWith` instead of a literal value.
         *
         * Optionally, you can provide a type for the elements via a generic.
         */
        // eslint-disable-next-line no-unnecessary-generics
        arrayContaining<E = any>(arr: readonly E[]): any;
        /**
         * Verifies that a certain number of assertions are called during a test.
         * This is often useful when testing asynchronous code, in order to
         * make sure that assertions in a callback actually got called.
         */
        assertions(num: number): void;
        /**
         * Useful when comparing floating point numbers in object properties or array item.
         * If you need to compare a number, use `.toBeCloseTo` instead.
         *
         * The optional `numDigits` argument limits the number of digits to check after the decimal point.
         * For the default value 2, the test criterion is `Math.abs(expected - received) < 0.005` (that is, `10 ** -2 / 2`).
         */
        closeTo(num: number, numDigits?: number): any;
        /**
         * Verifies that at least one assertion is called during a test.
         * This is often useful when testing asynchronous code, in order to
         * make sure that assertions in a callback actually got called.
         */
        hasAssertions(): void;
        /**
         * You can use `expect.extend` to add your own matchers to Jest.
         */
        extend(obj: ExpectExtendMap): void;
        /**
         * Adds a module to format application-specific data structures for serialization.
         */
        addSnapshotSerializer(serializer: SnapshotSerializerPlugin): void;
        /**
         * Matches any object that recursively matches the provided keys.
         * This is often handy in conjunction with other asymmetric matchers.
         *
         * Optionally, you can provide a type for the object via a generic.
         * This ensures that the object contains the desired structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        objectContaining<E = {}>(obj: E): any;
        /**
         * Matches any string that contains the exact provided string
         */
        stringMatching(str: string | RegExp): any;
        /**
         * Matches any received string that contains the exact expected string
         */
        stringContaining(str: string): any;

        not: InverseAsymmetricMatchers;

        setState(state: object): void;
        getState(): MatcherState & Record<string, any>;
    }

    type JestMatchers<T> = JestMatchersShape<Matchers<void, T>, Matchers<Promise<void>, T>>;

    type JestMatchersShape<TNonPromise extends {} = {}, TPromise extends {} = {}> = {
        /**
         * Use resolves to unwrap the value of a fulfilled promise so any other
         * matcher can be chained. If the promise is rejected the assertion fails.
         */
        resolves: AndNot<TPromise>;
        /**
         * Unwraps the reason of a rejected promise so any other matcher can be chained.
         * If the promise is fulfilled the assertion fails.
         */
        rejects: AndNot<TPromise>;
    } & AndNot<TNonPromise>;
    type AndNot<T> = T & {
        not: T;
    };

    // should be R extends void|Promise<void> but getting dtslint error
    interface Matchers<R, T = {}> {
        /**
         * Ensures the last call to a mock function was provided specific args.
         *
         * Optionally, you can provide a type for the expected arguments via a generic.
         * Note that the type must be either an array or a tuple.
         */
        // eslint-disable-next-line no-unnecessary-generics
        lastCalledWith<E extends any[]>(...args: E): R;
        /**
         * Ensure that the last call to a mock function has returned a specified value.
         *
         * Optionally, you can provide a type for the expected value via a generic.
         * This is particularly useful for ensuring expected objects have the right structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        lastReturnedWith<E = any>(expected?: E): R;
        /**
         * Ensure that a mock function is called with specific arguments on an Nth call.
         *
         * Optionally, you can provide a type for the expected arguments via a generic.
         * Note that the type must be either an array or a tuple.
         */
        // eslint-disable-next-line no-unnecessary-generics
        nthCalledWith<E extends any[]>(nthCall: number, ...params: E): R;
        /**
         * Ensure that the nth call to a mock function has returned a specified value.
         *
         * Optionally, you can provide a type for the expected value via a generic.
         * This is particularly useful for ensuring expected objects have the right structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        nthReturnedWith<E = any>(n: number, expected?: E): R;
        /**
         * Checks that a value is what you expect. It uses `Object.is` to check strict equality.
         * Don't use `toBe` with floating-point numbers.
         *
         * Optionally, you can provide a type for the expected value via a generic.
         * This is particularly useful for ensuring expected objects have the right structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toBe<E = any>(expected: E): R;
        /**
         * Ensures that a mock function is called.
         */
        toBeCalled(): R;
        /**
         * Ensures that a mock function is called an exact number of times.
         */
        toBeCalledTimes(expected: number): R;
        /**
         * Ensure that a mock function is called with specific arguments.
         *
         * Optionally, you can provide a type for the expected arguments via a generic.
         * Note that the type must be either an array or a tuple.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toBeCalledWith<E extends any[]>(...args: E): R;
        /**
         * Using exact equality with floating point numbers is a bad idea.
         * Rounding means that intuitive things fail.
         * The default for numDigits is 2.
         */
        toBeCloseTo(expected: number, numDigits?: number): R;
        /**
         * Ensure that a variable is not undefined.
         */
        toBeDefined(): R;
        /**
         * When you don't care what a value is, you just want to
         * ensure a value is false in a boolean context.
         */
        toBeFalsy(): R;
        /**
         * For comparing floating point or big integer numbers.
         */
        toBeGreaterThan(expected: number | bigint): R;
        /**
         * For comparing floating point or big integer numbers.
         */
        toBeGreaterThanOrEqual(expected: number | bigint): R;
        /**
         * Ensure that an object is an instance of a class.
         * This matcher uses `instanceof` underneath.
         *
         * Optionally, you can provide a type for the expected value via a generic.
         * This is particularly useful for ensuring expected objects have the right structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toBeInstanceOf<E = any>(expected: E): R;
        /**
         * For comparing floating point or big integer numbers.
         */
        toBeLessThan(expected: number | bigint): R;
        /**
         * For comparing floating point or big integer numbers.
         */
        toBeLessThanOrEqual(expected: number | bigint): R;
        /**
         * This is the same as `.toBe(null)` but the error messages are a bit nicer.
         * So use `.toBeNull()` when you want to check that something is null.
         */
        toBeNull(): R;
        /**
         * Use when you don't care what a value is, you just want to ensure a value
         * is true in a boolean context. In JavaScript, there are six falsy values:
         * `false`, `0`, `''`, `null`, `undefined`, and `NaN`. Everything else is truthy.
         */
        toBeTruthy(): R;
        /**
         * Used to check that a variable is undefined.
         */
        toBeUndefined(): R;
        /**
         * Used to check that a variable is NaN.
         */
        toBeNaN(): R;
        /**
         * Used when you want to check that an item is in a list.
         * For testing the items in the list, this uses `===`, a strict equality check.
         * It can also check whether a string is a substring of another string.
         *
         * Optionally, you can provide a type for the expected value via a generic.
         * This is particularly useful for ensuring expected objects have the right structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toContain<E = any>(expected: E): R;
        /**
         * Used when you want to check that an item is in a list.
         * For testing the items in the list, this matcher recursively checks the
         * equality of all fields, rather than checking for object identity.
         *
         * Optionally, you can provide a type for the expected value via a generic.
         * This is particularly useful for ensuring expected objects have the right structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toContainEqual<E = any>(expected: E): R;
        /**
         * Used when you want to check that two objects have the same value.
         * This matcher recursively checks the equality of all fields, rather than checking for object identity.
         *
         * Optionally, you can provide a type for the expected value via a generic.
         * This is particularly useful for ensuring expected objects have the right structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toEqual<E = any>(expected: E): R;
        /**
         * Ensures that a mock function is called.
         */
        toHaveBeenCalled(): R;
        /**
         * Ensures that a mock function is called an exact number of times.
         */
        toHaveBeenCalledTimes(expected: number): R;
        /**
         * Ensure that a mock function is called with specific arguments.
         *
         * Optionally, you can provide a type for the expected arguments via a generic.
         * Note that the type must be either an array or a tuple.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toHaveBeenCalledWith<E extends any[]>(...params: E): R;
        /**
         * Ensure that a mock function is called with specific arguments on an Nth call.
         *
         * Optionally, you can provide a type for the expected arguments via a generic.
         * Note that the type must be either an array or a tuple.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toHaveBeenNthCalledWith<E extends any[]>(nthCall: number, ...params: E): R;
        /**
         * If you have a mock function, you can use `.toHaveBeenLastCalledWith`
         * to test what arguments it was last called with.
         *
         * Optionally, you can provide a type for the expected arguments via a generic.
         * Note that the type must be either an array or a tuple.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toHaveBeenLastCalledWith<E extends any[]>(...params: E): R;
        /**
         * Use to test the specific value that a mock function last returned.
         * If the last call to the mock function threw an error, then this matcher will fail
         * no matter what value you provided as the expected return value.
         *
         * Optionally, you can provide a type for the expected value via a generic.
         * This is particularly useful for ensuring expected objects have the right structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toHaveLastReturnedWith<E = any>(expected?: E): R;
        /**
         * Used to check that an object has a `.length` property
         * and it is set to a certain numeric value.
         */
        toHaveLength(expected: number): R;
        /**
         * Use to test the specific value that a mock function returned for the nth call.
         * If the nth call to the mock function threw an error, then this matcher will fail
         * no matter what value you provided as the expected return value.
         *
         * Optionally, you can provide a type for the expected value via a generic.
         * This is particularly useful for ensuring expected objects have the right structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toHaveNthReturnedWith<E = any>(nthCall: number, expected?: E): R;
        /**
         * Use to check if property at provided reference keyPath exists for an object.
         * For checking deeply nested properties in an object you may use dot notation or an array containing
         * the keyPath for deep references.
         *
         * Optionally, you can provide a value to check if it's equal to the value present at keyPath
         * on the target object. This matcher uses 'deep equality' (like `toEqual()`) and recursively checks
         * the equality of all fields.
         *
         * @example
         *
         * expect(houseForSale).toHaveProperty('kitchen.area', 20);
         */
        // eslint-disable-next-line no-unnecessary-generics
        toHaveProperty<E = any>(propertyPath: string | readonly any[], value?: E): R;
        /**
         * Use to test that the mock function successfully returned (i.e., did not throw an error) at least one time
         */
        toHaveReturned(): R;
        /**
         * Use to ensure that a mock function returned successfully (i.e., did not throw an error) an exact number of times.
         * Any calls to the mock function that throw an error are not counted toward the number of times the function returned.
         */
        toHaveReturnedTimes(expected: number): R;
        /**
         * Use to ensure that a mock function returned a specific value.
         *
         * Optionally, you can provide a type for the expected value via a generic.
         * This is particularly useful for ensuring expected objects have the right structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toHaveReturnedWith<E = any>(expected?: E): R;
        /**
         * Check that a string matches a regular expression.
         */
        toMatch(expected: string | RegExp): R;
        /**
         * Used to check that a JavaScript object matches a subset of the properties of an object
         *
         * Optionally, you can provide an object to use as Generic type for the expected value.
         * This ensures that the matching object matches the structure of the provided object-like type.
         *
         * @example
         *
         * type House = {
         *   bath: boolean;
         *   bedrooms: number;
         *   kitchen: {
         *     amenities: string[];
         *     area: number;
         *     wallColor: string;
         *   }
         * };
         *
         * expect(desiredHouse).toMatchObject<House>({...standardHouse, kitchen: {area: 20}}) // wherein standardHouse is some base object of type House
         */
        // eslint-disable-next-line no-unnecessary-generics
        toMatchObject<E extends {} | any[]>(expected: E): R;
        /**
         * This ensures that a value matches the most recent snapshot with property matchers.
         * Check out [the Snapshot Testing guide](http://facebook.github.io/jest/docs/snapshot-testing.html) for more information.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toMatchSnapshot<U extends { [P in keyof T]: any }>(propertyMatchers: Partial<U>, snapshotName?: string): R;
        /**
         * This ensures that a value matches the most recent snapshot.
         * Check out [the Snapshot Testing guide](http://facebook.github.io/jest/docs/snapshot-testing.html) for more information.
         */
        toMatchSnapshot(snapshotName?: string): R;
        /**
         * This ensures that a value matches the most recent snapshot with property matchers.
         * Instead of writing the snapshot value to a .snap file, it will be written into the source code automatically.
         * Check out [the Snapshot Testing guide](http://facebook.github.io/jest/docs/snapshot-testing.html) for more information.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toMatchInlineSnapshot<U extends { [P in keyof T]: any }>(propertyMatchers: Partial<U>, snapshot?: string): R;
        /**
         * This ensures that a value matches the most recent snapshot with property matchers.
         * Instead of writing the snapshot value to a .snap file, it will be written into the source code automatically.
         * Check out [the Snapshot Testing guide](http://facebook.github.io/jest/docs/snapshot-testing.html) for more information.
         */
        toMatchInlineSnapshot(snapshot?: string): R;
        /**
         * Ensure that a mock function has returned (as opposed to thrown) at least once.
         */
        toReturn(): R;
        /**
         * Ensure that a mock function has returned (as opposed to thrown) a specified number of times.
         */
        toReturnTimes(count: number): R;
        /**
         * Ensure that a mock function has returned a specified value at least once.
         *
         * Optionally, you can provide a type for the expected value via a generic.
         * This is particularly useful for ensuring expected objects have the right structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toReturnWith<E = any>(value?: E): R;
        /**
         * Use to test that objects have the same types as well as structure.
         *
         * Optionally, you can provide a type for the expected value via a generic.
         * This is particularly useful for ensuring expected objects have the right structure.
         */
        // eslint-disable-next-line no-unnecessary-generics
        toStrictEqual<E = any>(expected: E): R;
        /**
         * Used to test that a function throws when it is called.
         */
        toThrow(error?: string | Constructable | RegExp | Error): R;
        /**
         * If you want to test that a specific error is thrown inside a function.
         */
        toThrowError(error?: string | Constructable | RegExp | Error): R;
        /**
         * Used to test that a function throws a error matching the most recent snapshot when it is called.
         */
        toThrowErrorMatchingSnapshot(snapshotName?: string): R;
        /**
         * Used to test that a function throws a error matching the most recent snapshot when it is called.
         * Instead of writing the snapshot value to a .snap file, it will be written into the source code automatically.
         */
        toThrowErrorMatchingInlineSnapshot(snapshot?: string): R;
    }

    type RemoveFirstFromTuple<T extends any[]> = T['length'] extends 0
        ? []
        : ((...b: T) => void) extends (a: any, ...b: infer I) => void
        ? I
        : [];

    interface AsymmetricMatcher {
        asymmetricMatch(other: unknown): boolean;
    }
    type NonAsyncMatchers<TMatchers extends ExpectExtendMap> = {
        [K in keyof TMatchers]: ReturnType<TMatchers[K]> extends Promise<CustomMatcherResult> ? never : K;
    }[keyof TMatchers];
    type CustomAsyncMatchers<TMatchers extends ExpectExtendMap> = {
        [K in NonAsyncMatchers<TMatchers>]: CustomAsymmetricMatcher<TMatchers[K]>;
    };
    type CustomAsymmetricMatcher<TMatcher extends (...args: any[]) => any> = (
        ...args: RemoveFirstFromTuple<Parameters<TMatcher>>
    ) => AsymmetricMatcher;

    // should be TMatcherReturn extends void|Promise<void> but getting dtslint error
    type CustomJestMatcher<TMatcher extends (...args: any[]) => any, TMatcherReturn> = (
        ...args: RemoveFirstFromTuple<Parameters<TMatcher>>
    ) => TMatcherReturn;

    type ExpectProperties = {
        [K in keyof Expect]: Expect[K];
    };
    // should be TMatcherReturn extends void|Promise<void> but getting dtslint error
    // Use the `void` type for return types only. Otherwise, use `undefined`. See: https://github.com/Microsoft/dtslint/blob/master/docs/void-return.md
    // have added issue https://github.com/microsoft/dtslint/issues/256 - Cannot have type union containing void ( to be used as return type only
    type ExtendedMatchers<TMatchers extends ExpectExtendMap, TMatcherReturn, TActual> = Matchers<
        TMatcherReturn,
        TActual
    > & { [K in keyof TMatchers]: CustomJestMatcher<TMatchers[K], TMatcherReturn> };
    type JestExtendedMatchers<TMatchers extends ExpectExtendMap, TActual> = JestMatchersShape<
        ExtendedMatchers<TMatchers, void, TActual>,
        ExtendedMatchers<TMatchers, Promise<void>, TActual>
    >;

    // when have called expect.extend
    type ExtendedExpectFunction<TMatchers extends ExpectExtendMap> = <TActual>(
        actual: TActual,
    ) => JestExtendedMatchers<TMatchers, TActual>;

    type ExtendedExpect<TMatchers extends ExpectExtendMap> = ExpectProperties &
        AndNot<CustomAsyncMatchers<TMatchers>> &
        ExtendedExpectFunction<TMatchers>;

    type NonPromiseMatchers<T extends JestMatchersShape<any>> = Omit<T, 'resolves' | 'rejects' | 'not'>;
    type PromiseMatchers<T extends JestMatchersShape> = Omit<T['resolves'], 'not'>;

    interface Constructable {
        new (...args: any[]): any;
    }

    interface Mock<T = any, Y extends any[] = any, C = any> extends Function, MockInstance<T, Y, C> {
        new (...args: Y): T;
        (this: C, ...args: Y): T;
    }

    interface SpyInstance<T = any, Y extends any[] = any, C = any> extends MockInstance<T, Y, C> {}

    /**
     * Constructs the type of a spied class.
     */
    type SpiedClass<T extends abstract new (...args: any) => any> = SpyInstance<
        InstanceType<T>,
        ConstructorParameters<T>,
        T extends abstract new (...args: any) => infer C ? C : never
    >;

    /**
     * Constructs the type of a spied function.
     */
    type SpiedFunction<T extends (...args: any) => any> = SpyInstance<
        ReturnType<T>,
        ArgsType<T>,
        T extends (this: infer C, ...args: any) => any ? C : never
    >;

    /**
     * Constructs the type of a spied getter.
     */
    type SpiedGetter<T> = SpyInstance<T, []>;

    /**
     * Constructs the type of a spied setter.
     */
    type SpiedSetter<T> = SpyInstance<void, [T]>;

    /**
     * Constructs the type of a spied class or function.
     */
    type Spied<T extends (abstract new (...args: any) => any) | ((...args: any) => any)> = T extends abstract new (
        ...args: any
    ) => any
        ? SpiedClass<T>
        : T extends (...args: any) => any
        ? SpiedFunction<T>
        : never;

    /**
     * Wrap a function with mock definitions
     *
     * @example
     *
     *  import { myFunction } from "./library";
     *  jest.mock("./library");
     *
     *  const mockMyFunction = myFunction as jest.MockedFunction<typeof myFunction>;
     *  expect(mockMyFunction.mock.calls[0][0]).toBe(42);
     */
    type MockedFunction<T extends (...args: any[]) => any> = MockInstance<
        ReturnType<T>,
        ArgsType<T>,
        T extends (this: infer C, ...args: any[]) => any ? C : never
    > &
        T;

    /**
     * Wrap a class with mock definitions
     *
     * @example
     *
     *  import { MyClass } from "./library";
     *  jest.mock("./library");
     *
     *  const mockedMyClass = MyClass as jest.MockedClass<typeof MyClass>;
     *
     *  expect(mockedMyClass.mock.calls[0][0]).toBe(42); // Constructor calls
     *  expect(mockedMyClass.prototype.myMethod.mock.calls[0][0]).toBe(42); // Method calls
     */

    type MockedClass<T extends Constructable> = MockInstance<
        InstanceType<T>,
        T extends new (...args: infer P) => any ? P : never,
        T extends new (...args: any[]) => infer C ? C : never
    > & {
        prototype: T extends { prototype: any } ? Mocked<T['prototype']> : never;
    } & T;

    /**
     * Wrap an object or a module with mock definitions
     *
     * @example
     *
     *  jest.mock("../api");
     *  import * as api from "../api";
     *
     *  const mockApi = api as jest.Mocked<typeof api>;
     *  api.MyApi.prototype.myApiMethod.mockImplementation(() => "test");
     */
    type Mocked<T> = {
        [P in keyof T]: T[P] extends (this: infer C, ...args: any[]) => any
            ? MockInstance<ReturnType<T[P]>, ArgsType<T[P]>, C>
            : T[P] extends Constructable
            ? MockedClass<T[P]>
            : T[P];
    } & T;

    interface MockInstance<T, Y extends any[], C = any> {
        /** Returns the mock name string set by calling `mockFn.mockName(value)`. */
        getMockName(): string;
        /** Provides access to the mock's metadata */
        mock: MockContext<T, Y, C>;
        /**
         * Resets all information stored in the mockFn.mock.calls and mockFn.mock.instances arrays.
         *
         * Often this is useful when you want to clean up a mock's usage data between two assertions.
         *
         * Beware that `mockClear` will replace `mockFn.mock`, not just `mockFn.mock.calls` and `mockFn.mock.instances`.
         * You should therefore avoid assigning mockFn.mock to other variables, temporary or not, to make sure you
         * don't access stale data.
         */
        mockClear(): this;
        /**
         * Resets all information stored in the mock, including any initial implementation and mock name given.
         *
         * This is useful when you want to completely restore a mock back to its initial state.
         *
         * Beware that `mockReset` will replace `mockFn.mock`, not just `mockFn.mock.calls` and `mockFn.mock.instances`.
         * You should therefore avoid assigning mockFn.mock to other variables, temporary or not, to make sure you
         * don't access stale data.
         */
        mockReset(): this;
        /**
         * Does everything that `mockFn.mockReset()` does, and also restores the original (non-mocked) implementation.
         *
         * This is useful when you want to mock functions in certain test cases and restore the original implementation in others.
         *
         * Beware that `mockFn.mockRestore` only works when mock was created with `jest.spyOn`. Thus you have to take care of restoration
         * yourself when manually assigning `jest.fn()`.
         *
         * The [`restoreMocks`](https://jestjs.io/docs/en/configuration.html#restoremocks-boolean) configuration option is available
         * to restore mocks automatically between tests.
         */
        mockRestore(): void;
        /**
         * Returns the function that was set as the implementation of the mock (using mockImplementation).
         */
        getMockImplementation(): ((...args: Y) => T) | undefined;
        /**
         * Accepts a function that should be used as the implementation of the mock. The mock itself will still record
         * all calls that go into and instances that come from itself – the only difference is that the implementation
         * will also be executed when the mock is called.
         *
         * Note: `jest.fn(implementation)` is a shorthand for `jest.fn().mockImplementation(implementation)`.
         */
        mockImplementation(fn?: (...args: Y) => T): this;
        /**
         * Accepts a function that will be used as an implementation of the mock for one call to the mocked function.
         * Can be chained so that multiple function calls produce different results.
         *
         * @example
         *
         * const myMockFn = jest
         *   .fn()
         *    .mockImplementationOnce(cb => cb(null, true))
         *    .mockImplementationOnce(cb => cb(null, false));
         *
         * myMockFn((err, val) => console.log(val)); // true
         *
         * myMockFn((err, val) => console.log(val)); // false
         */
        mockImplementationOnce(fn: (...args: Y) => T): this;
        /**
         * Temporarily overrides the default mock implementation within the callback,
         * then restores its previous implementation.
         *
         * @remarks
         * If the callback is async or returns a `thenable`, `withImplementation` will return a promise.
         * Awaiting the promise will await the callback and reset the implementation.
         */
        withImplementation(fn: (...args: Y) => T, callback: () => Promise<unknown>): Promise<void>;
        /**
         * Temporarily overrides the default mock implementation within the callback,
         * then restores its previous implementation.
         */
        withImplementation(fn: (...args: Y) => T, callback: () => void): void;
        /** Sets the name of the mock. */
        mockName(name: string): this;
        /**
         * Just a simple sugar function for:
         *
         * @example
         *
         *   jest.fn(function() {
         *     return this;
         *   });
         */
        mockReturnThis(): this;
        /**
         * Accepts a value that will be returned whenever the mock function is called.
         *
         * @example
         *
         * const mock = jest.fn();
         * mock.mockReturnValue(42);
         * mock(); // 42
         * mock.mockReturnValue(43);
         * mock(); // 43
         */
        mockReturnValue(value: T): this;
        /**
         * Accepts a value that will be returned for one call to the mock function. Can be chained so that
         * successive calls to the mock function return different values. When there are no more
         * `mockReturnValueOnce` values to use, calls will return a value specified by `mockReturnValue`.
         *
         * @example
         *
         * const myMockFn = jest.fn()
         *   .mockReturnValue('default')
         *   .mockReturnValueOnce('first call')
         *   .mockReturnValueOnce('second call');
         *
         * // 'first call', 'second call', 'default', 'default'
         * console.log(myMockFn(), myMockFn(), myMockFn(), myMockFn());
         *
         */
        mockReturnValueOnce(value: T): this;
        /**
         * Simple sugar function for: `jest.fn().mockImplementation(() => Promise.resolve(value));`
         */
        mockResolvedValue(value: ResolvedValue<T>): this;
        /**
         * Simple sugar function for: `jest.fn().mockImplementationOnce(() => Promise.resolve(value));`
         *
         * @example
         *
         * test('async test', async () => {
         *  const asyncMock = jest
         *    .fn()
         *    .mockResolvedValue('default')
         *    .mockResolvedValueOnce('first call')
         *    .mockResolvedValueOnce('second call');
         *
         *  await asyncMock(); // first call
         *  await asyncMock(); // second call
         *  await asyncMock(); // default
         *  await asyncMock(); // default
         * });
         *
         */
        mockResolvedValueOnce(value: ResolvedValue<T>): this;
        /**
         * Simple sugar function for: `jest.fn().mockImplementation(() => Promise.reject(value));`
         *
         * @example
         *
         * test('async test', async () => {
         *   const asyncMock = jest.fn().mockRejectedValue(new Error('Async error'));
         *
         *   await asyncMock(); // throws "Async error"
         * });
         */
        mockRejectedValue(value: RejectedValue<T>): this;

        /**
         * Simple sugar function for: `jest.fn().mockImplementationOnce(() => Promise.reject(value));`
         *
         * @example
         *
         * test('async test', async () => {
         *  const asyncMock = jest
         *    .fn()
         *    .mockResolvedValueOnce('first call')
         *    .mockRejectedValueOnce(new Error('Async error'));
         *
         *  await asyncMock(); // first call
         *  await asyncMock(); // throws "Async error"
         * });
         *
         */
        mockRejectedValueOnce(value: RejectedValue<T>): this;
    }

    /**
     * Represents the result of a single call to a mock function with a return value.
     */
    interface MockResultReturn<T> {
        type: 'return';
        value: T;
    }
    /**
     * Represents the result of a single incomplete call to a mock function.
     */
    interface MockResultIncomplete {
        type: 'incomplete';
        value: undefined;
    }
    /**
     * Represents the result of a single call to a mock function with a thrown error.
     */
    interface MockResultThrow {
        type: 'throw';
        value: any;
    }

    type MockResult<T> = MockResultReturn<T> | MockResultThrow | MockResultIncomplete;

    interface MockContext<T, Y extends any[], C = any> {
        /**
         * List of the call arguments of all calls that have been made to the mock.
         */
        calls: Y[];
        /**
         * List of the call contexts of all calls that have been made to the mock.
         */
        contexts: C[];
        /**
         * List of all the object instances that have been instantiated from the mock.
         */
        instances: T[];
        /**
         * List of the call order indexes of the mock. Jest is indexing the order of
         * invocations of all mocks in a test file. The index is starting with `1`.
         */
        invocationCallOrder: number[];
        /**
         * List of the call arguments of the last call that was made to the mock.
         * If the function was not called, it will return `undefined`.
         */
        lastCall?: Y;
        /**
         * List of the results of all calls that have been made to the mock.
         */
        results: Array<MockResult<T>>;
    }

    interface ReplaceProperty<K> {
        /**
         * Restore property to its original value known at the time of mocking.
         */
        restore(): void;
        /**
         * Change the value of the property.
         */
        replaceValue(value: K): this;
    }
}

// Jest ships with a copy of Jasmine. They monkey-patch its APIs and divergence/deprecation are expected.
// Relevant parts of Jasmine's API are below so they can be changed and removed over time.
// This file can't reference jasmine.d.ts since the globals aren't compatible.

declare function spyOn<T>(object: T, method: keyof T): jasmine.Spy;
/**
 * If you call the function pending anywhere in the spec body,
 * no matter the expectations, the spec will be marked pending.
 */
declare function pending(reason?: string): void;
/**
 * Fails a test when called within one.
 */
declare function fail(error?: any): never;
declare namespace jasmine {
    let DEFAULT_TIMEOUT_INTERVAL: number;
    function clock(): Clock;
    function any(aclass: any): Any;
    function anything(): Any;
    function arrayContaining(sample: readonly any[]): ArrayContaining;
    function objectContaining(sample: any): ObjectContaining;
    function createSpy(name?: string, originalFn?: (...args: any[]) => any): Spy;
    function createSpyObj(baseName: string, methodNames: any[]): any;
    // eslint-disable-next-line no-unnecessary-generics
    function createSpyObj<T>(baseName: string, methodNames: any[]): T;
    function pp(value: any): string;
    function addCustomEqualityTester(equalityTester: CustomEqualityTester): void;
    function stringMatching(value: string | RegExp): Any;

    interface Clock {
        install(): void;
        uninstall(): void;
        /**
         * Calls to any registered callback are triggered when the clock isticked forward
         * via the jasmine.clock().tick function, which takes a number of milliseconds.
         */
        tick(ms: number): void;
        mockDate(date?: Date): void;
    }

    interface Any {
        new (expectedClass: any): any;
        jasmineMatches(other: any): boolean;
        jasmineToString(): string;
    }

    interface ArrayContaining {
        new (sample: readonly any[]): any;
        asymmetricMatch(other: any): boolean;
        jasmineToString(): string;
    }

    interface ObjectContaining {
        new (sample: any): any;
        jasmineMatches(other: any, mismatchKeys: any[], mismatchValues: any[]): boolean;
        jasmineToString(): string;
    }

    interface Spy {
        (...params: any[]): any;
        identity: string;
        and: SpyAnd;
        calls: Calls;
        mostRecentCall: { args: any[] };
        argsForCall: any[];
        wasCalled: boolean;
    }

    interface SpyAnd {
        /**
         * By chaining the spy with and.callThrough, the spy will still track all
         * calls to it but in addition it will delegate to the actual implementation.
         */
        callThrough(): Spy;
        /**
         * By chaining the spy with and.returnValue, all calls to the function
         * will return a specific value.
         */
        returnValue(val: any): Spy;
        /**
         * By chaining the spy with and.returnValues, all calls to the function
         * will return specific values in order until it reaches the end of the return values list.
         */
        returnValues(...values: any[]): Spy;
        /**
         * By chaining the spy with and.callFake, all calls to the spy
         * will delegate to the supplied function.
         */
        callFake(fn: (...args: any[]) => any): Spy;
        /**
         * By chaining the spy with and.throwError, all calls to the spy
         * will throw the specified value.
         */
        throwError(msg: string): Spy;
        /**
         * When a calling strategy is used for a spy, the original stubbing
         * behavior can be returned at any time with and.stub.
         */
        stub(): Spy;
    }

    interface Calls {
        /**
         * By chaining the spy with calls.any(),
         * will return false if the spy has not been called at all,
         * and then true once at least one call happens.
         */
        any(): boolean;
        /**
         * By chaining the spy with calls.count(),
         * will return the number of times the spy was called
         */
        count(): number;
        /**
         * By chaining the spy with calls.argsFor(),
         * will return the arguments passed to call number index
         */
        argsFor(index: number): any[];
        /**
         * By chaining the spy with calls.allArgs(),
         * will return the arguments to all calls
         */
        allArgs(): any[];
        /**
         * By chaining the spy with calls.all(), will return the
         * context (the this) and arguments passed all calls
         */
        all(): CallInfo[];
        /**
         * By chaining the spy with calls.mostRecent(), will return the
         * context (the this) and arguments for the most recent call
         */
        mostRecent(): CallInfo;
        /**
         * By chaining the spy with calls.first(), will return the
         * context (the this) and arguments for the first call
         */
        first(): CallInfo;
        /**
         * By chaining the spy with calls.reset(), will clears all tracking for a spy
         */
        reset(): void;
    }

    interface CallInfo {
        /**
         * The context (the this) for the call
         */
        object: any;
        /**
         * All arguments passed to the call
         */
        args: any[];
        /**
         * The return value of the call
         */
        returnValue: any;
    }

    interface CustomMatcherFactories {
        [index: string]: CustomMatcherFactory;
    }

    type CustomMatcherFactory = (util: MatchersUtil, customEqualityTesters: CustomEqualityTester[]) => CustomMatcher;

    interface MatchersUtil {
        equals(a: any, b: any, customTesters?: CustomEqualityTester[]): boolean;
        // eslint-disable-next-line no-unnecessary-generics
        contains<T>(haystack: ArrayLike<T> | string, needle: any, customTesters?: CustomEqualityTester[]): boolean;
        buildFailureMessage(matcherName: string, isNot: boolean, actual: any, ...expected: any[]): string;
    }

    type CustomEqualityTester = (first: any, second: any) => boolean;

    interface CustomMatcher {
        compare<T>(actual: T, expected: T, ...args: any[]): CustomMatcherResult;
        compare(actual: any, ...expected: any[]): CustomMatcherResult;
    }

    interface CustomMatcherResult {
        pass: boolean;
        message: string | (() => string);
    }

    interface ArrayLike<T> {
        length: number;
        [n: number]: T;
    }
}

interface ImportMeta {
    jest: typeof jest;
}
