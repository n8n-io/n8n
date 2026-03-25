import { b as TestArtifact, a as Test, S as Suite, d as SuiteHooks, F as File, e as TaskUpdateEvent, T as Task, f as TestAPI, g as SuiteAPI, h as SuiteCollector } from './tasks.d-BUa1HjoW.js';
export { A as AfterAllListener, n as AfterEachListener, B as BeforeAllListener, p as BeforeEachListener, q as Fixture, r as FixtureFn, s as FixtureOptions, t as Fixtures, I as ImportDuration, u as InferFixturesTypes, O as OnTestFailedHandler, v as OnTestFinishedHandler, R as RunMode, w as RuntimeContext, x as SequenceHooks, y as SequenceSetupFiles, z as SuiteFactory, D as TaskBase, E as TaskCustomOptions, G as TaskEventPack, H as TaskHook, J as TaskMeta, K as TaskPopulated, L as TaskResult, M as TaskResultPack, N as TaskState, P as TestAnnotation, Q as TestAnnotationArtifact, U as TestAnnotationLocation, V as TestArtifactBase, W as TestArtifactLocation, X as TestArtifactRegistry, Y as TestAttachment, Z as TestContext, _ as TestFunction, $ as TestOptions, a0 as Use, a1 as VisualRegressionArtifact, i as afterAll, j as afterEach, k as beforeAll, l as beforeEach, o as onTestFailed, m as onTestFinished } from './tasks.d-BUa1HjoW.js';
import { Awaitable } from '@vitest/utils';
import { FileSpecification, VitestRunner } from './types.js';
export { CancelReason, VitestRunnerConfig, VitestRunnerConstructor, VitestRunnerImportSource } from './types.js';
import '@vitest/utils/diff';

/**
* @experimental
* @advanced
*
* Records a custom test artifact during test execution.
*
* This function allows you to attach structured data, files, or metadata to a test.
*
* Vitest automatically injects the source location where the artifact was created and manages any attachments you include.
*
* @param task - The test task context, typically accessed via `this.task` in custom matchers or `context.task` in tests
* @param artifact - The artifact to record. Must extend {@linkcode TestArtifactBase}
*
* @returns A promise that resolves to the recorded artifact with location injected
*
* @throws {Error} If called after the test has finished running
* @throws {Error} If the test runner doesn't support artifacts
*
* @example
* ```ts
* // In a custom assertion
* async function toHaveValidSchema(this: MatcherState, actual: unknown) {
*   const validation = validateSchema(actual)
*
*   await recordArtifact(this.task, {
*     type: 'my-plugin:schema-validation',
*     passed: validation.valid,
*     errors: validation.errors,
*   })
*
*   return { pass: validation.valid, message: () => '...' }
* }
* ```
*/
declare function recordArtifact<Artifact extends TestArtifact>(task: Test, artifact: Artifact): Promise<Artifact>;

declare function setFn(key: Test, fn: () => Awaitable<void>): void;
declare function getFn<Task = Test>(key: Task): () => Awaitable<void>;
declare function setHooks(key: Suite, hooks: SuiteHooks): void;
declare function getHooks(key: Suite): SuiteHooks;

declare function updateTask(event: TaskUpdateEvent, task: Task, runner: VitestRunner): void;
declare function startTests(specs: string[] | FileSpecification[], runner: VitestRunner): Promise<File[]>;
declare function publicCollect(specs: string[] | FileSpecification[], runner: VitestRunner): Promise<File[]>;

/**
* Creates a suite of tests, allowing for grouping and hierarchical organization of tests.
* Suites can contain both tests and other suites, enabling complex test structures.
*
* @param {string} name - The name of the suite, used for identification and reporting.
* @param {Function} fn - A function that defines the tests and suites within this suite.
* @example
* ```ts
* // Define a suite with two tests
* suite('Math operations', () => {
*   test('should add two numbers', () => {
*     expect(add(1, 2)).toBe(3);
*   });
*
*   test('should subtract two numbers', () => {
*     expect(subtract(5, 2)).toBe(3);
*   });
* });
* ```
* @example
* ```ts
* // Define nested suites
* suite('String operations', () => {
*   suite('Trimming', () => {
*     test('should trim whitespace from start and end', () => {
*       expect('  hello  '.trim()).toBe('hello');
*     });
*   });
*
*   suite('Concatenation', () => {
*     test('should concatenate two strings', () => {
*       expect('hello' + ' ' + 'world').toBe('hello world');
*     });
*   });
* });
* ```
*/
declare const suite: SuiteAPI;
/**
* Defines a test case with a given name and test function. The test function can optionally be configured with test options.
*
* @param {string | Function} name - The name of the test or a function that will be used as a test name.
* @param {TestOptions | TestFunction} [optionsOrFn] - Optional. The test options or the test function if no explicit name is provided.
* @param {number | TestOptions | TestFunction} [optionsOrTest] - Optional. The test function or options, depending on the previous parameters.
* @throws {Error} If called inside another test function.
* @example
* ```ts
* // Define a simple test
* test('should add two numbers', () => {
*   expect(add(1, 2)).toBe(3);
* });
* ```
* @example
* ```ts
* // Define a test with options
* test('should subtract two numbers', { retry: 3 }, () => {
*   expect(subtract(5, 2)).toBe(3);
* });
* ```
*/
declare const test: TestAPI;
/**
* Creates a suite of tests, allowing for grouping and hierarchical organization of tests.
* Suites can contain both tests and other suites, enabling complex test structures.
*
* @param {string} name - The name of the suite, used for identification and reporting.
* @param {Function} fn - A function that defines the tests and suites within this suite.
* @example
* ```ts
* // Define a suite with two tests
* describe('Math operations', () => {
*   test('should add two numbers', () => {
*     expect(add(1, 2)).toBe(3);
*   });
*
*   test('should subtract two numbers', () => {
*     expect(subtract(5, 2)).toBe(3);
*   });
* });
* ```
* @example
* ```ts
* // Define nested suites
* describe('String operations', () => {
*   describe('Trimming', () => {
*     test('should trim whitespace from start and end', () => {
*       expect('  hello  '.trim()).toBe('hello');
*     });
*   });
*
*   describe('Concatenation', () => {
*     test('should concatenate two strings', () => {
*       expect('hello' + ' ' + 'world').toBe('hello world');
*     });
*   });
* });
* ```
*/
declare const describe: SuiteAPI;
/**
* Defines a test case with a given name and test function. The test function can optionally be configured with test options.
*
* @param {string | Function} name - The name of the test or a function that will be used as a test name.
* @param {TestOptions | TestFunction} [optionsOrFn] - Optional. The test options or the test function if no explicit name is provided.
* @param {number | TestOptions | TestFunction} [optionsOrTest] - Optional. The test function or options, depending on the previous parameters.
* @throws {Error} If called inside another test function.
* @example
* ```ts
* // Define a simple test
* it('adds two numbers', () => {
*   expect(add(1, 2)).toBe(3);
* });
* ```
* @example
* ```ts
* // Define a test with options
* it('subtracts two numbers', { retry: 3 }, () => {
*   expect(subtract(5, 2)).toBe(3);
* });
* ```
*/
declare const it: TestAPI;
declare function getCurrentSuite<ExtraContext = object>(): SuiteCollector<ExtraContext>;
declare function createTaskCollector(fn: (...args: any[]) => any, context?: Record<string, unknown>): TestAPI;

declare function getCurrentTest<T extends Test | undefined>(): T;

export { File, FileSpecification, Suite, SuiteAPI, SuiteCollector, SuiteHooks, Task, TaskUpdateEvent, Test, TestAPI, TestArtifact, VitestRunner, publicCollect as collectTests, createTaskCollector, describe, getCurrentSuite, getCurrentTest, getFn, getHooks, it, recordArtifact, setFn, setHooks, startTests, suite, test, updateTask };
