import { TestError, Awaitable } from '@vitest/utils';

interface FixtureItem extends FixtureOptions {
	prop: string;
	value: any;
	scope: "test" | "file" | "worker";
	/**
	* Indicates whether the fixture is a function
	*/
	isFn: boolean;
	/**
	* The dependencies(fixtures) of current fixture function.
	*/
	deps?: FixtureItem[];
}

/**
* Registers a callback function to be executed once before all tests within the current suite.
* This hook is useful for scenarios where you need to perform setup operations that are common to all tests in a suite, such as initializing a database connection or setting up a test environment.
*
* **Note:** The `beforeAll` hooks are executed in the order they are defined one after another. You can configure this by changing the `sequence.hooks` option in the config file.
*
* @param {Function} fn - The callback function to be executed before all tests.
* @param {number} [timeout] - Optional timeout in milliseconds for the hook. If not provided, the default hook timeout from the runner's configuration is used.
* @returns {void}
* @example
* ```ts
* // Example of using beforeAll to set up a database connection
* beforeAll(async () => {
*   await database.connect();
* });
* ```
*/
declare function beforeAll(fn: BeforeAllListener, timeout?: number): void;
/**
* Registers a callback function to be executed once after all tests within the current suite have completed.
* This hook is useful for scenarios where you need to perform cleanup operations after all tests in a suite have run, such as closing database connections or cleaning up temporary files.
*
* **Note:** The `afterAll` hooks are running in reverse order of their registration. You can configure this by changing the `sequence.hooks` option in the config file.
*
* @param {Function} fn - The callback function to be executed after all tests.
* @param {number} [timeout] - Optional timeout in milliseconds for the hook. If not provided, the default hook timeout from the runner's configuration is used.
* @returns {void}
* @example
* ```ts
* // Example of using afterAll to close a database connection
* afterAll(async () => {
*   await database.disconnect();
* });
* ```
*/
declare function afterAll(fn: AfterAllListener, timeout?: number): void;
/**
* Registers a callback function to be executed before each test within the current suite.
* This hook is useful for scenarios where you need to reset or reinitialize the test environment before each test runs, such as resetting database states, clearing caches, or reinitializing variables.
*
* **Note:** The `beforeEach` hooks are executed in the order they are defined one after another. You can configure this by changing the `sequence.hooks` option in the config file.
*
* @param {Function} fn - The callback function to be executed before each test. This function receives an `TestContext` parameter if additional test context is needed.
* @param {number} [timeout] - Optional timeout in milliseconds for the hook. If not provided, the default hook timeout from the runner's configuration is used.
* @returns {void}
* @example
* ```ts
* // Example of using beforeEach to reset a database state
* beforeEach(async () => {
*   await database.reset();
* });
* ```
*/
declare function beforeEach<ExtraContext = object>(fn: BeforeEachListener<ExtraContext>, timeout?: number): void;
/**
* Registers a callback function to be executed after each test within the current suite has completed.
* This hook is useful for scenarios where you need to clean up or reset the test environment after each test runs, such as deleting temporary files, clearing test-specific database entries, or resetting mocked functions.
*
* **Note:** The `afterEach` hooks are running in reverse order of their registration. You can configure this by changing the `sequence.hooks` option in the config file.
*
* @param {Function} fn - The callback function to be executed after each test. This function receives an `TestContext` parameter if additional test context is needed.
* @param {number} [timeout] - Optional timeout in milliseconds for the hook. If not provided, the default hook timeout from the runner's configuration is used.
* @returns {void}
* @example
* ```ts
* // Example of using afterEach to delete temporary files created during a test
* afterEach(async () => {
*   await fileSystem.deleteTempFiles();
* });
* ```
*/
declare function afterEach<ExtraContext = object>(fn: AfterEachListener<ExtraContext>, timeout?: number): void;
/**
* Registers a callback function to be executed when a test fails within the current suite.
* This function allows for custom actions to be performed in response to test failures, such as logging, cleanup, or additional diagnostics.
*
* **Note:** The `onTestFailed` hooks are running in reverse order of their registration. You can configure this by changing the `sequence.hooks` option in the config file.
*
* @param {Function} fn - The callback function to be executed upon a test failure. The function receives the test result (including errors).
* @param {number} [timeout] - Optional timeout in milliseconds for the hook. If not provided, the default hook timeout from the runner's configuration is used.
* @throws {Error} Throws an error if the function is not called within a test.
* @returns {void}
* @example
* ```ts
* // Example of using onTestFailed to log failure details
* onTestFailed(({ errors }) => {
*   console.log(`Test failed: ${test.name}`, errors);
* });
* ```
*/
declare const onTestFailed: TaskHook<OnTestFailedHandler>;
/**
* Registers a callback function to be executed when the current test finishes, regardless of the outcome (pass or fail).
* This function is ideal for performing actions that should occur after every test execution, such as cleanup, logging, or resetting shared resources.
*
* This hook is useful if you have access to a resource in the test itself and you want to clean it up after the test finishes. It is a more compact way to clean up resources than using the combination of `beforeEach` and `afterEach`.
*
* **Note:** The `onTestFinished` hooks are running in reverse order of their registration. You can configure this by changing the `sequence.hooks` option in the config file.
*
* **Note:** The `onTestFinished` hook is not called if the test is canceled with a dynamic `ctx.skip()` call.
*
* @param {Function} fn - The callback function to be executed after a test finishes. The function can receive parameters providing details about the completed test, including its success or failure status.
* @param {number} [timeout] - Optional timeout in milliseconds for the hook. If not provided, the default hook timeout from the runner's configuration is used.
* @throws {Error} Throws an error if the function is not called within a test.
* @returns {void}
* @example
* ```ts
* // Example of using onTestFinished for cleanup
* const db = await connectToDatabase();
* onTestFinished(async () => {
*   await db.disconnect();
* });
* ```
*/
declare const onTestFinished: TaskHook<OnTestFinishedHandler>;

type ChainableFunction<
	T extends string,
	F extends (...args: any) => any,
	C = object
> = F & { [x in T] : ChainableFunction<T, F, C> } & {
	fn: (this: Record<T, any>, ...args: Parameters<F>) => ReturnType<F>;
} & C;
declare function createChainable<
	T extends string,
	Args extends any[],
	R = any
>(keys: T[], fn: (this: Record<T, any>, ...args: Args) => R): ChainableFunction<T, (...args: Args) => R>;

type RunMode = "run" | "skip" | "only" | "todo" | "queued";
type TaskState = RunMode | "pass" | "fail";
interface TaskBase {
	/**
	* Unique task identifier. Based on the file id and the position of the task.
	* The id of the file task is based on the file path relative to root and project name.
	* It will not change between runs.
	* @example `1201091390`, `1201091390_0`, `1201091390_0_1`
	*/
	id: string;
	/**
	* Task name provided by the user. If no name was provided, it will be an empty string.
	*/
	name: string;
	/**
	* Full name including the file path, any parent suites, and this task's name.
	*
	* Uses ` > ` as the separator between levels.
	*
	* @example
	* // file
	* 'test/task-names.test.ts'
	* @example
	* // suite
	* 'test/task-names.test.ts > meal planning'
	* 'test/task-names.test.ts > meal planning > grocery lists'
	* @example
	* // test
	* 'test/task-names.test.ts > meal planning > grocery lists > calculates ingredients'
	*/
	fullName: string;
	/**
	* Full name excluding the file path, including any parent suites and this task's name. `undefined` for file tasks.
	*
	* Uses ` > ` as the separator between levels.
	*
	* @example
	* // file
	* undefined
	* @example
	* // suite
	* 'meal planning'
	* 'meal planning > grocery lists'
	* @example
	* // test
	* 'meal planning > grocery lists > calculates ingredients'
	*/
	fullTestName?: string;
	/**
	* Task mode.
	* - **skip**: task is skipped
	* - **only**: only this task and other tasks with `only` mode will run
	* - **todo**: task is marked as a todo, alias for `skip`
	* - **run**: task will run or already ran
	* - **queued**: task will start running next. It can only exist on the File
	*/
	mode: RunMode;
	/**
	* Custom metadata for the task. JSON reporter will save this data.
	*/
	meta: TaskMeta;
	/**
	* Whether the task was produced with `.each()` method.
	*/
	each?: boolean;
	/**
	* Whether the task should run concurrently with other tasks.
	*/
	concurrent?: boolean;
	/**
	* Whether the tasks of the suite run in a random order.
	*/
	shuffle?: boolean;
	/**
	* Suite that this task is part of. File task or the global suite will have no parent.
	*/
	suite?: Suite;
	/**
	* Result of the task. Suite and file tasks will only have the result if there
	* was an error during collection or inside `afterAll`/`beforeAll`.
	*/
	result?: TaskResult;
	/**
	* The amount of times the task should be retried if it fails.
	* @default 0
	*/
	retry?: number;
	/**
	* The amount of times the task should be repeated after the successful run.
	* If the task fails, it will not be retried unless `retry` is specified.
	* @default 0
	*/
	repeats?: number;
	/**
	* Location of the task in the file. This field is populated only if
	* `includeTaskLocation` option is set. It is generated by calling `new Error`
	* and parsing the stack trace, so the location might differ depending on the runtime.
	*/
	location?: {
		line: number;
		column: number;
	};
	/**
	* If the test was collected by parsing the file AST, and the name
	* is not a static string, this property will be set to `true`.
	* @experimental
	*/
	dynamic?: boolean;
}
interface TaskPopulated extends TaskBase {
	/**
	* File task. It's the root task of the file.
	*/
	file: File;
	/**
	* Whether the task should succeed if it fails. If the task fails, it will be marked as passed.
	*/
	fails?: boolean;
	/**
	* Store promises (from async expects) to wait for them before finishing the test
	*/
	promises?: Promise<any>[];
}
/**
* Custom metadata that can be used in reporters.
*/
interface TaskMeta {}
/**
* The result of calling a task.
*/
interface TaskResult {
	/**
	* State of the task. Inherits the `task.mode` during collection.
	* When the task has finished, it will be changed to `pass` or `fail`.
	* - **pass**: task ran successfully
	* - **fail**: task failed
	*/
	state: TaskState;
	/**
	* Errors that occurred during the task execution. It is possible to have several errors
	* if `expect.soft()` failed multiple times or `retry` was triggered.
	*/
	errors?: TestError[];
	/**
	* How long in milliseconds the task took to run.
	*/
	duration?: number;
	/**
	* Time in milliseconds when the task started running.
	*/
	startTime?: number;
	/**
	* Heap size in bytes after the task finished.
	* Only available if `logHeapUsage` option is set and `process.memoryUsage` is defined.
	*/
	heap?: number;
	/**
	* State of related to this task hooks. Useful during reporting.
	*/
	hooks?: Partial<Record<keyof SuiteHooks, TaskState>>;
	/**
	* The amount of times the task was retried. The task is retried only if it
	* failed and `retry` option is set.
	*/
	retryCount?: number;
	/**
	* The amount of times the task was repeated. The task is repeated only if
	* `repeats` option is set. This number also contains `retryCount`.
	*/
	repeatCount?: number;
}
/** The time spent importing & executing a non-externalized file. */
interface ImportDuration {
	/** The time spent importing & executing the file itself, not counting all non-externalized imports that the file does. */
	selfTime: number;
	/** The time spent importing & executing the file and all its imports. */
	totalTime: number;
	/** Will be set to `true`, if the module was externalized. In this case totalTime and selfTime are identical. */
	external?: boolean;
	/** Which module imported this module first. All subsequent imports are cached. */
	importer?: string;
}
/**
* The tuple representing a single task update.
* Usually reported after the task finishes.
*/
type TaskResultPack = [id: string, result: TaskResult | undefined, meta: TaskMeta];
interface TaskEventData {
	annotation?: TestAnnotation | undefined;
	artifact?: TestArtifact | undefined;
}
type TaskEventPack = [id: string, event: TaskUpdateEvent, data: TaskEventData | undefined];
type TaskUpdateEvent = "test-failed-early" | "suite-failed-early" | "test-prepare" | "test-finished" | "test-retried" | "suite-prepare" | "suite-finished" | "before-hook-start" | "before-hook-end" | "after-hook-start" | "after-hook-end" | "test-annotation" | "test-artifact";
interface Suite extends TaskBase {
	type: "suite";
	/**
	* File task. It's the root task of the file.
	*/
	file: File;
	/**
	* An array of tasks that are part of the suite.
	*/
	tasks: Task[];
}
interface File extends Suite {
	/**
	* The name of the pool that the file belongs to.
	* @default 'forks'
	*/
	pool?: string;
	/**
	* The environment that processes the file on the server.
	*/
	viteEnvironment?: string;
	/**
	* The path to the file in UNIX format.
	*/
	filepath: string;
	/**
	* The name of the workspace project the file belongs to.
	*/
	projectName: string | undefined;
	/**
	* The time it took to collect all tests in the file.
	* This time also includes importing all the file dependencies.
	*/
	collectDuration?: number;
	/**
	* The time it took to import the setup file.
	*/
	setupDuration?: number;
	/** The time spent importing every non-externalized dependency that Vitest has processed. */
	importDurations?: Record<string, ImportDuration>;
}
interface Test<ExtraContext = object> extends TaskPopulated {
	type: "test";
	/**
	* Test context that will be passed to the test function.
	*/
	context: TestContext & ExtraContext;
	/**
	* The test timeout in milliseconds.
	*/
	timeout: number;
	/**
	* An array of custom annotations.
	*/
	annotations: TestAnnotation[];
	/**
	* An array of artifacts produced by the test.
	*
	* @experimental
	*/
	artifacts: TestArtifact[];
	fullTestName: string;
}
type Task = Test | Suite | File;
type TestFunction<ExtraContext = object> = (context: TestContext & ExtraContext) => Awaitable<any> | void;
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
}[T extends Readonly<[any]> ? 1 : T extends Readonly<[any, any]> ? 2 : T extends Readonly<[any, any, any]> ? 3 : T extends Readonly<[any, any, any, any]> ? 4 : T extends Readonly<[any, any, any, any, any]> ? 5 : T extends Readonly<[any, any, any, any, any, any]> ? 6 : T extends Readonly<[any, any, any, any, any, any, any]> ? 7 : T extends Readonly<[any, any, any, any, any, any, any, any]> ? 8 : T extends Readonly<[any, any, any, any, any, any, any, any, any]> ? 9 : T extends Readonly<[any, any, any, any, any, any, any, any, any, any]> ? 10 : "fallback"];
interface EachFunctionReturn<T extends any[]> {
	(name: string | Function, fn: (...args: T) => Awaitable<void>, options?: number): void;
	(name: string | Function, options: TestCollectorOptions, fn: (...args: T) => Awaitable<void>): void;
}
interface TestEachFunction {
	<T extends any[] | [any]>(cases: ReadonlyArray<T>): EachFunctionReturn<T>;
	<T extends ReadonlyArray<any>>(cases: ReadonlyArray<T>): EachFunctionReturn<ExtractEachCallbackArgs<T>>;
	<T>(cases: ReadonlyArray<T>): EachFunctionReturn<T[]>;
	(...args: [TemplateStringsArray, ...any]): EachFunctionReturn<any[]>;
}
interface TestForFunctionReturn<
	Arg,
	Context
> {
	(name: string | Function, fn: (arg: Arg, context: Context) => Awaitable<void>): void;
	(name: string | Function, options: TestCollectorOptions, fn: (args: Arg, context: Context) => Awaitable<void>): void;
}
interface TestForFunction<ExtraContext> {
	<T>(cases: ReadonlyArray<T>): TestForFunctionReturn<T, TestContext & ExtraContext>;
	(strings: TemplateStringsArray, ...values: any[]): TestForFunctionReturn<any, TestContext & ExtraContext>;
}
interface SuiteForFunction {
	<T>(cases: ReadonlyArray<T>): EachFunctionReturn<[T]>;
	(...args: [TemplateStringsArray, ...any]): EachFunctionReturn<any[]>;
}
interface TestCollectorCallable<C = object> {
	<ExtraContext extends C>(name: string | Function, fn?: TestFunction<ExtraContext>, options?: number): void;
	<ExtraContext extends C>(name: string | Function, options?: TestCollectorOptions, fn?: TestFunction<ExtraContext>): void;
}
type ChainableTestAPI<ExtraContext = object> = ChainableFunction<"concurrent" | "sequential" | "only" | "skip" | "todo" | "fails", TestCollectorCallable<ExtraContext>, {
	each: TestEachFunction;
	for: TestForFunction<ExtraContext>;
}>;
type TestCollectorOptions = Omit<TestOptions, "shuffle">;
interface TestOptions {
	/**
	* Test timeout.
	*/
	timeout?: number;
	/**
	* Times to retry the test if fails. Useful for making flaky tests more stable.
	* When retries is up, the last test error will be thrown.
	*
	* @default 0
	*/
	retry?: number;
	/**
	* How many times the test will run again.
	* Only inner tests will repeat if set on `describe()`, nested `describe()` will inherit parent's repeat by default.
	*
	* @default 0
	*/
	repeats?: number;
	/**
	* Whether suites and tests run concurrently.
	* Tests inherit `concurrent` from `describe()` and nested `describe()` will inherit from parent's `concurrent`.
	*/
	concurrent?: boolean;
	/**
	* Whether tests run sequentially.
	* Tests inherit `sequential` from `describe()` and nested `describe()` will inherit from parent's `sequential`.
	*/
	sequential?: boolean;
	/**
	* Whether the tasks of the suite run in a random order.
	*/
	shuffle?: boolean;
	/**
	* Whether the test should be skipped.
	*/
	skip?: boolean;
	/**
	* Should this test be the only one running in a suite.
	*/
	only?: boolean;
	/**
	* Whether the test should be skipped and marked as a todo.
	*/
	todo?: boolean;
	/**
	* Whether the test is expected to fail. If it does, the test will pass, otherwise it will fail.
	*/
	fails?: boolean;
}
interface ExtendedAPI<ExtraContext> {
	skipIf: (condition: any) => ChainableTestAPI<ExtraContext>;
	runIf: (condition: any) => ChainableTestAPI<ExtraContext>;
}
interface Hooks<ExtraContext> {
	beforeAll: typeof beforeAll;
	afterAll: typeof afterAll;
	beforeEach: typeof beforeEach<ExtraContext>;
	afterEach: typeof afterEach<ExtraContext>;
}
type TestAPI<ExtraContext = object> = ChainableTestAPI<ExtraContext> & ExtendedAPI<ExtraContext> & Hooks<ExtraContext> & {
	extend: <T extends Record<string, any> = object>(fixtures: Fixtures<T, ExtraContext>) => TestAPI<{ [K in keyof T | keyof ExtraContext] : K extends keyof T ? T[K] : K extends keyof ExtraContext ? ExtraContext[K] : never }>;
	scoped: (fixtures: Fixtures<Partial<ExtraContext>>) => void;
};
interface FixtureOptions {
	/**
	* Whether to automatically set up current fixture, even though it's not being used in tests.
	* @default false
	*/
	auto?: boolean;
	/**
	* Indicated if the injected value from the config should be preferred over the fixture value
	*/
	injected?: boolean;
	/**
	* When should the fixture be set up.
	* - **test**: fixture will be set up before every test
	* - **worker**: fixture will be set up once per worker
	* - **file**: fixture will be set up once per file
	*
	* **Warning:** The `vmThreads` and `vmForks` pools initiate worker fixtures once per test file.
	* @default 'test'
	*/
	scope?: "test" | "worker" | "file";
}
type Use<T> = (value: T) => Promise<void>;
type FixtureFn<
	T,
	K extends keyof T,
	ExtraContext
> = (context: Omit<T, K> & ExtraContext, use: Use<T[K]>) => Promise<void>;
type Fixture<
	T,
	K extends keyof T,
	ExtraContext = object
> = ((...args: any) => any) extends T[K] ? T[K] extends any ? FixtureFn<T, K, Omit<ExtraContext, Exclude<keyof T, K>>> : never : T[K] | (T[K] extends any ? FixtureFn<T, K, Omit<ExtraContext, Exclude<keyof T, K>>> : never);
type Fixtures<
	T extends Record<string, any>,
	ExtraContext = object
> = { [K in keyof T] : Fixture<T, K, ExtraContext & TestContext> | [Fixture<T, K, ExtraContext & TestContext>, FixtureOptions?] };
type InferFixturesTypes<T> = T extends TestAPI<infer C> ? C : T;
interface SuiteCollectorCallable<ExtraContext = object> {
	<OverrideExtraContext extends ExtraContext = ExtraContext>(name: string | Function, fn?: SuiteFactory<OverrideExtraContext>, options?: number): SuiteCollector<OverrideExtraContext>;
	<OverrideExtraContext extends ExtraContext = ExtraContext>(name: string | Function, options: TestOptions, fn?: SuiteFactory<OverrideExtraContext>): SuiteCollector<OverrideExtraContext>;
}
type ChainableSuiteAPI<ExtraContext = object> = ChainableFunction<"concurrent" | "sequential" | "only" | "skip" | "todo" | "shuffle", SuiteCollectorCallable<ExtraContext>, {
	each: TestEachFunction;
	for: SuiteForFunction;
}>;
type SuiteAPI<ExtraContext = object> = ChainableSuiteAPI<ExtraContext> & {
	skipIf: (condition: any) => ChainableSuiteAPI<ExtraContext>;
	runIf: (condition: any) => ChainableSuiteAPI<ExtraContext>;
};
interface BeforeAllListener {
	(suite: Readonly<Suite | File>): Awaitable<unknown>;
}
interface AfterAllListener {
	(suite: Readonly<Suite | File>): Awaitable<unknown>;
}
interface BeforeEachListener<ExtraContext = object> {
	(context: TestContext & ExtraContext, suite: Readonly<Suite>): Awaitable<unknown>;
}
interface AfterEachListener<ExtraContext = object> {
	(context: TestContext & ExtraContext, suite: Readonly<Suite>): Awaitable<unknown>;
}
interface SuiteHooks<ExtraContext = object> {
	beforeAll: BeforeAllListener[];
	afterAll: AfterAllListener[];
	beforeEach: BeforeEachListener<ExtraContext>[];
	afterEach: AfterEachListener<ExtraContext>[];
}
interface TaskCustomOptions extends TestOptions {
	/**
	* Whether the task was produced with `.each()` method.
	*/
	each?: boolean;
	/**
	* Custom metadata for the task that will be assigned to `task.meta`.
	*/
	meta?: Record<string, unknown>;
	/**
	* Task fixtures.
	*/
	fixtures?: FixtureItem[];
	/**
	* Function that will be called when the task is executed.
	* If nothing is provided, the runner will try to get the function using `getFn(task)`.
	* If the runner cannot find the function, the task will be marked as failed.
	*/
	handler?: (context: TestContext) => Awaitable<void>;
}
interface SuiteCollector<ExtraContext = object> {
	readonly name: string;
	readonly mode: RunMode;
	options?: TestOptions;
	type: "collector";
	test: TestAPI<ExtraContext>;
	tasks: (Suite | Test<ExtraContext> | SuiteCollector<ExtraContext>)[];
	scoped: (fixtures: Fixtures<any, ExtraContext>) => void;
	fixtures: () => FixtureItem[] | undefined;
	file?: File;
	suite?: Suite;
	task: (name: string, options?: TaskCustomOptions) => Test<ExtraContext>;
	collect: (file: File) => Promise<Suite>;
	clear: () => void;
	on: <T extends keyof SuiteHooks<ExtraContext>>(name: T, ...fn: SuiteHooks<ExtraContext>[T]) => void;
}
type SuiteFactory<ExtraContext = object> = (test: TestAPI<ExtraContext>) => Awaitable<void>;
interface RuntimeContext {
	tasks: (SuiteCollector | Test)[];
	currentSuite: SuiteCollector | null;
}
/**
* User's custom test context.
*/
interface TestContext {
	/**
	* Metadata of the current test
	*/
	readonly task: Readonly<Test>;
	/**
	* An [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) that will be aborted if the test times out or
	* the test run was cancelled.
	* @see {@link https://vitest.dev/guide/test-context#signal}
	*/
	readonly signal: AbortSignal;
	/**
	* Register a callback to run when this specific test fails.
	* Useful when tests run concurrently.
	* @see {@link https://vitest.dev/guide/test-context#ontestfailed}
	*/
	readonly onTestFailed: (fn: OnTestFailedHandler, timeout?: number) => void;
	/**
	* Register a callback to run when this specific test finishes.
	* Useful when tests run concurrently.
	* @see {@link https://vitest.dev/guide/test-context#ontestfinished}
	*/
	readonly onTestFinished: (fn: OnTestFinishedHandler, timeout?: number) => void;
	/**
	* Mark tests as skipped. All execution after this call will be skipped.
	* This function throws an error, so make sure you are not catching it accidentally.
	* @see {@link https://vitest.dev/guide/test-context#skip}
	*/
	readonly skip: {
		(note?: string): never;
		(condition: boolean, note?: string): void;
	};
	/**
	* Add a test annotation that will be displayed by your reporter.
	* @see {@link https://vitest.dev/guide/test-context#annotate}
	*/
	readonly annotate: {
		(message: string, type?: string, attachment?: TestAttachment): Promise<TestAnnotation>;
		(message: string, attachment?: TestAttachment): Promise<TestAnnotation>;
	};
}
type OnTestFailedHandler = (context: TestContext) => Awaitable<void>;
type OnTestFinishedHandler = (context: TestContext) => Awaitable<void>;
interface TaskHook<HookListener> {
	(fn: HookListener, timeout?: number): void;
}
type SequenceHooks = "stack" | "list" | "parallel";
type SequenceSetupFiles = "list" | "parallel";
/**
* Represents a file or data attachment associated with a test artifact.
*
* Attachments can be either file-based (via `path`) or inline content (via `body`).
* The `contentType` helps consumers understand how to interpret the attachment data.
*/
interface TestAttachment {
	/** MIME type of the attachment (e.g., 'image/png', 'text/plain') */
	contentType?: string;
	/** File system path to the attachment */
	path?: string;
	/** Inline attachment content as a string or raw binary data */
	body?: string | Uint8Array;
}
/**
* Source code location information for a test artifact.
*
* Indicates where in the source code the artifact originated from.
*/
interface TestArtifactLocation {
	/** Line number in the source file (1-indexed) */
	line: number;
	/** Column number in the line (1-indexed) */
	column: number;
	/** Path to the source file */
	file: string;
}
/**
* @experimental
*
* Base interface for all test artifacts.
*
* Extend this interface when creating custom test artifacts. Vitest automatically manages the `attachments` array and injects the `location` property to indicate where the artifact was created in your test code.
*/
interface TestArtifactBase {
	/** File or data attachments associated with this artifact */
	attachments?: TestAttachment[];
	/** Source location where this artifact was created */
	location?: TestArtifactLocation;
}
/**
* @deprecated Use {@linkcode TestArtifactLocation} instead.
*
* Kept for backwards compatibility.
*/
type TestAnnotationLocation = TestArtifactLocation;
interface TestAnnotation {
	message: string;
	type: string;
	location?: TestArtifactLocation;
	attachment?: TestAttachment;
}
/**
* @experimental
*
* Artifact type for test annotations.
*/
interface TestAnnotationArtifact extends TestArtifactBase {
	type: "internal:annotation";
	annotation: TestAnnotation;
}
type VisualRegressionArtifactAttachment = TestAttachment & ({
	name: "reference" | "actual";
	width: number;
	height: number;
} | {
	name: "diff";
});
/**
* @experimental
*
* Artifact type for visual regressions.
*/
interface VisualRegressionArtifact extends TestArtifactBase {
	type: "internal:toMatchScreenshot";
	kind: "visual-regression";
	message: string;
	attachments: VisualRegressionArtifactAttachment[];
}
/**
* @experimental
* @advanced
*
* Registry for custom test artifact types.
*
* Augment this interface to register custom artifact types that your tests can produce.
*
* Each custom artifact should extend {@linkcode TestArtifactBase} and include a unique `type` discriminator property.
*
* @remarks
* - Use a `Symbol` as the **registry key** to guarantee uniqueness
* - The `type` property should follow the pattern `'package-name:artifact-name'`, `'internal:'` is a reserved prefix
* - Use `attachments` to include files or data; extend {@linkcode TestAttachment} for custom metadata
* - `location` property is automatically injected to indicate where the artifact was created
*
* @example
*  ```ts
* // Define custom attachment type for generated PDF
* interface PDFAttachment extends TestAttachment {
*   contentType: 'application/pdf'
*   body: Uint8Array
*   pageCount: number
*   fileSize: number
* }
*
* interface PDFGenerationArtifact extends TestArtifactBase {
*   type: 'my-plugin:pdf-generation'
*   templateName: string
*   isValid: boolean
*   attachments: [PDFAttachment]
* }
*
* // Use a symbol to guarantee key uniqueness
* const pdfKey = Symbol('pdf-generation')
*
* declare module 'vitest' {
*   interface TestArtifactRegistry {
*     [pdfKey]: PDFGenerationArtifact
*   }
* }
*
* // Custom assertion for PDF generation
* async function toGenerateValidPDF(
*   this: MatcherState,
*   actual: PDFTemplate,
*   data: Record<string, unknown>
* ): AsyncExpectationResult {
*   const pdfBuffer = await actual.render(data)
*   const validation = await validatePDF(pdfBuffer)
*
*   await recordArtifact(this.task, {
*     type: 'my-plugin:pdf-generation',
*     templateName: actual.name,
*     isValid: validation.success,
*     attachments: [{
*       contentType: 'application/pdf',
*       body: pdfBuffer,
*       pageCount: validation.pageCount,
*       fileSize: pdfBuffer.byteLength
*     }]
*   })
*
*   return {
*     pass: validation.success,
*     message: () => validation.success
*       ? `Generated valid PDF with ${validation.pageCount} pages`
*       : `Invalid PDF: ${validation.error}`
*   }
* }
* ```
*/
interface TestArtifactRegistry {}
/**
* @experimental
*
* Union type of all test artifacts, including built-in and custom registered artifacts.
*
* This type automatically includes all artifacts registered via {@link TestArtifactRegistry}.
*/
type TestArtifact = TestAnnotationArtifact | VisualRegressionArtifact | TestArtifactRegistry[keyof TestArtifactRegistry];

export { createChainable as c, afterAll as i, afterEach as j, beforeAll as k, beforeEach as l, onTestFinished as m, onTestFailed as o };
export type { TestOptions as $, AfterAllListener as A, BeforeAllListener as B, ChainableFunction as C, TaskBase as D, TaskCustomOptions as E, File as F, TaskEventPack as G, TaskHook as H, ImportDuration as I, TaskMeta as J, TaskPopulated as K, TaskResult as L, TaskResultPack as M, TaskState as N, OnTestFailedHandler as O, TestAnnotation as P, TestAnnotationArtifact as Q, RunMode as R, Suite as S, Task as T, TestAnnotationLocation as U, TestArtifactBase as V, TestArtifactLocation as W, TestArtifactRegistry as X, TestAttachment as Y, TestContext as Z, TestFunction as _, Test as a, Use as a0, VisualRegressionArtifact as a1, TestArtifact as b, SuiteHooks as d, TaskUpdateEvent as e, TestAPI as f, SuiteAPI as g, SuiteCollector as h, AfterEachListener as n, BeforeEachListener as p, Fixture as q, FixtureFn as r, FixtureOptions as s, Fixtures as t, InferFixturesTypes as u, OnTestFinishedHandler as v, RuntimeContext as w, SequenceHooks as x, SequenceSetupFiles as y, SuiteFactory as z };
