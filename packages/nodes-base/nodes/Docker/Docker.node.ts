import { ensureError } from '@n8n/utils/errors/ensure-error';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { ContainerFile } from './GenericFunctions';
import { runContainer } from './GenericFunctions';

export class Docker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Docker',
		name: 'docker',
		icon: 'file:docker.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["image"] }}',
		description: 'Runs a Docker container in the n8n sandbox',
		defaults: {
			name: 'Docker',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		hints: [
			{
				type: 'warning',
				message:
					'No tag specified for the Docker image, so <code>latest</code> will be pulled, which can change between runs. Pin a tag (e.g. <code>alpine:3.22</code>) for reproducible results.',
				displayCondition: '={{ $parameter["image"] && !$parameter["image"].includes(":") }}',
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			},
		],
		properties: [
			{
				displayName: 'Execute Once',
				name: 'executeOnce',
				type: 'boolean',
				default: true,
				description: 'Whether to run the container only once instead of once for each input item',
			},
			{
				displayName: 'Docker Image',
				name: 'image',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. alpine:3.22',
				hint: 'Any image the sandbox can pull, e.g. from Docker Hub. Include a tag to pin the version.',
				description: 'The Docker image to run. It is pulled automatically if not cached yet.',
			},
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				default: '',
				placeholder: 'e.g. echo',
				hint: "Leave empty to run the image's default command (CMD)",
				description: 'The command to run inside the container, overriding the image default',
			},
			{
				displayName: 'Arguments',
				name: 'argv',
				type: 'string',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Argument',
				},
				default: [],
				placeholder: 'e.g. --verbose',
				hint: 'One argument per entry, passed as-is (argv). No shell quoting or escaping needed.',
				description: 'Arguments passed to the command',
			},
			{
				displayName: 'Environment Variables',
				name: 'env',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Variable',
				default: {},
				description: 'Environment variables set in the container',
				options: [
					{
						displayName: 'Variable',
						name: 'values',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'e.g. AWS_REGION',
								description: 'Name of the environment variable',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'e.g. us-east-1',
								description: 'Value of the environment variable',
							},
						],
					},
				],
			},
			{
				displayName: 'Files',
				name: 'files',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add File',
				default: {},
				description: 'Files from the input item copied into the container before it starts',
				options: [
					{
						displayName: 'File',
						name: 'values',
						values: [
							{
								displayName: 'Input Binary Field',
								name: 'binaryProperty',
								type: 'string',
								default: 'data',
								placeholder: 'e.g. data',
								hint: 'The name of the input item field that contains the file',
								description: 'Name of the binary property holding the file to send',
							},
							{
								displayName: 'Container Path',
								name: 'containerPath',
								type: 'string',
								default: '',
								placeholder: 'e.g. /work/input.csv',
								hint: 'Leave empty to place it at /files/&lt;file name&gt;',
								description: 'Absolute path where the file is placed inside the container',
							},
						],
					},
				],
			},
			{
				displayName: 'Entrypoint',
				name: 'entrypoint',
				type: 'string',
				default: '',
				placeholder: 'e.g. /bin/sh',
				hint: "Only needed to replace the image's ENTRYPOINT. Most images work without it.",
				description: "Overrides the image's ENTRYPOINT",
			},
			{
				displayName: 'Ignore Pull Cache',
				name: 'ignorePullCache',
				type: 'boolean',
				default: false,
				description:
					'Whether to always pull the image from the registry instead of reusing a cached copy. Slower, but guarantees the newest version of the tag.',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 60,
				placeholder: 'e.g. 60',
				hint: 'The container is stopped once the timeout is reached and the run fails',
				description: 'Maximum time in seconds to wait for the container to finish',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let items = this.getInputData();

		const executeOnce = this.getNodeParameter('executeOnce', 0) as boolean;
		if (executeOnce) {
			items = [items[0]];
		}

		this.addExecutionHints({
			type: 'warning',
			message: 'The sandbox integration is stubbed: no container was actually executed',
			location: 'outputPane',
		});

		const returnItems: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const image = (this.getNodeParameter('image', itemIndex) as string).trim();
				const command = (this.getNodeParameter('command', itemIndex) as string).trim();
				const entrypoint = (this.getNodeParameter('entrypoint', itemIndex) as string).trim();
				const argv = this.getNodeParameter('argv', itemIndex, []) as string[];
				const env = this.getNodeParameter('env.values', itemIndex, []) as Array<{
					name: string;
					value: string;
				}>;
				const fileEntries = this.getNodeParameter('files.values', itemIndex, []) as Array<{
					binaryProperty: string;
					containerPath: string;
				}>;

				const files: ContainerFile[] = [];
				for (const { binaryProperty, containerPath } of fileEntries) {
					const propertyName = binaryProperty.trim();
					if (propertyName === '') {
						continue;
					}
					const binaryData = this.helpers.assertBinaryData(itemIndex, propertyName);
					const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, propertyName);
					const fileName = binaryData.fileName ?? propertyName;
					files.push({
						path: containerPath.trim() || `/files/${fileName}`,
						fileName,
						mimeType: binaryData.mimeType,
						size: buffer.length,
						contentBase64: buffer.toString('base64'),
					});
				}
				const ignorePullCache = this.getNodeParameter('ignorePullCache', itemIndex) as boolean;
				const timeout = this.getNodeParameter('timeout', itemIndex) as number;

				if (!Number.isFinite(timeout) || timeout <= 0) {
					throw new NodeOperationError(
						this.getNode(),
						'The timeout must be a positive number of seconds',
						{ itemIndex },
					);
				}

				if (image === '') {
					throw new NodeOperationError(this.getNode(), 'The Docker image is required', {
						itemIndex,
					});
				}

				const result = await runContainer.call(this, {
					image,
					entrypoint: entrypoint === '' ? undefined : entrypoint,
					command: command === '' ? undefined : command,
					args: argv.filter((arg) => arg !== ''),
					env: env
						.map(({ name, value }) => ({ name: name.trim(), value }))
						.filter(({ name }) => name !== ''),
					files,
					ignorePullCache,
					timeoutSeconds: timeout,
				});

				if (result.timedOut) {
					throw new NodeOperationError(this.getNode(), 'The container run timed out', {
						itemIndex,
						description: `The container did not finish within ${timeout} seconds`,
					});
				}

				if (result.exitCode !== 0) {
					throw new NodeOperationError(this.getNode(), 'The container exited with an error', {
						itemIndex,
						description: result.stderr || `Exit code: ${result.exitCode}`,
					});
				}

				returnItems.push({
					json: { ...result },
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems.push({
						json: { error: ensureError(error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnItems];
	}
}
