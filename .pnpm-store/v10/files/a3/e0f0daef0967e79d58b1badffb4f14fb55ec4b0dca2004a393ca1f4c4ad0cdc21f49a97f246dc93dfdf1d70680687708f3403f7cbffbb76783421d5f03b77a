import { App } from 'vue-demi';
import { StateTree, PiniaPlugin, Pinia } from 'pinia';

interface TestingOptions {
    /**
     * Allows defining a partial initial state of all your stores. This state gets applied after a store is created,
     * allowing you to only set a few properties that are required in your test.
     */
    initialState?: StateTree;
    /**
     * Plugins to be installed before the testing plugin. Add any plugins used in
     * your application that will be used while testing.
     */
    plugins?: PiniaPlugin[];
    /**
     * When set to false, actions are only spied, but they will still get executed. When
     * set to true, actions will be replaced with spies, resulting in their code
     * not being executed. Defaults to true. NOTE: when providing `createSpy()`,
     * it will **only** make the `fn` argument `undefined`. You still have to
     * handle this in `createSpy()`.
     */
    stubActions?: boolean;
    /**
     * When set to true, calls to `$patch()` won't change the state. Defaults to
     * false. NOTE: when providing `createSpy()`, it will **only** make the `fn`
     * argument `undefined`. You still have to handle this in `createSpy()`.
     */
    stubPatch?: boolean;
    /**
     * When set to true, calls to `$reset()` won't change the state. Defaults to
     * false.
     */
    stubReset?: boolean;
    /**
     * Creates an empty App and calls `app.use(pinia)` with the created testing
     * pinia. This allows you to use plugins while unit testing stores as
     * plugins **will wait for pinia to be installed in order to be executed**.
     * Defaults to false.
     */
    fakeApp?: boolean;
    /**
     * Function used to create a spy for actions and `$patch()`. Pre-configured
     * with `jest.fn` in Jest projects or `vi.fn` in Vitest projects if
     * `globals: true` is set.
     */
    createSpy?: (fn?: (...args: any[]) => any) => (...args: any[]) => any;
}
/**
 * Pinia instance specifically designed for testing. Extends a regular
 * `Pinia` instance with test specific properties.
 */
interface TestingPinia extends Pinia {
    /** App used by Pinia */
    app: App;
}
/**
 * Creates a pinia instance designed for unit tests that **requires mocking**
 * the stores. By default, **all actions are mocked** and therefore not
 * executed. This allows you to unit test your store and components separately.
 * You can change this with the `stubActions` option. If you are using jest,
 * they are replaced with `jest.fn()`, otherwise, you must provide your own
 * `createSpy` option.
 *
 * @param options - options to configure the testing pinia
 * @returns a augmented pinia instance
 */
declare function createTestingPinia({ initialState, plugins, stubActions, stubPatch, stubReset, fakeApp, createSpy: _createSpy, }?: TestingOptions): TestingPinia;

export { type TestingOptions, type TestingPinia, createTestingPinia };
