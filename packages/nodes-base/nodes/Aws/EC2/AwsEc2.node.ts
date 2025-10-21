import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';

import { awsApiRequestSOAP } from '../GenericFunctions';

export class AwsEc2 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS EC2',
		name: 'awsEc2',
		icon: 'file:ec2.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Manage AWS EC2 instances and resources',
		defaults: {
			name: 'AWS EC2',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Start Instance',
						value: 'startInstance',
						description: 'Start one or more stopped EC2 instances',
						action: 'Start an EC2 instance',
					},
					{
						name: 'Stop Instance',
						value: 'stopInstance',
						description: 'Stop one or more running EC2 instances',
						action: 'Stop an EC2 instance',
					},
					{
						name: 'Reboot Instance',
						value: 'rebootInstance',
						description: 'Reboot one or more EC2 instances',
						action: 'Reboot an EC2 instance',
					},
					{
						name: 'Terminate Instance',
						value: 'terminateInstance',
						description: 'Permanently delete one or more EC2 instances',
						action: 'Terminate an EC2 instance',
					},
					{
						name: 'Describe Instances',
						value: 'describeInstances',
						description: 'Get details about EC2 instances',
						action: 'Describe EC2 instances',
					},
					{
						name: 'Create Instance',
						value: 'createInstance',
						description: 'Launch new EC2 instances',
						action: 'Create an EC2 instance',
					},
					{
						name: 'Create AMI',
						value: 'createImage',
						description: 'Create Amazon Machine Image from an instance',
						action: 'Create an AMI',
					},
					{
						name: 'Describe Instance Status',
						value: 'describeInstanceStatus',
						description: 'Get status checks and scheduled events for instances',
						action: 'Describe instance status',
					},
				],
				default: 'describeInstances',
			},
			// Start Instance
			{
				displayName: 'Instance IDs',
				name: 'instanceIds',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['startInstance'],
					},
				},
				default: '',
				required: true,
				placeholder: 'i-1234567890abcdef0, i-0987654321fedcba0',
				description: 'Comma-separated list of instance IDs to start',
			},
			// Stop Instance
			{
				displayName: 'Instance IDs',
				name: 'instanceIds',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['stopInstance'],
					},
				},
				default: '',
				required: true,
				placeholder: 'i-1234567890abcdef0, i-0987654321fedcba0',
				description: 'Comma-separated list of instance IDs to stop',
			},
			{
				displayName: 'Force',
				name: 'force',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['stopInstance'],
					},
				},
				default: false,
				description: 'Whether to force stop the instance',
			},
			// Reboot Instance
			{
				displayName: 'Instance IDs',
				name: 'instanceIds',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['rebootInstance'],
					},
				},
				default: '',
				required: true,
				placeholder: 'i-1234567890abcdef0',
				description: 'Comma-separated instance IDs to reboot',
			},
			// Terminate Instance
			{
				displayName: 'Instance IDs',
				name: 'instanceIds',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['terminateInstance'],
					},
				},
				default: '',
				required: true,
				placeholder: 'i-1234567890abcdef0',
				description: 'Comma-separated instance IDs to terminate',
			},
			{
				displayName: 'Confirm Termination (Cannot Be Undone)',
				name: 'confirmTermination',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['terminateInstance'],
					},
				},
				default: false,
				required: true,
				description: 'Whether to confirm termination of instances',
			},
			// Describe Instances
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['describeInstances'],
					},
				},
				options: [
					{
						name: 'All Instances',
						value: 'all',
					},
					{
						name: 'Specific Instance IDs',
						value: 'instanceIds',
					},
					{
						name: 'By Tag',
						value: 'tag',
					},
					{
						name: 'By State',
						value: 'state',
					},
				],
				default: 'all',
				description: 'Specify which instances to describe',
			},
			{
				displayName: 'Instance IDs',
				name: 'instanceIds',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['describeInstances'],
						filters: ['instanceIds'],
					},
				},
				default: '',
				placeholder: 'i-1234567890abcdef0',
				description: 'Comma-separated instance IDs',
			},
			{
				displayName: 'Tag Key',
				name: 'tagKey',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['describeInstances'],
						filters: ['tag'],
					},
				},
				default: '',
				description: 'Tag key to filter by',
			},
			{
				displayName: 'Tag Value',
				name: 'tagValue',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['describeInstances'],
						filters: ['tag'],
					},
				},
				default: '',
				description: 'Tag value to filter by',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['describeInstances'],
						filters: ['state'],
					},
				},
				options: [
					{
						name: 'Running',
						value: 'running',
					},
					{
						name: 'Stopped',
						value: 'stopped',
					},
					{
						name: 'Stopping',
						value: 'stopping',
					},
					{
						name: 'Pending',
						value: 'pending',
					},
					{
						name: 'Shutting Down',
						value: 'shutting-down',
					},
					{
						name: 'Terminated',
						value: 'terminated',
					},
				],
				default: 'running',
				description: 'Instance state to filter by',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['describeInstances'],
					},
				},
				default: true,
				description: 'Whether to return all results or limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['describeInstances'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			// Create Instance
			{
				displayName: 'Image ID',
				name: 'imageId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createInstance'],
					},
				},
				default: '',
				required: true,
				placeholder: 'ami-0abcdef1234567890',
				description: 'AMI ID to launch from',
			},
			{
				displayName: 'Instance Type',
				name: 'instanceType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['createInstance'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getInstanceTypes',
				},
				default: 't2.micro',
				required: true,
				description: 'Instance size to launch',
			},
			{
				displayName: 'Count',
				name: 'count',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['createInstance'],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 10,
				},
				default: 1,
				required: true,
				description: 'Number of instances to launch',
			},
			{
				displayName: 'Key Name',
				name: 'keyName',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['createInstance'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getKeyPairs',
				},
				default: '',
				description: 'SSH key pair name',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['createInstance'],
					},
				},
				options: [
					{
						displayName: 'Subnet ID',
						name: 'subnetId',
						type: 'string',
						default: '',
						description: 'VPC subnet ID',
					},
					{
						displayName: 'Security Group IDs',
						name: 'securityGroupIds',
						type: 'string',
						default: '',
						description: 'Comma-separated security group IDs',
					},
					{
						displayName: 'IAM Instance Profile',
						name: 'iamInstanceProfile',
						type: 'string',
						default: '',
						description: 'IAM role ARN or name',
					},
					{
						displayName: 'User Data',
						name: 'userData',
						type: 'string',
						typeOptions: {
							rows: 4,
						},
						default: '',
						description: 'User data script (will be base64 encoded)',
					},
				],
			},
			// Create Image
			{
				displayName: 'Instance ID',
				name: 'instanceId',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createImage'],
					},
				},
				default: '',
				required: true,
				placeholder: 'i-1234567890abcdef0',
				description: 'Source instance ID',
			},
			{
				displayName: 'Image Name',
				name: 'imageName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createImage'],
					},
				},
				default: '',
				required: true,
				description: 'Name for the new AMI',
			},
			{
				displayName: 'Image Description',
				name: 'imageDescription',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createImage'],
					},
				},
				default: '',
				description: 'Description of the AMI',
			},
			{
				displayName: 'No Reboot',
				name: 'noReboot',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['createImage'],
					},
				},
				default: false,
				description: 'Whether to create image without rebooting instance',
			},
			// Describe Instance Status
			{
				displayName: 'Instance IDs',
				name: 'instanceIds',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['describeInstanceStatus'],
					},
				},
				default: '',
				placeholder: 'i-1234567890abcdef0',
				description: 'Specific instance IDs (comma-separated), leave empty for all',
			},
			{
				displayName: 'Include All Instances',
				name: 'includeAllInstances',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['describeInstanceStatus'],
					},
				},
				default: false,
				description: 'Whether to include stopped/terminated instances',
			},
		],
	};

	methods = {
		loadOptions: {
			async getInstanceTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return [
					{ name: 't2.micro', value: 't2.micro' },
					{ name: 't2.small', value: 't2.small' },
					{ name: 't2.medium', value: 't2.medium' },
					{ name: 't2.large', value: 't2.large' },
					{ name: 't3.micro', value: 't3.micro' },
					{ name: 't3.small', value: 't3.small' },
					{ name: 't3.medium', value: 't3.medium' },
					{ name: 't3.large', value: 't3.large' },
					{ name: 'm5.large', value: 'm5.large' },
					{ name: 'm5.xlarge', value: 'm5.xlarge' },
					{ name: 'm5.2xlarge', value: 'm5.2xlarge' },
					{ name: 'c5.large', value: 'c5.large' },
					{ name: 'c5.xlarge', value: 'c5.xlarge' },
					{ name: 'r5.large', value: 'r5.large' },
					{ name: 'r5.xlarge', value: 'r5.xlarge' },
				];
			},

			async getKeyPairs(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const data = await awsApiRequestSOAP.call(
						this,
						'ec2',
						'GET',
						'/?Action=DescribeKeyPairs&Version=2016-11-15',
					);

					const keyPairs = data?.DescribeKeyPairsResponse?.keySet?.item || [];
					const items = Array.isArray(keyPairs) ? keyPairs : [keyPairs];

					return items.map((kp: any) => ({
						name: kp.keyName,
						value: kp.keyName,
					}));
				} catch (error) {
					return [];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i);

				let responseData: any;

				if (operation === 'startInstance') {
					const instanceIds = (this.getNodeParameter('instanceIds', i) as string)
						.split(',')
						.map((id) => id.trim());

					let path = '/?Action=StartInstances&Version=2016-11-15';
					instanceIds.forEach((id, index) => {
						path += `&InstanceId.${index + 1}=${id}`;
					});

					responseData = await awsApiRequestSOAP.call(this, 'ec2', 'POST', path);

					const instances =
						responseData?.StartInstancesResponse?.instancesSet?.item || [];
					responseData = Array.isArray(instances) ? instances : [instances];
				} else if (operation === 'stopInstance') {
					const instanceIds = (this.getNodeParameter('instanceIds', i) as string)
						.split(',')
						.map((id) => id.trim());
					const force = this.getNodeParameter('force', i) as boolean;

					let path = '/?Action=StopInstances&Version=2016-11-15';
					instanceIds.forEach((id, index) => {
						path += `&InstanceId.${index + 1}=${id}`;
					});
					if (force) {
						path += '&Force=true';
					}

					responseData = await awsApiRequestSOAP.call(this, 'ec2', 'POST', path);

					const instances = responseData?.StopInstancesResponse?.instancesSet?.item || [];
					responseData = Array.isArray(instances) ? instances : [instances];
				} else if (operation === 'rebootInstance') {
					const instanceIds = (this.getNodeParameter('instanceIds', i) as string)
						.split(',')
						.map((id) => id.trim());

					let path = '/?Action=RebootInstances&Version=2016-11-15';
					instanceIds.forEach((id, index) => {
						path += `&InstanceId.${index + 1}=${id}`;
					});

					responseData = await awsApiRequestSOAP.call(this, 'ec2', 'POST', path);
					responseData = { success: true, instanceIds };
				} else if (operation === 'terminateInstance') {
					const confirmTermination = this.getNodeParameter('confirmTermination', i) as boolean;

					if (!confirmTermination) {
						throw new NodeApiError(this.getNode(), {
							message: 'Termination must be confirmed',
						} as any);
					}

					const instanceIds = (this.getNodeParameter('instanceIds', i) as string)
						.split(',')
						.map((id) => id.trim());

					let path = '/?Action=TerminateInstances&Version=2016-11-15';
					instanceIds.forEach((id, index) => {
						path += `&InstanceId.${index + 1}=${id}`;
					});

					responseData = await awsApiRequestSOAP.call(this, 'ec2', 'POST', path);

					const instances =
						responseData?.TerminateInstancesResponse?.instancesSet?.item || [];
					responseData = Array.isArray(instances) ? instances : [instances];
				} else if (operation === 'describeInstances') {
					const filters = this.getNodeParameter('filters', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					let path = '/?Action=DescribeInstances&Version=2016-11-15';

					if (filters === 'instanceIds') {
						const instanceIds = (this.getNodeParameter('instanceIds', i) as string)
							.split(',')
							.map((id) => id.trim());
						instanceIds.forEach((id, index) => {
							path += `&InstanceId.${index + 1}=${id}`;
						});
					} else if (filters === 'tag') {
						const tagKey = this.getNodeParameter('tagKey', i) as string;
						const tagValue = this.getNodeParameter('tagValue', i) as string;
						path += `&Filter.1.Name=tag:${tagKey}&Filter.1.Value.1=${tagValue}`;
					} else if (filters === 'state') {
						const state = this.getNodeParameter('state', i) as string;
						path += `&Filter.1.Name=instance-state-name&Filter.1.Value.1=${state}`;
					}

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;
						path += `&MaxResults=${limit}`;
					}

					responseData = await awsApiRequestSOAP.call(this, 'ec2', 'GET', path);

					const reservations =
						responseData?.DescribeInstancesResponse?.reservationSet?.item || [];
					const reservationList = Array.isArray(reservations) ? reservations : [reservations];

					const instances: any[] = [];
					for (const reservation of reservationList) {
						const instanceSet = reservation?.instancesSet?.item || [];
						const instanceList = Array.isArray(instanceSet) ? instanceSet : [instanceSet];
						instances.push(...instanceList);
					}

					responseData = instances.map((instance) => ({
						instanceId: instance.instanceId,
						instanceType: instance.instanceType,
						state: instance.instanceState?.name,
						publicIpAddress: instance.ipAddress || null,
						privateIpAddress: instance.privateIpAddress || null,
						launchTime: instance.launchTime,
						tags: instance.tagSet?.item || [],
					}));
				} else if (operation === 'createInstance') {
					const imageId = this.getNodeParameter('imageId', i) as string;
					const instanceType = this.getNodeParameter('instanceType', i) as string;
					const count = this.getNodeParameter('count', i) as number;
					const keyName = this.getNodeParameter('keyName', i, '') as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					let path = `/?Action=RunInstances&Version=2016-11-15&ImageId=${imageId}&InstanceType=${instanceType}&MinCount=${count}&MaxCount=${count}`;

					if (keyName) {
						path += `&KeyName=${keyName}`;
					}

					if (additionalFields.subnetId) {
						path += `&SubnetId=${additionalFields.subnetId}`;
					}

					if (additionalFields.securityGroupIds) {
						const securityGroupIds = (additionalFields.securityGroupIds as string)
							.split(',')
							.map((id) => id.trim());
						securityGroupIds.forEach((id, index) => {
							path += `&SecurityGroupId.${index + 1}=${id}`;
						});
					}

					if (additionalFields.iamInstanceProfile) {
						path += `&IamInstanceProfile.Name=${additionalFields.iamInstanceProfile}`;
					}

					if (additionalFields.userData) {
						const userData = Buffer.from(additionalFields.userData as string).toString(
							'base64',
						);
						path += `&UserData=${encodeURIComponent(userData)}`;
					}

					responseData = await awsApiRequestSOAP.call(this, 'ec2', 'POST', path);

					const instances = responseData?.RunInstancesResponse?.instancesSet?.item || [];
					responseData = Array.isArray(instances) ? instances : [instances];
				} else if (operation === 'createImage') {
					const instanceId = this.getNodeParameter('instanceId', i) as string;
					const imageName = this.getNodeParameter('imageName', i) as string;
					const imageDescription = this.getNodeParameter('imageDescription', i, '') as string;
					const noReboot = this.getNodeParameter('noReboot', i) as boolean;

					let path = `/?Action=CreateImage&Version=2016-11-15&InstanceId=${instanceId}&Name=${encodeURIComponent(imageName)}`;

					if (imageDescription) {
						path += `&Description=${encodeURIComponent(imageDescription)}`;
					}

					if (noReboot) {
						path += '&NoReboot=true';
					}

					responseData = await awsApiRequestSOAP.call(this, 'ec2', 'POST', path);

					responseData = {
						imageId: responseData?.CreateImageResponse?.imageId,
					};
				} else if (operation === 'describeInstanceStatus') {
					const instanceIds = this.getNodeParameter('instanceIds', i, '') as string;
					const includeAllInstances = this.getNodeParameter('includeAllInstances', i) as boolean;

					let path = '/?Action=DescribeInstanceStatus&Version=2016-11-15';

					if (instanceIds) {
						const ids = instanceIds.split(',').map((id) => id.trim());
						ids.forEach((id, index) => {
							path += `&InstanceId.${index + 1}=${id}`;
						});
					}

					if (includeAllInstances) {
						path += '&IncludeAllInstances=true';
					}

					responseData = await awsApiRequestSOAP.call(this, 'ec2', 'GET', path);

					const statuses =
						responseData?.DescribeInstanceStatusResponse?.instanceStatusSet?.item || [];
					responseData = Array.isArray(statuses) ? statuses : [statuses];
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
