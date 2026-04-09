import type { TSUtils } from '@typescript-eslint/utils';
import type { AnyRuleModule, RuleModule } from '@typescript-eslint/utils/ts-eslint';
import type { InvalidTestCase, RuleTesterConfig, RunTests, ValidTestCase } from './types';
import { TestFramework } from './TestFramework';
export declare class RuleTester extends TestFramework {
    #private;
    /**
     * Creates a new instance of RuleTester.
     */
    constructor(testerConfig?: RuleTesterConfig);
    /**
     * Set the configuration to use for all future tests
     */
    static setDefaultConfig(config: RuleTesterConfig): void;
    /**
     * Get the current configuration used for all tests
     */
    static getDefaultConfig(): Readonly<RuleTesterConfig>;
    /**
     * Reset the configuration to the initial configuration of the tester removing
     * any changes made until now.
     */
    static resetDefaultConfig(): void;
    /**
     * Adds the `only` property to a test to run it in isolation.
     */
    static only<Options extends readonly unknown[]>(item: string | ValidTestCase<Options>): ValidTestCase<Options>;
    /**
     * Adds the `only` property to a test to run it in isolation.
     */
    static only<MessageIds extends string, Options extends readonly unknown[]>(item: InvalidTestCase<MessageIds, Options>): InvalidTestCase<MessageIds, Options>;
    defineRule(name: string, rule: AnyRuleModule): void;
    /**
     * Adds a new rule test to execute.
     */
    run<MessageIds extends string, Options extends readonly unknown[]>(ruleName: string, rule: RuleModule<MessageIds, Options>, test: RunTests<TSUtils.NoInfer<MessageIds>, TSUtils.NoInfer<Options>>): void;
    /**
     * Run the rule for the given item
     * @throws {Error} If an invalid schema.
     * Use @private instead of #private to expose it for testing purposes
     */
    private runRuleForItem;
}
