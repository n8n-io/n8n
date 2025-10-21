import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';

import { awsApiRequestSOAP } from '../GenericFunctions';

export class AwsRds implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS RDS',
		name: 'awsRds',
		icon: 'file:rds.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Manage AWS RDS database instances',
		defaults: {
			name: 'AWS RDS',
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
						name: 'Create DB Instance',
						value: 'createDBInstance',
						description: 'Create a new RDS database instance',
						action: 'Create a database instance',
					},
					{
						name: 'Describe DB Instances',
						value: 'describeDBInstances',
						description: 'Get details about RDS database instances',
						action: 'Describe database instances',
					},
					{
						name: 'Start DB Instance',
						value: 'startDBInstance',
						description: 'Start a stopped RDS database instance',
						action: 'Start a database instance',
					},
					{
						name: 'Stop DB Instance',
						value: 'stopDBInstance',
						description: 'Stop a running RDS database instance',
						action: 'Stop a database instance',
					},
					{
						name: 'Delete DB Instance',
						value: 'deleteDBInstance',
						description: 'Delete an RDS database instance',
						action: 'Delete a database instance',
					},
					{
						name: 'Create DB Snapshot',
						value: 'createDBSnapshot',
						description: 'Create a manual snapshot of a database instance',
						action: 'Create a database snapshot',
					},
					{
						name: 'Restore DB Instance from Snapshot',
						value: 'restoreDBInstance',
						description: 'Create a new DB instance from a snapshot',
						action: 'Restore database from snapshot',
					},
					{
						name: 'Modify DB Instance',
						value: 'modifyDBInstance',
						description: 'Modify settings of an existing DB instance',
						action: 'Modify a database instance',
					},
				],
				default: 'describeDBInstances',
			},
			// Create DB Instance
			{
				displayName: 'DB Instance Identifier',
				name: 'dbInstanceIdentifier',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createDBInstance'],
					},
				},
				default: '',
				required: true,
				description: 'Unique identifier for DB instance',
			},
			{
				displayName: 'DB Instance Class',
				name: 'dbInstanceClass',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['createDBInstance'],
					},
				},
				options: [
					{ name: 'db.t3.micro', value: 'db.t3.micro' },
					{ name: 'db.t3.small', value: 'db.t3.small' },
					{ name: 'db.t3.medium', value: 'db.t3.medium' },
					{ name: 'db.m5.large', value: 'db.m5.large' },
					{ name: 'db.m5.xlarge', value: 'db.m5.xlarge' },
					{ name: 'db.m5.2xlarge', value: 'db.m5.2xlarge' },
				],
				default: 'db.t3.micro',
				required: true,
				description: 'Instance size',
			},
			{
				displayName: 'Engine',
				name: 'engine',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['createDBInstance'],
					},
				},
				options: [
					{ name: 'MySQL', value: 'mysql' },
					{ name: 'PostgreSQL', value: 'postgres' },
					{ name: 'MariaDB', value: 'mariadb' },
					{ name: 'Oracle SE2', value: 'oracle-se2' },
					{ name: 'Oracle EE', value: 'oracle-ee' },
					{ name: 'SQL Server Express', value: 'sqlserver-ex' },
					{ name: 'SQL Server Standard', value: 'sqlserver-se' },
					{ name: 'SQL Server Enterprise', value: 'sqlserver-ee' },
				],
				default: 'mysql',
				required: true,
				description: 'Database engine',
			},
			{
				displayName: 'Master Username',
				name: 'masterUsername',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createDBInstance'],
					},
				},
				default: '',
				required: true,
				description: 'Master user name',
			},
			{
				displayName: 'Master User Password',
				name: 'masterUserPassword',
				type: 'string',
				typeOptions: {
					password: true,
				},
				displayOptions: {
					show: {
						operation: ['createDBInstance'],
					},
				},
				default: '',
				required: true,
				description: 'Master password (minimum 8 characters)',
			},
			{
				displayName: 'Allocated Storage',
				name: 'allocatedStorage',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['createDBInstance'],
					},
				},
				typeOptions: {
					minValue: 20,
					maxValue: 65536,
				},
				default: 20,
				required: true,
				description: 'Storage in GB',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['createDBInstance'],
					},
				},
				options: [
					{
						displayName: 'DB Name',
						name: 'dbName',
						type: 'string',
						default: '',
						description: 'Initial database name',
					},
					{
						displayName: 'Port',
						name: 'port',
						type: 'number',
						default: 3306,
						description: 'Port number (default based on engine)',
					},
					{
						displayName: 'Multi-AZ',
						name: 'multiAZ',
						type: 'boolean',
						default: false,
						description: 'Whether to enable multi-AZ deployment',
					},
					{
						displayName: 'Storage Type',
						name: 'storageType',
						type: 'options',
						options: [
							{ name: 'General Purpose (gp2)', value: 'gp2' },
							{ name: 'General Purpose (gp3)', value: 'gp3' },
							{ name: 'Provisioned IOPS (io1)', value: 'io1' },
							{ name: 'Magnetic (standard)', value: 'standard' },
						],
						default: 'gp2',
						description: 'Storage type',
					},
					{
						displayName: 'Backup Retention Period',
						name: 'backupRetentionPeriod',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 35,
						},
						default: 7,
						description: 'Days to retain backups (0-35)',
					},
					{
						displayName: 'Publicly Accessible',
						name: 'publiclyAccessible',
						type: 'boolean',
						default: false,
						description: 'Whether to make publicly accessible',
					},
					{
						displayName: 'VPC Security Group IDs',
						name: 'vpcSecurityGroupIds',
						type: 'string',
						default: '',
						description: 'Comma-separated security group IDs',
					},
					{
						displayName: 'DB Subnet Group Name',
						name: 'dbSubnetGroupName',
						type: 'string',
						default: '',
						description: 'DB subnet group name',
					},
				],
			},
			// Describe DB Instances
			{
				displayName: 'DB Instance Identifier',
				name: 'dbInstanceIdentifier',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['describeDBInstances'],
					},
				},
				default: '',
				description: 'Specific DB instance ID (leave empty for all)',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['describeDBInstances'],
					},
				},
				default: true,
				description: 'Whether to return all results',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['describeDBInstances'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			// Start/Stop DB Instance
			{
				displayName: 'DB Instance Identifier',
				name: 'dbInstanceIdentifier',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['startDBInstance', 'stopDBInstance'],
					},
				},
				default: '',
				required: true,
				description: 'DB instance ID',
			},
			{
				displayName: 'DB Snapshot Identifier',
				name: 'dbSnapshotIdentifier',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['stopDBInstance'],
					},
				},
				default: '',
				description: 'Create final snapshot with this ID (optional)',
			},
			// Delete DB Instance
			{
				displayName: 'DB Instance Identifier',
				name: 'dbInstanceIdentifier',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['deleteDBInstance'],
					},
				},
				default: '',
				required: true,
				description: 'DB instance ID to delete',
			},
			{
				displayName: 'Skip Final Snapshot',
				name: 'skipFinalSnapshot',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['deleteDBInstance'],
					},
				},
				default: false,
				required: true,
				description: 'Whether to skip final snapshot',
			},
			{
				displayName: 'Final DB Snapshot Identifier',
				name: 'finalDBSnapshotIdentifier',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['deleteDBInstance'],
						skipFinalSnapshot: [false],
					},
				},
				default: '',
				required: true,
				description: 'Snapshot name (required if not skipping)',
			},
			// Create DB Snapshot
			{
				displayName: 'DB Snapshot Identifier',
				name: 'dbSnapshotIdentifier',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createDBSnapshot'],
					},
				},
				default: '',
				required: true,
				description: 'Unique snapshot ID',
			},
			{
				displayName: 'DB Instance Identifier',
				name: 'dbInstanceIdentifier',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createDBSnapshot'],
					},
				},
				default: '',
				required: true,
				description: 'Source DB instance ID',
			},
			// Restore DB Instance
			{
				displayName: 'DB Instance Identifier',
				name: 'dbInstanceIdentifier',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['restoreDBInstance'],
					},
				},
				default: '',
				required: true,
				description: 'New DB instance ID',
			},
			{
				displayName: 'DB Snapshot Identifier',
				name: 'dbSnapshotIdentifier',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['restoreDBInstance'],
					},
				},
				default: '',
				required: true,
				description: 'Source snapshot ID',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['restoreDBInstance'],
					},
				},
				options: [
					{
						displayName: 'DB Instance Class',
						name: 'dbInstanceClass',
						type: 'options',
						options: [
							{ name: 'db.t3.micro', value: 'db.t3.micro' },
							{ name: 'db.t3.small', value: 'db.t3.small' },
							{ name: 'db.t3.medium', value: 'db.t3.medium' },
							{ name: 'db.m5.large', value: 'db.m5.large' },
						],
						default: 'db.t3.micro',
						description: 'Instance size (if different from snapshot)',
					},
					{
						displayName: 'Multi-AZ',
						name: 'multiAZ',
						type: 'boolean',
						default: false,
						description: 'Whether to enable multi-AZ',
					},
					{
						displayName: 'Publicly Accessible',
						name: 'publiclyAccessible',
						type: 'boolean',
						default: false,
						description: 'Whether to make publicly accessible',
					},
				],
			},
			// Modify DB Instance
			{
				displayName: 'DB Instance Identifier',
				name: 'dbInstanceIdentifier',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['modifyDBInstance'],
					},
				},
				default: '',
				required: true,
				description: 'DB instance to modify',
			},
			{
				displayName: 'Apply Immediately',
				name: 'applyImmediately',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['modifyDBInstance'],
					},
				},
				default: false,
				description: 'Whether to apply changes immediately or during maintenance window',
			},
			{
				displayName: 'Modification Fields',
				name: 'modificationFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['modifyDBInstance'],
					},
				},
				options: [
					{
						displayName: 'Allocated Storage',
						name: 'allocatedStorage',
						type: 'number',
						typeOptions: {
							minValue: 20,
						},
						default: 20,
						description: 'New storage size in GB',
					},
					{
						displayName: 'DB Instance Class',
						name: 'dbInstanceClass',
						type: 'options',
						options: [
							{ name: 'db.t3.micro', value: 'db.t3.micro' },
							{ name: 'db.t3.small', value: 'db.t3.small' },
							{ name: 'db.t3.medium', value: 'db.t3.medium' },
							{ name: 'db.m5.large', value: 'db.m5.large' },
						],
						default: 'db.t3.micro',
						description: 'New instance size',
					},
					{
						displayName: 'Master User Password',
						name: 'masterUserPassword',
						type: 'string',
						typeOptions: {
							password: true,
						},
						default: '',
						description: 'New master password',
					},
					{
						displayName: 'Backup Retention Period',
						name: 'backupRetentionPeriod',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 35,
						},
						default: 7,
						description: 'Backup retention days',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i);
				let responseData: any;

				if (operation === 'createDBInstance') {
					const dbInstanceIdentifier = this.getNodeParameter('dbInstanceIdentifier', i) as string;
					const dbInstanceClass = this.getNodeParameter('dbInstanceClass', i) as string;
					const engine = this.getNodeParameter('engine', i) as string;
					const masterUsername = this.getNodeParameter('masterUsername', i) as string;
					const masterUserPassword = this.getNodeParameter('masterUserPassword', i) as string;
					const allocatedStorage = this.getNodeParameter('allocatedStorage', i) as number;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					let path = `/?Action=CreateDBInstance&Version=2014-10-31&DBInstanceIdentifier=${dbInstanceIdentifier}&DBInstanceClass=${dbInstanceClass}&Engine=${engine}&MasterUsername=${masterUsername}&MasterUserPassword=${masterUserPassword}&AllocatedStorage=${allocatedStorage}`;

					if (additionalFields.dbName) {
						path += `&DBName=${additionalFields.dbName}`;
					}
					if (additionalFields.port) {
						path += `&Port=${additionalFields.port}`;
					}
					if (additionalFields.multiAZ) {
						path += `&MultiAZ=true`;
					}
					if (additionalFields.storageType) {
						path += `&StorageType=${additionalFields.storageType}`;
					}
					if (additionalFields.backupRetentionPeriod !== undefined) {
						path += `&BackupRetentionPeriod=${additionalFields.backupRetentionPeriod}`;
					}
					if (additionalFields.publiclyAccessible !== undefined) {
						path += `&PubliclyAccessible=${additionalFields.publiclyAccessible}`;
					}
					if (additionalFields.vpcSecurityGroupIds) {
						const groupIds = (additionalFields.vpcSecurityGroupIds as string)
							.split(',')
							.map((id) => id.trim());
						groupIds.forEach((id, index) => {
							path += `&VpcSecurityGroupIds.member.${index + 1}=${id}`;
						});
					}
					if (additionalFields.dbSubnetGroupName) {
						path += `&DBSubnetGroupName=${additionalFields.dbSubnetGroupName}`;
					}

					responseData = await awsApiRequestSOAP.call(this, 'rds', 'POST', path);
					responseData = responseData?.CreateDBInstanceResponse?.CreateDBInstanceResult?.DBInstance || {};
				} else if (operation === 'describeDBInstances') {
					const dbInstanceIdentifier = this.getNodeParameter('dbInstanceIdentifier', i, '') as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					let path = '/?Action=DescribeDBInstances&Version=2014-10-31';

					if (dbInstanceIdentifier) {
						path += `&DBInstanceIdentifier=${dbInstanceIdentifier}`;
					}

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;
						path += `&MaxRecords=${limit}`;
					}

					responseData = await awsApiRequestSOAP.call(this, 'rds', 'GET', path);

					const dbInstances =
						responseData?.DescribeDBInstancesResponse?.DescribeDBInstancesResult?.DBInstances
							?.DBInstance || [];
					responseData = Array.isArray(dbInstances) ? dbInstances : [dbInstances];
				} else if (operation === 'startDBInstance') {
					const dbInstanceIdentifier = this.getNodeParameter('dbInstanceIdentifier', i) as string;

					const path = `/?Action=StartDBInstance&Version=2014-10-31&DBInstanceIdentifier=${dbInstanceIdentifier}`;

					responseData = await awsApiRequestSOAP.call(this, 'rds', 'POST', path);
					responseData = responseData?.StartDBInstanceResponse?.StartDBInstanceResult?.DBInstance || {};
				} else if (operation === 'stopDBInstance') {
					const dbInstanceIdentifier = this.getNodeParameter('dbInstanceIdentifier', i) as string;
					const dbSnapshotIdentifier = this.getNodeParameter('dbSnapshotIdentifier', i, '') as string;

					let path = `/?Action=StopDBInstance&Version=2014-10-31&DBInstanceIdentifier=${dbInstanceIdentifier}`;

					if (dbSnapshotIdentifier) {
						path += `&DBSnapshotIdentifier=${dbSnapshotIdentifier}`;
					}

					responseData = await awsApiRequestSOAP.call(this, 'rds', 'POST', path);
					responseData = responseData?.StopDBInstanceResponse?.StopDBInstanceResult?.DBInstance || {};
				} else if (operation === 'deleteDBInstance') {
					const dbInstanceIdentifier = this.getNodeParameter('dbInstanceIdentifier', i) as string;
					const skipFinalSnapshot = this.getNodeParameter('skipFinalSnapshot', i) as boolean;

					let path = `/?Action=DeleteDBInstance&Version=2014-10-31&DBInstanceIdentifier=${dbInstanceIdentifier}&SkipFinalSnapshot=${skipFinalSnapshot}`;

					if (!skipFinalSnapshot) {
						const finalDBSnapshotIdentifier = this.getNodeParameter(
							'finalDBSnapshotIdentifier',
							i,
						) as string;
						if (!finalDBSnapshotIdentifier) {
							throw new NodeApiError(this.getNode(), {
								message: 'Final snapshot name required when not skipping snapshot',
							} as any);
						}
						path += `&FinalDBSnapshotIdentifier=${finalDBSnapshotIdentifier}`;
					}

					responseData = await awsApiRequestSOAP.call(this, 'rds', 'POST', path);
					responseData = responseData?.DeleteDBInstanceResponse?.DeleteDBInstanceResult?.DBInstance || {};
				} else if (operation === 'createDBSnapshot') {
					const dbSnapshotIdentifier = this.getNodeParameter('dbSnapshotIdentifier', i) as string;
					const dbInstanceIdentifier = this.getNodeParameter('dbInstanceIdentifier', i) as string;

					const path = `/?Action=CreateDBSnapshot&Version=2014-10-31&DBSnapshotIdentifier=${dbSnapshotIdentifier}&DBInstanceIdentifier=${dbInstanceIdentifier}`;

					responseData = await awsApiRequestSOAP.call(this, 'rds', 'POST', path);
					responseData = responseData?.CreateDBSnapshotResponse?.CreateDBSnapshotResult?.DBSnapshot || {};
				} else if (operation === 'restoreDBInstance') {
					const dbInstanceIdentifier = this.getNodeParameter('dbInstanceIdentifier', i) as string;
					const dbSnapshotIdentifier = this.getNodeParameter('dbSnapshotIdentifier', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					let path = `/?Action=RestoreDBInstanceFromDBSnapshot&Version=2014-10-31&DBInstanceIdentifier=${dbInstanceIdentifier}&DBSnapshotIdentifier=${dbSnapshotIdentifier}`;

					if (additionalFields.dbInstanceClass) {
						path += `&DBInstanceClass=${additionalFields.dbInstanceClass}`;
					}
					if (additionalFields.multiAZ) {
						path += '&MultiAZ=true';
					}
					if (additionalFields.publiclyAccessible !== undefined) {
						path += `&PubliclyAccessible=${additionalFields.publiclyAccessible}`;
					}

					responseData = await awsApiRequestSOAP.call(this, 'rds', 'POST', path);
					responseData =
						responseData?.RestoreDBInstanceFromDBSnapshotResponse
							?.RestoreDBInstanceFromDBSnapshotResult?.DBInstance || {};
				} else if (operation === 'modifyDBInstance') {
					const dbInstanceIdentifier = this.getNodeParameter('dbInstanceIdentifier', i) as string;
					const applyImmediately = this.getNodeParameter('applyImmediately', i) as boolean;
					const modificationFields = this.getNodeParameter('modificationFields', i, {}) as IDataObject;

					let path = `/?Action=ModifyDBInstance&Version=2014-10-31&DBInstanceIdentifier=${dbInstanceIdentifier}&ApplyImmediately=${applyImmediately}`;

					if (modificationFields.allocatedStorage) {
						path += `&AllocatedStorage=${modificationFields.allocatedStorage}`;
					}
					if (modificationFields.dbInstanceClass) {
						path += `&DBInstanceClass=${modificationFields.dbInstanceClass}`;
					}
					if (modificationFields.masterUserPassword) {
						path += `&MasterUserPassword=${modificationFields.masterUserPassword}`;
					}
					if (modificationFields.backupRetentionPeriod !== undefined) {
						path += `&BackupRetentionPeriod=${modificationFields.backupRetentionPeriod}`;
					}

					responseData = await awsApiRequestSOAP.call(this, 'rds', 'POST', path);
					responseData = responseData?.ModifyDBInstanceResponse?.ModifyDBInstanceResult?.DBInstance || {};
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
