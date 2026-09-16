import type { RuleTester, RunTests } from '@typescript-eslint/rule-tester';
import type { RuleModule } from '@typescript-eslint/utils/ts-eslint';

declare module '@typescript-eslint/rule-tester' {
	interface RuleTester {
		run<MessageIds extends string, Options extends readonly unknown[]>(
			ruleName: string,
			rule: RuleModule<MessageIds, Options>,
			test: RunTests<MessageIds, Options>,
		): void;
	}
}
