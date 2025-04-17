import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { awsApiRequestSOAP, awsApiRequestSOAPAllItems } from './GenericFunctions';
import {
	listenerCertificateFields,
	listenerCertificateOperations,
} from './ListenerCertificateDescription';
import { loadBalancerFields, loadBalancerOperations } from './LoadBalancerDescription';

export class AwsElb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS ELB',
		name: 'awsElb',
		icon: 'file:elb.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to AWS ELB API',
		defaults: {
			name: 'AWS ELB',
		},
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Listener Certificate',
						value: 'listenerCertificate',
					},
					{
						name: 'Load Balancer',
						value: 'loadBalancer',
					},
				],
				default: 'loadBalancer',
			},
			...loadBalancerOperations,
			...loadBalancerFields,

			...listenerCertificateOperations,
			...listenerCertificateFields,
		],
	};

	methods = {
		loadOptions: {
			async getLoadBalancers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const params = ['Version=2015-12-01'];

				const data = await awsApiRequestSOAP.call(
					this,
					'elasticloadbalancing',
					'GET',
					'/?Action=DescribeLoadBalancers&' + params.join('&'),
				);

				let loadBalancers =
					data.DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancers.member;

				if (!Array.isArray(loadBalancers)) {
					loadBalancers = [loadBalancers];
				}

				for (const loadBalancer of loadBalancers) {
					const loadBalancerArn = loadBalancer.LoadBalancerArn as string;

					const loadBalancerName = loadBalancer.LoadBalancerName as string;

					returnData.push({
						name: loadBalancerName,
						value: loadBalancerArn,
					});
				}

				return returnData;
			},

			async getLoadBalancerListeners(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const loadBalancerId = this.getCurrentNodeParameter('loadBalancerId') as string;

				const params = ['Version=2015-12-01', 'LoadBalancerArn=' + loadBalancerId];

				const data = await awsApiRequestSOAP.call(
					this,
					'elasticloadbalancing',
					'GET',
					'/?Action=DescribeListeners&' + params.join('&'),
				);

				let listeners = data.DescribeListenersResponse.DescribeListenersResult.Listeners.member;

				if (!Array.isArray(listeners)) {
					listeners = [listeners];
				}

				for (const listener of listeners) {
					const listenerArn = listener.ListenerArn as string;

					const listenerName = listener.ListenerArn as string;

					returnData.push({
						name: listenerArn,
						value: listenerName,
					});
				}

				return returnData;
			},

			async getSecurityGroups(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const body = ['Version=2016-11-15', 'Action=DescribeSecurityGroups'].join('&');

				const data = await awsApiRequestSOAP.call(
					this,
					'ec2',
					'POST',
					'/',
					body,
					{},
					{
						'Content-Type': 'application/x-www-form-urlencoded',
						charset: 'utf-8',
						'User-Agent': 'aws-cli/1.18.124',
					},
				);

				let securityGroups = data.DescribeSecurityGroupsResponse.securityGroupInfo.item;

				if (!Array.isArray(securityGroups)) {
					securityGroups = [securityGroups];
				}

				for (const securityGroup of securityGroups) {
					const securityGroupId = securityGroup.groupId as string;

					const securityGroupName = securityGroup.groupName as string;

					returnData.push({
						name: securityGroupName,
						value: securityGroupId,
					});
				}

				return returnData;
			},

			async getSubnets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const body = ['Version=2016-11-15', 'Action=DescribeSubnets'].join('&');

				const data = await awsApiRequestSOAP.call(
					this,
					'ec2',
					'POST',
					'/',
					body,
					{},
					{
						'Content-Type': 'application/x-www-form-urlencoded',
						charset: 'utf-8',
						'User-Agent': 'aws-cli/1.18.124',
					},
				);

				let subnets = data.DescribeSubnetsResponse.subnetSet.item;

				if (!Array.isArray(subnets)) {
					subnets = [subnets];
				}

				for (const subnet of subnets) {
					const subnetId = subnet.subnetId as string;

					const subnetName = subnet.subnetId as string;

					returnData.push({
						name: subnetName,
						value: subnetId,
					});
				}

				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'listenerCertificate') {
					//https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_AddListenerCertificates.html
					if (operation === 'add') {
						const params = ['Version=2015-12-01'];

						params.push(
							'Certificates.member.1.CertificateArn=' +
								(this.getNodeParameter('certificateId', i) as string),
						);

						params.push('ListenerArn=' + (this.getNodeParameter('listenerId', i) as string));

						responseData = await awsApiRequestSOAP.call(
							this,
							'elasticloadbalancing',
							'GET',
							'/?Action=AddListenerCertificates&' + params.join('&'),
						);

						responseData =
							responseData.AddListenerCertificatesResponse.AddListenerCertificatesResult
								.Certificates.member;
					}

					//https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_DescribeListenerCertificates.html
					if (operation === 'getMany') {
						const params = ['Version=2015-12-01'];

						const returnAll = this.getNodeParameter('returnAll', 0);

						const listenerId = this.getNodeParameter('listenerId', i) as string;

						params.push(`ListenerArn=${listenerId}`);

						if (returnAll) {
							responseData = await awsApiRequestSOAPAllItems.call(
								this,
								'DescribeListenerCertificatesResponse.DescribeListenerCertificatesResult.Certificates.member',
								'elasticloadbalancing',
								'GET',
								'/?Action=DescribeListenerCertificates&' + params.join('&'),
							);
						} else {
							params.push('PageSize=' + (this.getNodeParameter('limit', 0) as unknown as string));

							responseData = await awsApiRequestSOAP.call(
								this,
								'elasticloadbalancing',
								'GET',
								'/?Action=DescribeListenerCertificates&' + params.join('&'),
							);

							responseData =
								responseData.DescribeListenerCertificatesResponse.DescribeListenerCertificatesResult
									.Certificates.member;
						}
					}

					//https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_RemoveListenerCertificates.html
					if (operation === 'remove') {
						const params = ['Version=2015-12-01'];

						params.push(
							'Certificates.member.1.CertificateArn=' +
								(this.getNodeParameter('certificateId', i) as string),
						);

						params.push('ListenerArn=' + (this.getNodeParameter('listenerId', i) as string));

						responseData = await awsApiRequestSOAP.call(
							this,
							'elasticloadbalancing',
							'GET',
							'/?Action=RemoveListenerCertificates&' + params.join('&'),
						);

						responseData = { sucess: true };
					}
				}

				if (resource === 'loadBalancer') {
					//https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_CreateLoadBalancer.html
					if (operation === 'create') {
						const ipAddressType = this.getNodeParameter('ipAddressType', i) as string;

						const name = this.getNodeParameter('name', i) as string;

						const schema = this.getNodeParameter('schema', i) as string;

						const type = this.getNodeParameter('type', i) as string;

						const subnets = this.getNodeParameter('subnets', i) as string[];

						const additionalFields = this.getNodeParameter('additionalFields', i);

						const params = ['Version=2015-12-01'];

						params.push(`IpAddressType=${ipAddressType}`);

						params.push(`Name=${name}`);

						params.push(`Scheme=${schema}`);

						params.push(`Type=${type}`);

						for (let index = 1; index <= subnets.length; index++) {
							params.push(`Subnets.member.${index}=${subnets[index - 1]}`);
						}

						if (additionalFields.securityGroups) {
							const securityGroups = additionalFields.securityGroups as string[];

							for (let index = 1; index <= securityGroups.length; index++) {
								params.push(`SecurityGroups.member.${index}=${securityGroups[index - 1]}`);
							}
						}

						if (additionalFields.tagsUi) {
							const tags = (additionalFields.tagsUi as IDataObject).tagValues as IDataObject[];

							if (tags) {
								for (let index = 1; index <= tags.length; index++) {
									params.push(`Tags.member.${index}.Key=${tags[index - 1].key}`);

									params.push(`Tags.member.${index}.Value=${tags[index - 1].value}`);
								}
							}
						}

						responseData = await awsApiRequestSOAP.call(
							this,
							'elasticloadbalancing',
							'GET',
							'/?Action=CreateLoadBalancer&' + params.join('&'),
						);

						responseData =
							responseData.CreateLoadBalancerResponse.CreateLoadBalancerResult.LoadBalancers.member;
					}

					//https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_DeleteLoadBalancer.html
					if (operation === 'delete') {
						const params = ['Version=2015-12-01'];

						params.push(
							'LoadBalancerArn=' + (this.getNodeParameter('loadBalancerId', i) as string),
						);

						responseData = await awsApiRequestSOAP.call(
							this,
							'elasticloadbalancing',
							'GET',
							'/?Action=DeleteLoadBalancer&' + params.join('&'),
						);

						responseData = { success: true };
					}

					//https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_DescribeLoadBalancers.html
					if (operation === 'getMany') {
						const params = ['Version=2015-12-01'];

						const returnAll = this.getNodeParameter('returnAll', 0);

						if (returnAll) {
							const filters = this.getNodeParameter('filters', i);

							if (filters.names) {
								const names = (filters.names as string).split(',');

								for (let index = 1; index <= names.length; index++) {
									params.push(`Names.member.${index}=${names[index - 1]}`);
								}
							}

							responseData = await awsApiRequestSOAPAllItems.call(
								this,
								'DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancers.member',
								'elasticloadbalancing',
								'GET',
								'/?Action=DescribeLoadBalancers&' + params.join('&'),
							);
						} else {
							params.push('PageSize=' + this.getNodeParameter('limit', 0).toString());

							responseData = await awsApiRequestSOAP.call(
								this,
								'elasticloadbalancing',
								'GET',
								'/?Action=DescribeLoadBalancers&' + params.join('&'),
							);

							responseData =
								responseData.DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancers
									.member;
						}
					}

					//https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_DescribeLoadBalancers.html
					if (operation === 'get') {
						const params = ['Version=2015-12-01'];

						params.push(
							'LoadBalancerArns.member.1=' + (this.getNodeParameter('loadBalancerId', i) as string),
						);

						responseData = await awsApiRequestSOAP.call(
							this,
							'elasticloadbalancing',
							'GET',
							'/?Action=DescribeLoadBalancers&' + params.join('&'),
						);

						responseData =
							responseData.DescribeLoadBalancersResponse.DescribeLoadBalancersResult.LoadBalancers
								.member;
					}
				}

				returnData.push(
					...this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData as IDataObject),
						{
							itemData: { item: i },
						},
					),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as JsonObject).toString() });
					continue;
				}

				throw error;
			}
		}

		return [returnData as INodeExecutionData[]];
	}
}
