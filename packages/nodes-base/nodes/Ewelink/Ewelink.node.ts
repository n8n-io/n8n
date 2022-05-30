import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import ewelink from 'ewelink-api';

import { deviceFields, deviceOperations } from './DeviceDescription';

export class Ewelink implements INodeType {
	description: INodeTypeDescription = {
			displayName: 'Ewelink',
			name: 'ewelink',
			icon: 'file:Ewelink.svg',
			group: ['transform'],
			version: 1,
			subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
			description: 'Consume Ewelink API',
			defaults: {
					name: 'Ewelink',
					color: '#1A82e2',
			},
			inputs: ['main'],
			outputs: ['main'],
			credentials: [
				{
					name: 'ewelinkApi',
					required: false,
					testedBy: 'ewelinkApiTest',
			},
			],
			properties: [
				{
					displayName: 'Resource',
					name: 'resource',
					noDataExpression: true,
					type: 'options',
					options: [
							{
									name: 'Device',
									value: 'device',
							},
					],
					default: 'device',
					required: true,
					// eslint-disable-next-line n8n-nodes-base/node-param-description-weak
					description: 'Resource to consume from eweLink-api',
			},
			...deviceOperations,
			...deviceFields,
		],
	};

	methods = {
		credentialTest: {
			async ewelinkApiTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
				const credentials = await credential.data as IDataObject;

				try {
					const connection = new ewelink({
						email: `${credentials.email}`,
						password: `${credentials.password}`,
					});

					const loginStatus = await connection.getDevices();
					//@ts-ignore
					if(!loginStatus.error){
						return {
							status: 'OK',
							message: 'Authentication successful',
						};
					}
					else {
						throw new Error('Authentication failed');
					}
				} catch (error) {
					return {
						status: 'Error',
						message: `Auth settings are not valid: Authentication failed - status 406`,
					};
				}
			},
		},
	};
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: IDataObject[] = [];

		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('ewelinkApi') as IDataObject;
		const connection = new ewelink({
			email: `${credentials.email}`,
			password: `${credentials.password}`,
			// region: 'as',
		});
		try {
			if (resource === 'device') {
				if (operation === 'getDevices') {
					responseData = await connection.getDevices();
					//@ts-ignore
					returnData.push(responseData);
				}
				if (operation === 'getDevice') {
					const deviceId = this.getNodeParameter('deviceId', 0) as string;

					responseData = await connection.getDevice(deviceId);
					//@ts-ignore
					returnData.push(responseData);
				}
				if (operation === 'getDevicePowerState') {
					const deviceId = this.getNodeParameter('deviceId', 0) as string;

					responseData = await connection.getDevicePowerState(deviceId);
					//@ts-ignore
					returnData.push(responseData);
				}
				if (operation === 'getDeviceChannelCount') {
					const deviceId = this.getNodeParameter('deviceId', 0) as string;

					responseData = await connection.getDeviceChannelCount(deviceId);
					//@ts-ignore
					returnData.push(responseData);
				}
				if (operation === 'getDeviceCurrentHumidity') {
					const deviceId = this.getNodeParameter('deviceId', 0) as string;

					responseData = await connection.getDeviceCurrentHumidity(deviceId);
					//@ts-ignore
					returnData.push(responseData);
				}
				if (operation === 'getDeviceCurrentTH') {
					const deviceId = this.getNodeParameter('deviceId', 0) as string;

					responseData = await connection.getDeviceCurrentTH(deviceId);
					//@ts-ignore
					returnData.push(responseData);
				}
				if (operation === 'getDeviceCurrentTemperature') {
					const deviceId = this.getNodeParameter('deviceId', 0) as string;

					responseData = await connection.getDeviceCurrentTemperature(deviceId);
					//@ts-ignore
					returnData.push(responseData);
				}
				if (operation === 'getDevicePowerUsage') {
					const deviceId = this.getNodeParameter('deviceId', 0) as string;

					responseData = await connection.getDevicePowerUsage(deviceId);
					//@ts-ignore
					returnData.push(responseData);
				}
				if (operation === 'getFirmwareVersion') {
					const deviceId = this.getNodeParameter('deviceId', 0) as string;

					responseData = await connection.getFirmwareVersion(deviceId);
					//@ts-ignore
					returnData.push(responseData);
				}
				if (operation === 'toggleDevice') {
					const deviceId = this.getNodeParameter('deviceId', 0) as string;

					responseData = await connection.toggleDevice(deviceId);
					//@ts-ignore
					returnData.push(responseData);
				}
				if (operation === 'setDevicePowerState') {
					const deviceId = this.getNodeParameter('deviceId', 0) as string;
					const devicePowerState = this.getNodeParameter('devicePowerState', 0) as boolean;

					responseData = await connection.setDevicePowerState(deviceId, devicePowerState ? 'on' : 'off');
					//@ts-ignore
					returnData.push(responseData);
				}
			}
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ error: error.message });
			} else {
				throw error;
			}
		}

		// Map data to n8n data
		//@ts-ignore
		return [this.helpers.returnJsonArray(responseData)];
}

}
