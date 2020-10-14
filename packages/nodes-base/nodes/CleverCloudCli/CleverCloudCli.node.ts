/**
 * This node is forked from the ExecuteShell node.
 */

import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { exec } from 'child_process';


export interface IExecReturnData {
	exitCode: number;
	error?: Error;
	stderr: string;
	stdout: string;
}



/**
 * Promisifiy exec manually to also get the exit code
 *
 * @param {string} command
 * @returns {Promise<IExecReturnData>}
 */
function execPromise(command: string): Promise<IExecReturnData> {
	const returnData: IExecReturnData = {
		exitCode: 0,
		stderr: '',
		stdout: '',
	};

	return new Promise((resolve, reject) => {
		exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
			returnData.stdout = stdout.trim();
			returnData.stderr = stderr.trim();

			if (error) {
				returnData.error = error;
			}

			resolve(returnData);
		}).on('exit', code => { returnData.exitCode = code || 0; });
	});
}


export class CleverCloudCli implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Clever Cloud CLI',
		name: 'cleverCloudCli',
		icon: 'file:clevercloud.png',
		group: ['transform'],
		version: 1,
		description: 'Run Clever Tools commands',
		defaults: {
			name: 'Clever Cloud CLI',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'cleverCloudCli',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Command',
				name: 'command',
				typeOptions: {
					rows: 5,
				},
				type: 'string',
				default: '',
				placeholder: 'create --type node test',
				description: 'The command to execute',
			},
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		let items = this.getInputData();

		let command: string;
		items = [items[0]];


		const returnItems: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			command = this.getNodeParameter('command', itemIndex) as string;

			const credentials = this.getCredentials('cleverCloudCli');

			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}

			const cleverCommand = `CLEVER_TOKEN=${credentials.accessToken} CLEVER_SECRET=${credentials.accessTokenSecret} clever ${command}`;

			const {
				// error, TODO: Later make it possible to select if it should fail on error or not
				exitCode,
				stdout,
				stderr,
			} = await execPromise(cleverCommand);

			returnItems.push(
				{
					json: {
						exitCode,
						stderr,
						stdout,
					},
				},
			);
		}

		return this.prepareOutputData(returnItems);
	}
}
