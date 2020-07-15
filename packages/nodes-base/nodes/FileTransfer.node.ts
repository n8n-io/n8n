import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IBinaryData,
} from 'n8n-workflow';

let sftpClient = require('ssh2-sftp-client');

export class FileTransfer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'File Transfer',
		name: 'sftp',
		icon: 'fa:at',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["protocol"] + ": " + $parameter["operation"]}}',
		description: 'Transfers files via FTP or SFTP.',
		defaults: {
			name: 'FileTransfer',
			color: '#2200DD',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sftp',
                required: true,
				displayOptions: {
					show: {
						protocol: [
							'sftp',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Protocol',
				name: 'protocol',
				type: 'options',
				options: [
					{
						name: 'FTP',
						value: 'ftp'
                    },
                    {
						name: 'SFTP',
						value: 'sftp'
					},
				],
				default: 'ftp',
				description: 'File transfer protocol.',
            },
            {
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Download',
                        value: 'download',
                        description: 'Download a file.'
                    },
                    {
						name: 'List',
                        value: 'list',
                        description: 'List folder content.'
					},
                    {
						name: 'Upload',
                        value: 'upload',
                        description: 'Upload a file.'
                    },
				],
				default: 'download',
				description: 'Operation to perform.',
            },
            {
                displayName: 'File Path',
                displayOptions: {
					show: {
						operation: [
							'download',
						],
					},
				},
				name: 'filePath',
				type: 'string',
				default: '',
				description: 'The file path of the file to download. Has to contain the full path.',
            },
            {
                displayName: 'File Path',
                displayOptions: {
					show: {
						operation: [
							'upload',
						],
					},
				},
				name: 'filePath',
				type: 'string',
				default: '',
				description: 'The file path of the file to upload. Has to contain the full path.',
            },
            {
                displayName: 'Binary Data',
                displayOptions: {
					show: {
						operation: [
							'upload',
						],
					},
				},
				name: 'binaryData',
				type: 'boolean',
				default: '',
				description: 'The text content of the file to upload.',
            },
            {
                displayName: 'File Content',
                displayOptions: {
					show: {
						operation: [
							'upload',
						],
					},
				},
				name: 'fileContent',
				type: 'string',
				default: '',
				description: 'The text content of the file to upload.',
            },
		]
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;
        let sftp = new sftpClient();

		for (let i = 0; i < items.length; i++) {
            const protocol = this.getNodeParameter('protocol', 0) as string;

            if (protocol === 'sftp') {

                try {
                    await sftp.connect({
                        host: this.getNodeParameter('host', i),
                        port: this.getNodeParameter('port', i),
                        username: this.getNodeParameter('username', i),
                        password: this.getNodeParameter('password', i)
                      });
                } catch (error) {
                    throw new Error(error);
                    console.log(error);
                }

            }
        }

        if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else {
			returnData.push(responseData as unknown as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}