import type {
	DataRequestResponse,
	JSExecSettings,
	TaskData,
	TaskDataRequestParams,
} from '@n8n/task-runner';
import { BuiltInsParser, BuiltInsParserState } from '@n8n/task-runner';
import { Service } from '@n8n/di';
import type { IExecuteFunctions, INodeExecutionData, INodeTypeDescription } from 'n8n-workflow';
import type { Readable } from 'node:stream';

import { NodeTypes } from '@/node-types';
import { DataRequestResponseBuilder } from '@/task-runners/task-managers/data-request-response-builder';
import { DataRequestResponseStripper } from '@/task-runners/task-managers/data-request-response-stripper';

import type { CodeTaskInput } from './task-api-client';

/** An input binary staged in `in/` for the task. Same shape as in @n8n/code-runtime. */
export interface StagedBinary {
	itemIndex: number;
	property: string;
	path: string;
	id?: string;
}

/** The content of `in/task.json`. Same shape as in @n8n/code-runtime. */
export interface CodeTaskFile {
	taskId: string;
	settings: JSExecSettings;
	data: DataRequestResponse | null;
	nodeTypes?: INodeTypeDescription[];
	binaries: StagedBinary[];
}

export interface BuiltTask {
	inputs: CodeTaskInput[];
	bytesTaskJson: number;
	binaryCount: number;
	/** Size of the staged binaries, from their metadata. Unknown sizes count as 0. */
	bytesInBin: number;
}

/** Names that read the bytes of input binaries. */
const BINARY_READ_PATTERN =
	/\b(getBinaryDataBuffer|binaryToString|getBinaryStream|binaryToBuffer)\b/;

/**
 * Binary helpers that read the input items. With task runners they ran in n8n
 * over RPC. Now they run in the sandbox, so the task needs the input items.
 */
const BINARY_HELPER_PATTERN =
	/\b(getBinaryDataBuffer|binaryToString|getBinaryStream|binaryToBuffer|assertBinaryData)\b/;

/**
 * Builds the inputs of a task: `task.json` and the staged binaries. It uses
 * the same static analysis and data stripping as the JS task runner, but runs
 * them in n8n before the task starts. The task never requests data while it
 * runs.
 */
@Service()
export class CodeTaskBuilder {
	private readonly parser = new BuiltInsParser();

	private readonly responseBuilder = new DataRequestResponseBuilder();

	constructor(private readonly nodeTypes: NodeTypes) {}

	build(taskId: string, settings: JSExecSettings, taskData: TaskData): BuiltTask {
		if (settings.nodeMode === 'runCode') {
			return this.finish({ taskId, settings, data: null, binaries: [] }, []);
		}

		const parsed = this.parser.parseUsedBuiltIns(settings.code);
		const state = parsed.ok ? parsed.result : BuiltInsParserState.newNeedsAllDataState();
		const params: TaskDataRequestParams = state.toDataRequestParams(settings.chunk);
		if (BINARY_HELPER_PATTERN.test(settings.code)) params.input.include = true;
		const full = this.responseBuilder.buildFromTaskData(taskData);
		const data = new DataRequestResponseStripper(full, params).strip();

		let nodeTypes: INodeTypeDescription[] | undefined;
		if (state.needsAllNodes) {
			const unique = new Map(
				Object.values(taskData.workflow.nodes).map((n) => [
					`${n.type}|${n.typeVersion}`,
					{ name: n.type, version: n.typeVersion },
				]),
			);
			nodeTypes = this.nodeTypes.getNodeTypeDescriptions([...unique.values()]);
		}

		const { binaries, inputs } = this.selectBinaries(settings, taskData);
		return this.finish({ taskId, settings, data, nodeTypes, binaries }, inputs);
	}

	private finish(file: CodeTaskFile, binaryInputs: Array<CodeTaskInput & { size: number }>) {
		const taskJson = Buffer.from(JSON.stringify(file));
		return {
			inputs: [{ path: 'task.json', content: taskJson }, ...binaryInputs],
			bytesTaskJson: taskJson.length,
			binaryCount: binaryInputs.length,
			bytesInBin: binaryInputs.reduce((sum, b) => sum + b.size, 0),
		};
	}

	/**
	 * Static check: if the code can read binary bytes, stage all binaries of
	 * the input items that the task can see. Binaries with their bytes in
	 * `data` (no id) need no staging; the runtime decodes them.
	 */
	private selectBinaries(settings: JSExecSettings, taskData: TaskData) {
		const binaries: StagedBinary[] = [];
		const inputs: Array<CodeTaskInput & { size: number }> = [];
		if (!BINARY_READ_PATTERN.test(settings.code)) return { binaries, inputs };

		const items: Array<INodeExecutionData | undefined> = taskData.connectionInputData ?? [];
		const start = settings.chunk?.startIndex ?? 0;
		const end = settings.chunk ? start + settings.chunk.count : items.length;
		const helpers = taskData.executeFunctions.helpers as IExecuteFunctions['helpers'];

		for (let itemIndex = start; itemIndex < Math.min(end, items.length); itemIndex++) {
			const binary = items[itemIndex]?.binary;
			if (!binary) continue;
			for (const [property, meta] of Object.entries(binary)) {
				if (!meta?.id) continue;
				const binaryId = meta.id;
				const path = `bin/${binaries.length}`;
				binaries.push({ itemIndex, property, path, id: binaryId });
				inputs.push({
					path,
					size: meta.bytes ?? 0,
					// Streamed into the request body. The file is never fully in memory.
					content: async () => {
						if (typeof helpers.getBinaryStream === 'function') {
							return await helpers.getBinaryStream(binaryId);
						}
						const { Readable: R } = await import('node:stream');
						const buffer = await helpers.getBinaryDataBuffer(itemIndex, property);
						return R.from([buffer]) as Readable;
					},
				});
			}
		}
		return { binaries, inputs };
	}
}
