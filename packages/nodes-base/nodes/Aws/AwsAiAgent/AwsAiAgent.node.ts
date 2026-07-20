import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { awsNodeAuthOptions, awsNodeCredentials } from '../utils';

export class AwsAiAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS AI Agent',
		name: 'awsAiAgent',
		icon: 'file:bedrock.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["identity"]}}',
		description:
			'Invoke an AI agent deployed on AWS Bedrock AgentCore Runtime as a step in a workflow',
		defaults: {
			name: 'AWS AI Agent',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: awsNodeCredentials,
		properties: [
			awsNodeAuthOptions,
			{
				displayName: 'Agent / Harness',
				name: 'harness',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The AgentCore harness to invoke',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'searchHarnesses',
							searchable: true,
						},
					},
					{
						displayName: 'By ARN',
						name: 'arn',
						type: 'string',
						placeholder: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:harness/my-agent-abc123',
					},
				],
			},
			{
				displayName: 'Input',
				name: 'input',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '={{ $json.chatInput }}',
				description: 'The prompt or messages to send to the agent',
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '={{ $json.sessionId }}',
				description: 'Identifier for multi-turn continuity across invocations',
			},
			{
				displayName: 'Identity',
				name: 'identity',
				type: 'options',
				default: 'iamPrincipal',
				description: 'How the agent invocation is authorized and scoped',
				options: [
					{
						name: 'IAM Credential (as Workflow Principal)',
						value: 'iamPrincipal',
						description: 'Invoke with the AWS credential above (baseline)',
					},
					{
						name: 'OAuth Bearer (on Behalf of User)',
						value: 'oauthBearer',
						description: "Pass the end user's JWT so tools run scoped to that user",
					},
					{
						name: 'Workload Identity (Coming Soon)',
						value: 'workloadIdentity',
						description: 'Inherit the rights of where the workflow runs',
					},
				],
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description:
					'Identifier of the end user the agent runs on behalf of (the bearer token itself comes from the credential, not from a node field)',
				displayOptions: {
					show: {
						identity: ['oauthBearer'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Actor ID',
						name: 'actorId',
						type: 'string',
						default: '',
						description: 'Actor identifier passed to the invocation',
					},
					{
						displayName: 'Allowed Tools',
						name: 'allowedTools',
						type: 'multiOptions',
						default: [],
						description: 'Restrict which tools the agent may use — leave empty to allow none',
						options: [
							{ name: 'Browser Automation', value: 'browser' },
							{ name: 'Calculator', value: 'calculator' },
							{ name: 'Code Interpreter', value: 'code_interpreter' },
							{ name: 'Email via SES', value: 'ses_email' },
							{ name: 'Human Approval', value: 'human_approval' },
							{ name: 'Knowledge Base Retrieval', value: 'kb_retrieval' },
							{ name: 'Lambda Invoke', value: 'lambda_invoke' },
							{ name: 'Memory Retrieval', value: 'memory_retrieval' },
							{ name: 'REST API Call', value: 'rest_api_call' },
							{ name: 'S3 File Access', value: 's3_file_access' },
							{ name: 'SQL Query', value: 'sql_query' },
							{ name: 'Web Search', value: 'web_search' },
						],
					},
					{
						displayName: 'Max Iterations',
						name: 'maxIterations',
						type: 'number',
						default: 10,
						description: 'Maximum reasoning/tool iterations the agent may run',
					},
					{
						displayName: 'Max Tokens',
						name: 'maxTokens',
						type: 'number',
						default: 4096,
						description: 'Maximum number of tokens to generate',
					},
					{
						displayName: 'Model Override',
						name: 'model',
						type: 'string',
						default: '',
						placeholder: 'anthropic.claude-3-5-sonnet',
						description: "Overrides the agent's model for this invocation",
					},
					{
						displayName: 'Qualifier / Endpoint',
						name: 'qualifier',
						type: 'string',
						default: '',
						description: 'Version, alias, or endpoint to target',
					},
					{
						displayName: 'Region',
						name: 'region',
						type: 'options',
						default: 'us-east-1',
						description: 'Overrides the region from your AWS credential',
						options: [
							{ name: 'Asia Pacific (Singapore)', value: 'ap-southeast-1' },
							{ name: 'Asia Pacific (Tokyo)', value: 'ap-northeast-1' },
							{ name: 'Europe (Frankfurt)', value: 'eu-central-1' },
							{ name: 'Europe (Ireland)', value: 'eu-west-1' },
							{ name: 'US East (N. Virginia)', value: 'us-east-1' },
							{ name: 'US West (Oregon)', value: 'us-west-2' },
						],
					},
					{
						displayName: 'Streaming',
						name: 'streaming',
						type: 'boolean',
						default: true,
						description: 'Whether to stream partial output as it is produced',
					},
					{
						displayName: 'System Prompt Override',
						name: 'systemPrompt',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: "Overrides the agent's system prompt for this invocation",
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						type: 'number',
						default: 60000,
						description: 'Maximum time to wait for the agent to respond, in milliseconds',
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			async searchHarnesses(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const harnesses: INodeListSearchItems[] = [
					{
						name: 'Customer Support Agent',
						value: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:harness/support-agent-abc123',
					},
					{
						name: 'Sales Research Agent',
						value: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:harness/sales-research-def456',
					},
					{
						name: 'Claims Triage Agent',
						value: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:harness/claims-triage-ghi789',
					},
				];

				const results = filter
					? harnesses.filter((h) => h.name.toLowerCase().includes(filter.toLowerCase()))
					: harnesses;

				return { results };
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const input = this.getNodeParameter('input', i, '') as string;
				const sessionId = (this.getNodeParameter('sessionId', i, '') as string) || 'sess-simulated';

				returnData.push({
					response: `Simulated agent response to: ${input}`,
					sessionId,
					usage: {
						inputTokens: input.length,
						outputTokens: 128,
					},
					traceRefs: ['trace://simulated/0001'],
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as Error).message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
