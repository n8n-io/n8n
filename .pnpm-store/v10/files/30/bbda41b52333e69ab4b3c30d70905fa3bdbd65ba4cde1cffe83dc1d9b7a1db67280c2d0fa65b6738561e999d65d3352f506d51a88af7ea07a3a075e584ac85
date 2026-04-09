import type { FlatConfig } from '@typescript-eslint/utils/ts-eslint';
import type { DependencyConstraint } from './DependencyConstraint';
/**
 * Additional configuration options specific to @typescript-eslint/rule-tester.
 */
export interface RuleTesterConfig extends FlatConfig.Config {
    /**
     * The default filenames to use for type-aware tests.
     * @default { ts: 'file.ts', tsx: 'react.tsx' }
     */
    readonly defaultFilenames?: Readonly<{
        ts: string;
        tsx: string;
    }>;
    /**
     * Constraints that must pass in the current environment for any tests to run.
     */
    readonly dependencyConstraints?: DependencyConstraint;
}
