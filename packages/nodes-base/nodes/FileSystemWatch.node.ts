import { ITriggerFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

import { watch } from 'chokidar';


export class FileSystemWatch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'File System Watch',
		name: 'fileSystemWatch',
		icon: 'fa:folder-open',
		group: ['trigger'],
		version: 1,
		subtitle: '=Events: {{$parameter["events"].join(", ")}}',
		description: 'Triggers a workflow on file system changes',
		defaults: {
			name: 'File System Watch',
			color: '#404040',
		},
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Folder to Watch',
				name: 'folder',
				type: 'string',
				default: '',
				placeholder: '/data/invoices',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Directory Added',
						value: 'addDir',
						description: 'Triggers whenever a new directory got added',
					},
					{
						name: 'Directory Deleted',
						value: 'unlinkDir',
						description: 'Triggers whenever a directory got added',
					},
					{
						name: 'File Added',
						value: 'add',
						description: 'Triggers whenever a new file got added',
					},
					{
						name: 'File Changed',
						value: 'change',
						description: 'Triggers whenever a file got changed',
					},
					{
						name: 'File Deleted',
						value: 'unlink',
						description: 'Triggers whenever a file got deleted',
					},

				],
				required: true,
				default: [],
				description: 'The events to listen to',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Depth',
						name: 'depth',
						type: 'number',
						typeOptions: {
							minValue: -1,
						},
						default: -1,
						description: 'Limits how many levels of subdirectories will be traversed. If set to \'-1\', no limit will be set.',
					},
					{
						displayName: 'Follow System Links',
						name: 'followSymlinks',
						type: 'boolean',
						default: true,
						description: 'When deactivated, only the symlinks themselves will be watched for changes instead of following the link references and bubbling events through the link\'s path',
					},
					{
						displayName: 'Ignore',
						name: 'ignored',
						type: 'string',
						default: '',
						placeholder: '**/*.txt',
						description: 'Files or paths to ignore. The whole relative or absolute path is tested, not just filename. <a href="https://github.com/micromatch/anymatch">Anymatch</a>-compatible definition.',
					},
				],
			},

		],
	};


	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const folder = this.getNodeParameter('folder') as string;
		const events = this.getNodeParameter('events', []) as string[];
		const options = this.getNodeParameter('options', {}) as IDataObject;

		const watcher = watch(folder, {
			ignored: options.ignored,
			persistent: true,
			ignoreInitial: true,
			followSymlinks: options.followSymlinks === undefined ? true : options.followSymlinks as boolean,
			depth: [-1, undefined].includes(options.depth as number) ? undefined : options.depth as number,
		});

		const executeTrigger = (event: string, path: string) => {
			this.emit([this.helpers.returnJsonArray([{ event,path }])]);
		};

		for (const eventName of events) {
			watcher.on(eventName, path => executeTrigger(eventName, path));
		}

		function closeFunction() {
			return watcher.close();
		}

		return {
			closeFunction,
		};

	}
}
