import { ensureError } from '@n8n/utils/errors/ensure-error';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type { ContainerFile } from './GenericFunctions';
import { isValidJobFilePath, runContainer } from './GenericFunctions';

const parseHttpUrl = (value: string): URL | undefined => {
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : undefined;
	} catch {
		return undefined;
	}
};

const fileNameFromUrl = (url: URL): string => {
	const segments = url.pathname.split('/').filter((segment) => segment !== '');
	return segments[segments.length - 1] ?? '';
};

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
			{
				type: 'warning',
				message:
					'Entrypoint and Ignore Pull Cache are not supported by the sandbox yet and are ignored',
				displayCondition: '={{ !!$parameter["entrypoint"] || !!$parameter["ignorePullCache"] }}',
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
				description: 'Files copied into the container before it starts',
				options: [
					{
						displayName: 'File',
						name: 'values',
						values: [
							{
								displayName: 'Source',
								name: 'source',
								type: 'options',
								options: [
									{
										name: 'Input Binary Field',
										value: 'binary',
										description: 'Send a file from the input item binary data',
									},
									{
										name: 'URL',
										value: 'url',
										description: 'The sandbox downloads the file from a URL',
									},
								],
								default: 'binary',
								description: 'Where the file comes from',
							},
							{
								displayName: 'Input Binary Field',
								name: 'binaryProperty',
								type: 'string',
								default: 'data',
								placeholder: 'e.g. data',
								hint: 'The name of the input item field that contains the file',
								description: 'Name of the binary property holding the file to send',
								displayOptions: {
									show: {
										source: ['binary'],
									},
								},
							},
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								default: '',
								placeholder: 'e.g. https://example.com/photo.png',
								hint: 'The sandbox downloads the URL server-side, no need to fetch it in the workflow first',
								description: 'HTTP(S) URL of the file to download into the container',
								displayOptions: {
									show: {
										source: ['url'],
									},
								},
							},
							{
								displayName: 'Container Path',
								name: 'containerPath',
								type: 'string',
								default: '',
								placeholder: 'e.g. input.csv',
								hint: 'Relative path: the file appears at /n8n/&lt;path&gt; in the container. Leave empty to use the file name (from the binary data or the URL).',
								description: 'Path of the file inside the container, relative to /n8n',
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
				hint: "Ignored for the moment: the sandbox always uses the image's own ENTRYPOINT",
				description: "Overrides the image's ENTRYPOINT",
			},
			{
				displayName: 'Ignore Pull Cache',
				name: 'ignorePullCache',
				type: 'boolean',
				default: false,
				description:
					'Whether to always pull the image from the registry instead of reusing a cached copy. Ignored for the moment: the sandbox decides when to pull.',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 900,
				},
				default: 60,
				placeholder: 'e.g. 60',
				hint: 'The container is stopped once the timeout is reached and the run fails',
				description: 'Maximum time in seconds to wait for the container to finish (up to 900)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let items = this.getInputData();

		const executeOnce = this.getNodeParameter('executeOnce', 0) as boolean;
		if (executeOnce) {
			items = [items[0]];
		}
		this.logger.info('Docker node: execution started', {
			itemCount: items.length,
			executeOnce,
		});

		const returnItems: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const image = (this.getNodeParameter('image', itemIndex) as string).trim();
				const command = (this.getNodeParameter('command', itemIndex) as string).trim();
				const argv = this.getNodeParameter('argv', itemIndex, []) as string[];
				const env = this.getNodeParameter('env.values', itemIndex, []) as Array<{
					name: string;
					value: string;
				}>;
				const fileEntries = this.getNodeParameter('files.values', itemIndex, []) as Array<{
					source?: 'binary' | 'url';
					binaryProperty?: string;
					containerPath?: string;
					url?: string;
				}>;

				const assertValidJobFilePath = (path: string) => {
					if (isValidJobFilePath(path)) {
						return;
					}
					this.logger.error('Docker node: invalid container path for input file', {
						itemIndex,
						path,
					});
					throw new NodeOperationError(this.getNode(), 'The container path is invalid', {
						itemIndex,
						description: `"${path}" must be relative (no leading /), contain only letters, digits, dots, dashes, underscores and slashes, and have no ".." segments`,
					});
				};

				const files: ContainerFile[] = [];
				for (const entry of fileEntries) {
					const containerPath = (entry.containerPath ?? '').trim();
					if ((entry.source ?? 'binary') === 'url') {
						const url = (entry.url ?? '').trim();
						if (url === '') {
							continue;
						}
						const parsedUrl = parseHttpUrl(url);
						if (parsedUrl === undefined) {
							this.logger.error('Docker node: invalid file URL', { itemIndex, url });
							throw new NodeOperationError(this.getNode(), 'The file URL is invalid', {
								itemIndex,
								description: `"${url}" must be a valid http(s) URL`,
							});
						}
						const path = containerPath || fileNameFromUrl(parsedUrl);
						assertValidJobFilePath(path);
						files.push({ source: 'url', path, url });
						continue;
					}
					const propertyName = (entry.binaryProperty ?? '').trim();
					if (propertyName === '') {
						continue;
					}
					const binaryData = this.helpers.assertBinaryData(itemIndex, propertyName);
					const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, propertyName);
					const fileName = binaryData.fileName ?? propertyName;
					const path = containerPath || fileName;
					assertValidJobFilePath(path);
					files.push({
						source: 'binary',
						path,
						fileName,
						mimeType: binaryData.mimeType,
						size: buffer.length,
						content: buffer,
					});
				}
				const timeout = this.getNodeParameter('timeout', itemIndex) as number;

				if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 900) {
					this.logger.error('Docker node: timeout out of range', { itemIndex, timeout });
					throw new NodeOperationError(
						this.getNode(),
						'The timeout must be between 1 and 900 seconds',
						{ itemIndex },
					);
				}

				if (image === '') {
					this.logger.error('Docker node: no image provided', { itemIndex });
					throw new NodeOperationError(this.getNode(), 'The Docker image is required', {
						itemIndex,
					});
				}
				this.logger.info('Docker node: running container for item', { itemIndex, image });

				const result = await runContainer.call(this, {
					image,
					command: command === '' ? undefined : command,
					args: argv.filter((arg) => arg !== ''),
					env: env
						.map(({ name, value }) => ({ name: name.trim(), value }))
						.filter(({ name }) => name !== ''),
					files,
					timeoutSeconds: timeout,
				});

				if (result.timedOut) {
					this.logger.error('Docker node: container run timed out', {
						itemIndex,
						jobId: result.jobId,
						timeout,
					});
					throw new NodeOperationError(this.getNode(), 'The container run timed out', {
						itemIndex,
						description: `The container did not finish within ${timeout} seconds`,
					});
				}

				if (!result.success) {
					this.logger.error('Docker node: container exited with an error', {
						itemIndex,
						jobId: result.jobId,
						exitCode: result.exitCode,
						killed: result.killed,
					});
					throw new NodeOperationError(this.getNode(), 'The container exited with an error', {
						itemIndex,
						description: result.stderr.slice(-2000) || `Exit code: ${result.exitCode}`,
					});
				}

				this.logger.info('Docker node: item processed', {
					itemIndex,
					jobId: result.jobId,
					executionTimeMs: result.executionTimeMs,
				});

				returnItems.push({
					json: { ...result },
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					this.logger.warn('Docker node: item failed, continuing with the next one', {
						itemIndex,
						error: ensureError(error).message,
					});
					returnItems.push({
						json: { error: ensureError(error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				this.logger.error('Docker node: item failed', {
					itemIndex,
					error: ensureError(error).message,
				});
				throw error;
			}
		}

		this.logger.info('Docker node: execution finished', { itemCount: returnItems.length });
		return [returnItems];
	}
}
