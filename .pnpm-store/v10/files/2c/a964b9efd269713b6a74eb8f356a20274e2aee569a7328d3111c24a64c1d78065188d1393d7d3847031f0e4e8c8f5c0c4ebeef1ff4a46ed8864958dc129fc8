import { PromisifyAssertion, Tester, ExpectStatic } from '@vitest/expect';
import { Plugin } from '@vitest/pretty-format';
import { SnapshotState } from '@vitest/snapshot';
import { B as BenchmarkResult } from './benchmark.d.BwvBVTda.js';
import { U as UserConsoleLog } from './environment.d.Dmw5ulng.js';

type RawErrsMap = Map<string, TscErrorInfo[]>;
interface TscErrorInfo {
	filePath: string;
	errCode: number;
	errMsg: string;
	line: number;
	column: number;
}
interface CollectLineNumbers {
	target: number;
	next: number;
	prev?: number;
}
type CollectLines = { [key in keyof CollectLineNumbers] : string };
interface RootAndTarget {
	root: string;
	targetAbsPath: string;
}
type Context = RootAndTarget & {
	rawErrsMap: RawErrsMap
	openedDirs: Set<string>
	lastActivePath?: string
};

declare global {
	namespace Chai {
		interface Assertion {
			containSubset: (expected: any) => Assertion;
		}
		interface Assert {
			containSubset: (val: any, exp: any, msg?: string) => void;
		}
	}
}
interface SnapshotMatcher<T> {
	<U extends { [P in keyof T] : any }>(snapshot: Partial<U>, message?: string): void;
	(message?: string): void;
}
interface InlineSnapshotMatcher<T> {
	<U extends { [P in keyof T] : any }>(properties: Partial<U>, snapshot?: string, message?: string): void;
	(message?: string): void;
}
declare module "@vitest/expect" {
	interface MatcherState {
		environment: string;
		snapshotState: SnapshotState;
	}
	interface ExpectPollOptions {
		interval?: number;
		timeout?: number;
		message?: string;
	}
	interface ExpectStatic {
		unreachable: (message?: string) => never;
		soft: <T>(actual: T, message?: string) => Assertion<T>;
		poll: <T>(actual: () => T, options?: ExpectPollOptions) => PromisifyAssertion<Awaited<T>>;
		addEqualityTesters: (testers: Array<Tester>) => void;
		assertions: (expected: number) => void;
		hasAssertions: () => void;
		addSnapshotSerializer: (plugin: Plugin) => void;
	}
	interface Assertion<T> {
		matchSnapshot: SnapshotMatcher<T>;
		toMatchSnapshot: SnapshotMatcher<T>;
		toMatchInlineSnapshot: InlineSnapshotMatcher<T>;
		/**
		* Checks that an error thrown by a function matches a previously recorded snapshot.
		*
		* @param message - Optional custom error message.
		*
		* @example
		* expect(functionWithError).toThrowErrorMatchingSnapshot();
		*/
		toThrowErrorMatchingSnapshot: (message?: string) => void;
		/**
		* Checks that an error thrown by a function matches an inline snapshot within the test file.
		* Useful for keeping snapshots close to the test code.
		*
		* @param snapshot - Optional inline snapshot string to match.
		* @param message - Optional custom error message.
		*
		* @example
		* const throwError = () => { throw new Error('Error occurred') };
		* expect(throwError).toThrowErrorMatchingInlineSnapshot(`"Error occurred"`);
		*/
		toThrowErrorMatchingInlineSnapshot: (snapshot?: string, message?: string) => void;
		/**
		* Compares the received value to a snapshot saved in a specified file.
		* Useful for cases where snapshot content is large or needs to be shared across tests.
		*
		* @param filepath - Path to the snapshot file.
		* @param message - Optional custom error message.
		*
		* @example
		* await expect(largeData).toMatchFileSnapshot('path/to/snapshot.json');
		*/
		toMatchFileSnapshot: (filepath: string, message?: string) => Promise<void>;
	}
}
declare module "@vitest/runner" {
	interface TestContext {
		expect: ExpectStatic;
	}
	interface TaskMeta {
		typecheck?: boolean;
		benchmark?: boolean;
		failScreenshotPath?: string;
	}
	interface File {
		prepareDuration?: number;
		environmentLoad?: number;
	}
	interface TaskBase {
		logs?: UserConsoleLog[];
	}
	interface TaskResult {
		benchmark?: BenchmarkResult;
	}
}

export type { CollectLineNumbers as C, RawErrsMap as R, TscErrorInfo as T, CollectLines as a, RootAndTarget as b, Context as c };
