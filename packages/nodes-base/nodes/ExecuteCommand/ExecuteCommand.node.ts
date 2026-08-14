import { spawn } from 'child_process';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import {
	ManualExecutionCancelledError,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

export interface IExecReturnData {
	exitCode: number;
	error?: Error;
	stderr: string;
	stdout: string;
}

const SIGKILL_GRACE_MS = 5000;
const MAX_OUTPUT_SIZE = 10 * 1024 * 1024;

function appendCapped(current: string, data: string): string {
	return (current + data).slice(-MAX_OUTPUT_SIZE);
}

async function execPromise(command: string, abortSignal?: AbortSignal): Promise<IExecReturnData> {
	const returnData: IExecReturnData = {
		error: undefined,
		exitCode: 0,
		stderr: '',
		stdout: '',
	};

	return await new Promise((resolve, reject) => {
		if (abortSignal?.aborted) {
			reject(new ManualExecutionCancelledError(''));
			return;
		}

		const child = spawn(command, { cwd: process.cwd(), shell: true, detached: true });

		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');
		child.stdout.on(
			'data',
			(data: string) => (returnData.stdout = appendCapped(returnData.stdout, data)),
		);
		child.stderr.on(
			'data',
			(data: string) => (returnData.stderr = appendCapped(returnData.stderr, data)),
		);

		child.on('error', (error) => {
			returnData.error = error;
			resolve(returnData);
		});

		child.on('close', (code) => {
			returnData.stdout = returnData.stdout.trim();
			returnData.stderr = returnData.stderr.trim();
			returnData.exitCode = code ?? 0;
			if (code) {
				returnData.error = new Error(returnData.stderr || `Command failed with exit code ${code}`);
			}
			resolve(returnData);
		});

		const kill = (signal: NodeJS.Signals) => {
			if (!child.pid) {
				child.kill(signal);
				return;
			}
			if (process.platform === 'win32') {
				spawn('taskkill', ['/pid', child.pid.toString(), '/T', '/F']);
				return;
			}
			try {
				process.kill(-child.pid, signal);
			} catch {
				child.kill(signal);
			}
		};

		const onAbort = () => {
			kill('SIGTERM');
			const sigkillTimer = setTimeout(() => kill('SIGKILL'), SIGKILL_GRACE_MS);
			child.once('close', () => clearTimeout(sigkillTimer));
			reject(new ManualExecutionCancelledError(''));
		};

		child.once('close', () => abortSignal?.removeEventListener('abort', onAbort));
		abortSignal?.addEventListener('abort', onAbort, { once: true });
	});
}

export class ExecuteCommand implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Execute Command',
		name: 'executeCommand',
		icon: 'node:execute-command',
		iconColor: 'crimson',
		group: ['transform'],
		version: 1,
		description: 'Executes a command on the host',
		defaults: {
			name: 'Execute Command',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Execute Once',
				name: 'executeOnce',
				type: 'boolean',
				default: true,
				description: 'Whether to execute only once instead of once for each entry',
			},
			{
				displayName: 'Command',
				name: 'command',
				typeOptions: {
					rows: 5,
				},
				type: 'string',
				default: '',
				placeholder: 'echo "test"',
				description: 'The command to execute',
				required: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let items = this.getInputData();

		let command: string;
		const executeOnce = this.getNodeParameter('executeOnce', 0) as boolean;

		if (executeOnce) {
			items = [items[0]];
		}

		const abortSignal = this.getExecutionCancelSignal();

		const returnItems: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				command = this.getNodeParameter('command', itemIndex) as string;

				const { error, exitCode, stdout, stderr } = await execPromise(command, abortSignal);

				if (error !== undefined) {
					throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
				}

				returnItems.push({
					json: {
						exitCode,
						stderr,
						stdout,
					},
					pairedItem: {
						item: itemIndex,
					},
				});
			} catch (error) {
				if (abortSignal?.aborted) {
					throw error;
				}

				if (this.continueOnFail()) {
					returnItems.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: itemIndex,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnItems];
	}
}
