import type { DataRequestResponse, JSExecSettings } from '@n8n/task-runner';
import type { INodeTypeDescription } from 'n8n-workflow';

/** An input binary that n8n staged in `in/` for the task. */
export interface StagedBinary {
	itemIndex: number;
	property: string;
	/** Relative to the `in/` folder, for example `bin/0`. */
	path: string;
	/** The binary data id in n8n, if the binary has one. */
	id?: string;
}

/** The content of `in/task.json`. n8n writes it. Only the runtime reads it. */
export interface CodeTaskFile {
	taskId: string;
	settings: JSExecSettings;
	/** Null for `runCode` tasks, which get no workflow data. */
	data: DataRequestResponse | null;
	nodeTypes?: INodeTypeDescription[];
	binaries: StagedBinary[];
}

/** Metadata of an output binary, keyed by its uuid in `out/bin/`. */
export interface OutputBinaryInfo {
	fileName?: string;
	/** Set only when the user code gave a MIME type. n8n detects it otherwise. */
	mimeType?: string;
}

/** The content of `out/result.json`. */
export interface CodeTaskResultFile {
	result: unknown;
	customData?: Record<string, string>;
	staticData?: unknown;
	binaries?: Record<string, OutputBinaryInfo>;
}

/** Sends an RPC call to n8n through the code daemon. */
export type RpcCaller = (name: string, params: unknown[]) => Promise<unknown>;

/** Timings that the worker reports to the daemon, in milliseconds. */
export interface WorkerTimings {
	read: number;
	build: number;
	run: number;
	write?: number;
	binaryReads: number;
	rpcCount: number;
	rpcMs: number;
	/** Tasks this worker process has run, this one included. */
	workerTasks?: number;
}

/** The prefix of the id of a binary that the task wrote to `out/bin/`. */
export const SANDBOX_OUT_PREFIX = 'sandbox-out:';
