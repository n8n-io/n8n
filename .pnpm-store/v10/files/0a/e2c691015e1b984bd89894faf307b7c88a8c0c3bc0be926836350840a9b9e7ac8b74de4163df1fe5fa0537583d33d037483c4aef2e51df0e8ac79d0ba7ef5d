import { CancelReason, File, TestArtifact, TaskResultPack, TaskEventPack } from '@vitest/runner';
import { SnapshotResult } from '@vitest/snapshot';
import { FetchFunctionOptions, FetchResult } from 'vite/module-runner';
import { O as OTELCarrier } from './traces.d.402V_yFI.js';

interface AfterSuiteRunMeta {
	coverage?: unknown;
	testFiles: string[];
	environment: string;
	projectName?: string;
}
interface UserConsoleLog {
	content: string;
	origin?: string;
	browser?: boolean;
	type: "stdout" | "stderr";
	taskId?: string;
	time: number;
	size: number;
}
interface ModuleGraphData {
	graph: Record<string, string[]>;
	externalized: string[];
	inlined: string[];
}
interface ProvidedContext {}
interface ResolveFunctionResult {
	id: string;
	file: string;
	url: string;
}
interface FetchCachedFileSystemResult {
	cached: true;
	tmp: string;
	id: string;
	file: string | null;
	url: string;
	invalidate: boolean;
}
type LabelColor = "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white";

interface RuntimeRPC {
	fetch: (id: string, importer: string | undefined, environment: string, options?: FetchFunctionOptions, otelCarrier?: OTELCarrier) => Promise<FetchResult | FetchCachedFileSystemResult>;
	resolve: (id: string, importer: string | undefined, environment: string) => Promise<ResolveFunctionResult | null>;
	transform: (id: string) => Promise<{
		code?: string;
	}>;
	onUserConsoleLog: (log: UserConsoleLog) => void;
	onUnhandledError: (err: unknown, type: string) => void;
	onQueued: (file: File) => void;
	onCollected: (files: File[]) => Promise<void>;
	onAfterSuiteRun: (meta: AfterSuiteRunMeta) => void;
	onTaskArtifactRecord: <Artifact extends TestArtifact>(testId: string, artifact: Artifact) => Promise<Artifact>;
	onTaskUpdate: (pack: TaskResultPack[], events: TaskEventPack[]) => Promise<void>;
	onCancel: (reason: CancelReason) => void;
	getCountOfFailedTests: () => number;
	snapshotSaved: (snapshot: SnapshotResult) => void;
	resolveSnapshotPath: (testPath: string) => string;
}
interface RunnerRPC {
	onCancel: (reason: CancelReason) => void;
}

export type { AfterSuiteRunMeta as A, LabelColor as L, ModuleGraphData as M, ProvidedContext as P, RuntimeRPC as R, UserConsoleLog as U, RunnerRPC as a };
