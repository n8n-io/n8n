import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoUncleanedComposableTimersRule } from './no-uncleaned-composable-timers.js';

const ruleTester = new RuleTester();

ruleTester.run('no-uncleaned-composable-timers', NoUncleanedComposableTimersRule, {
	valid: [
		// Debounce cancelled via onScopeDispose.
		{
			code: `
				function useThing() {
					const run = useDebounceFn(() => {}, 300);
					onScopeDispose(() => run.cancel());
					return { run };
				}
			`,
		},
		// Throttle cleaned up via onUnmounted.
		{
			code: `
				function useThing() {
					const run = useThrottleFn(() => {}, 300);
					onUnmounted(() => run.cancel());
					return { run };
				}
			`,
		},
		// Raw timer cleared via clearTimeout.
		{
			code: `
				function useThing() {
					let id = setTimeout(() => {}, 300);
					onBeforeUnmount(() => clearTimeout(id));
					return {};
				}
			`,
		},
		// Exposes a cancel that calls `.cancel()` (the useWorkflowSaving pattern).
		{
			code: `
				function useWorkflowSaving() {
					const debounced = useDebounceFn(() => {}, 300);
					const cancelAutoSave = () => debounced.cancel();
					return { cancelAutoSave };
				}
			`,
		},
		// Not a composable (name does not match) — out of scope.
		{
			code: `
				function helper() {
					const run = useDebounceFn(() => {}, 300);
					return run;
				}
			`,
		},
		// No scheduling call at all.
		{
			code: `
				function useThing() {
					const value = ref(0);
					return { value };
				}
			`,
		},
	],
	invalid: [
		// Debounce with no teardown.
		{
			code: `
				function useThing() {
					const run = useDebounceFn(() => {}, 300);
					return { run };
				}
			`,
			errors: [{ messageId: 'uncleanedTimer' }],
		},
		// Throttle with no teardown (arrow composable).
		{
			code: `
				const useThing = () => {
					const run = useThrottleFn(() => {}, 300);
					return { run };
				};
			`,
			errors: [{ messageId: 'uncleanedTimer' }],
		},
		// Raw setInterval with no clearInterval.
		{
			code: `
				function usePolling() {
					setInterval(() => {}, 1000);
					return {};
				}
			`,
			errors: [{ messageId: 'uncleanedTimer' }],
		},
		// Scheduler nested inside a callback still counts against the composable.
		{
			code: `
				function useThing() {
					watchEffect(() => {
						setTimeout(() => {}, 300);
					});
					return {};
				}
			`,
			errors: [{ messageId: 'uncleanedTimer' }],
		},
	],
});
