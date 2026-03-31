import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { z } from 'zod';
import type { WorkflowResponse } from './clients/n8n-client';
export declare const checklistCategorySchema: z.ZodEnum<
	['structure', 'data', 'behavior', 'execution']
>;
export type ChecklistCategory = z.infer<typeof checklistCategorySchema>;
export declare const verificationStrategySchema: z.ZodEnum<['programmatic', 'llm']>;
export type VerificationStrategy = z.infer<typeof verificationStrategySchema>;
export declare const nodeExistsCheckSchema: z.ZodObject<
	{
		type: z.ZodLiteral<'node-exists'>;
		nodeType: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'node-exists';
		nodeType: string;
	},
	{
		type: 'node-exists';
		nodeType: string;
	}
>;
export declare const nodeConnectedCheckSchema: z.ZodObject<
	{
		type: z.ZodLiteral<'node-connected'>;
		nodeType: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'node-connected';
		nodeType: string;
	},
	{
		type: 'node-connected';
		nodeType: string;
	}
>;
export declare const triggerTypeCheckSchema: z.ZodObject<
	{
		type: z.ZodLiteral<'trigger-type'>;
		expectedTriggerType: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'trigger-type';
		expectedTriggerType: string;
	},
	{
		type: 'trigger-type';
		expectedTriggerType: string;
	}
>;
export declare const nodeCountGteCheckSchema: z.ZodObject<
	{
		type: z.ZodLiteral<'node-count-gte'>;
		minCount: z.ZodNumber;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'node-count-gte';
		minCount: number;
	},
	{
		type: 'node-count-gte';
		minCount: number;
	}
>;
export declare const connectionExistsCheckSchema: z.ZodObject<
	{
		type: z.ZodLiteral<'connection-exists'>;
		sourceNodeType: z.ZodString;
		targetNodeType: z.ZodString;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'connection-exists';
		sourceNodeType: string;
		targetNodeType: string;
	},
	{
		type: 'connection-exists';
		sourceNodeType: string;
		targetNodeType: string;
	}
>;
export declare const nodeParameterCheckSchema: z.ZodObject<
	{
		type: z.ZodLiteral<'node-parameter'>;
		nodeType: z.ZodString;
		parameterPath: z.ZodString;
		expectedValue: z.ZodUnknown;
	},
	'strip',
	z.ZodTypeAny,
	{
		type: 'node-parameter';
		nodeType: string;
		parameterPath: string;
		expectedValue?: unknown;
	},
	{
		type: 'node-parameter';
		nodeType: string;
		parameterPath: string;
		expectedValue?: unknown;
	}
>;
export declare const programmaticCheckSchema: z.ZodDiscriminatedUnion<
	'type',
	[
		z.ZodObject<
			{
				type: z.ZodLiteral<'node-exists'>;
				nodeType: z.ZodString;
			},
			'strip',
			z.ZodTypeAny,
			{
				type: 'node-exists';
				nodeType: string;
			},
			{
				type: 'node-exists';
				nodeType: string;
			}
		>,
		z.ZodObject<
			{
				type: z.ZodLiteral<'node-connected'>;
				nodeType: z.ZodString;
			},
			'strip',
			z.ZodTypeAny,
			{
				type: 'node-connected';
				nodeType: string;
			},
			{
				type: 'node-connected';
				nodeType: string;
			}
		>,
		z.ZodObject<
			{
				type: z.ZodLiteral<'trigger-type'>;
				expectedTriggerType: z.ZodString;
			},
			'strip',
			z.ZodTypeAny,
			{
				type: 'trigger-type';
				expectedTriggerType: string;
			},
			{
				type: 'trigger-type';
				expectedTriggerType: string;
			}
		>,
		z.ZodObject<
			{
				type: z.ZodLiteral<'node-count-gte'>;
				minCount: z.ZodNumber;
			},
			'strip',
			z.ZodTypeAny,
			{
				type: 'node-count-gte';
				minCount: number;
			},
			{
				type: 'node-count-gte';
				minCount: number;
			}
		>,
		z.ZodObject<
			{
				type: z.ZodLiteral<'connection-exists'>;
				sourceNodeType: z.ZodString;
				targetNodeType: z.ZodString;
			},
			'strip',
			z.ZodTypeAny,
			{
				type: 'connection-exists';
				sourceNodeType: string;
				targetNodeType: string;
			},
			{
				type: 'connection-exists';
				sourceNodeType: string;
				targetNodeType: string;
			}
		>,
		z.ZodObject<
			{
				type: z.ZodLiteral<'node-parameter'>;
				nodeType: z.ZodString;
				parameterPath: z.ZodString;
				expectedValue: z.ZodUnknown;
			},
			'strip',
			z.ZodTypeAny,
			{
				type: 'node-parameter';
				nodeType: string;
				parameterPath: string;
				expectedValue?: unknown;
			},
			{
				type: 'node-parameter';
				nodeType: string;
				parameterPath: string;
				expectedValue?: unknown;
			}
		>,
	]
>;
export type ProgrammaticCheck = z.infer<typeof programmaticCheckSchema>;
export declare const checklistItemSchema: z.ZodObject<
	{
		id: z.ZodNumber;
		description: z.ZodString;
		category: z.ZodEnum<['structure', 'data', 'behavior', 'execution']>;
		strategy: z.ZodEnum<['programmatic', 'llm']>;
		check: z.ZodOptional<
			z.ZodDiscriminatedUnion<
				'type',
				[
					z.ZodObject<
						{
							type: z.ZodLiteral<'node-exists'>;
							nodeType: z.ZodString;
						},
						'strip',
						z.ZodTypeAny,
						{
							type: 'node-exists';
							nodeType: string;
						},
						{
							type: 'node-exists';
							nodeType: string;
						}
					>,
					z.ZodObject<
						{
							type: z.ZodLiteral<'node-connected'>;
							nodeType: z.ZodString;
						},
						'strip',
						z.ZodTypeAny,
						{
							type: 'node-connected';
							nodeType: string;
						},
						{
							type: 'node-connected';
							nodeType: string;
						}
					>,
					z.ZodObject<
						{
							type: z.ZodLiteral<'trigger-type'>;
							expectedTriggerType: z.ZodString;
						},
						'strip',
						z.ZodTypeAny,
						{
							type: 'trigger-type';
							expectedTriggerType: string;
						},
						{
							type: 'trigger-type';
							expectedTriggerType: string;
						}
					>,
					z.ZodObject<
						{
							type: z.ZodLiteral<'node-count-gte'>;
							minCount: z.ZodNumber;
						},
						'strip',
						z.ZodTypeAny,
						{
							type: 'node-count-gte';
							minCount: number;
						},
						{
							type: 'node-count-gte';
							minCount: number;
						}
					>,
					z.ZodObject<
						{
							type: z.ZodLiteral<'connection-exists'>;
							sourceNodeType: z.ZodString;
							targetNodeType: z.ZodString;
						},
						'strip',
						z.ZodTypeAny,
						{
							type: 'connection-exists';
							sourceNodeType: string;
							targetNodeType: string;
						},
						{
							type: 'connection-exists';
							sourceNodeType: string;
							targetNodeType: string;
						}
					>,
					z.ZodObject<
						{
							type: z.ZodLiteral<'node-parameter'>;
							nodeType: z.ZodString;
							parameterPath: z.ZodString;
							expectedValue: z.ZodUnknown;
						},
						'strip',
						z.ZodTypeAny,
						{
							type: 'node-parameter';
							nodeType: string;
							parameterPath: string;
							expectedValue?: unknown;
						},
						{
							type: 'node-parameter';
							nodeType: string;
							parameterPath: string;
							expectedValue?: unknown;
						}
					>,
				]
			>
		>;
	},
	'strip',
	z.ZodTypeAny,
	{
		id: number;
		description: string;
		category: 'structure' | 'data' | 'behavior' | 'execution';
		strategy: 'programmatic' | 'llm';
		check?:
			| {
					type: 'node-exists';
					nodeType: string;
			  }
			| {
					type: 'node-connected';
					nodeType: string;
			  }
			| {
					type: 'trigger-type';
					expectedTriggerType: string;
			  }
			| {
					type: 'node-count-gte';
					minCount: number;
			  }
			| {
					type: 'connection-exists';
					sourceNodeType: string;
					targetNodeType: string;
			  }
			| {
					type: 'node-parameter';
					nodeType: string;
					parameterPath: string;
					expectedValue?: unknown;
			  }
			| undefined;
	},
	{
		id: number;
		description: string;
		category: 'structure' | 'data' | 'behavior' | 'execution';
		strategy: 'programmatic' | 'llm';
		check?:
			| {
					type: 'node-exists';
					nodeType: string;
			  }
			| {
					type: 'node-connected';
					nodeType: string;
			  }
			| {
					type: 'trigger-type';
					expectedTriggerType: string;
			  }
			| {
					type: 'node-count-gte';
					minCount: number;
			  }
			| {
					type: 'connection-exists';
					sourceNodeType: string;
					targetNodeType: string;
			  }
			| {
					type: 'node-parameter';
					nodeType: string;
					parameterPath: string;
					expectedValue?: unknown;
			  }
			| undefined;
	}
>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export declare const checklistResultSchema: z.ZodObject<
	{
		id: z.ZodNumber;
		pass: z.ZodBoolean;
		reasoning: z.ZodString;
		strategy: z.ZodEnum<['programmatic', 'llm']>;
		failureCategory: z.ZodOptional<z.ZodString>;
		rootCause: z.ZodOptional<z.ZodString>;
	},
	'strip',
	z.ZodTypeAny,
	{
		id: number;
		strategy: 'programmatic' | 'llm';
		pass: boolean;
		reasoning: string;
		failureCategory?: string | undefined;
		rootCause?: string | undefined;
	},
	{
		id: number;
		strategy: 'programmatic' | 'llm';
		pass: boolean;
		reasoning: string;
		failureCategory?: string | undefined;
		rootCause?: string | undefined;
	}
>;
export type ChecklistResult = z.infer<typeof checklistResultSchema>;
export interface CapturedEvent {
	timestamp: number;
	type: string;
	data: Record<string, unknown>;
}
export interface CapturedToolCall {
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	result?: unknown;
	error?: string;
	durationMs: number;
}
export interface AgentActivity {
	agentId: string;
	role: string;
	parentId?: string;
	toolCalls: CapturedToolCall[];
	textContent: string;
	reasoning: string;
	status: string;
}
export interface CollectedRun {
	threadId: string;
	events: CapturedEvent[];
	durationMs: number;
	toolCalls: CapturedToolCall[];
	errors: string[];
}
export interface InstanceAiMetrics {
	totalTimeMs: number;
	timeToFirstTextMs: number;
	timeToRunFinishMs: number;
	totalToolCalls: number;
	subAgentsSpawned: number;
	confirmationRequests: number;
	agentActivities: AgentActivity[];
	events: CapturedEvent[];
}
export interface WorkflowSummary {
	id: string;
	name: string;
	nodeCount: number;
	active: boolean;
}
export interface NodeOutputData {
	nodeName: string;
	data: Array<Record<string, unknown>>;
}
export interface WebhookResponse {
	status: number;
	body: unknown;
}
export interface ExecutionSummary {
	id: string;
	workflowId: string;
	status: string;
	error?: string;
	failedNode?: string;
	triggeredByEval?: boolean;
	outputData?: NodeOutputData[];
	webhookResponse?: WebhookResponse;
}
export interface AgentOutcome {
	workflowsCreated: WorkflowSummary[];
	executionsRun: ExecutionSummary[];
	dataTablesCreated: string[];
	finalText: string;
	workflowJsons: WorkflowResponse[];
}
export interface EventOutcome {
	workflowIds: string[];
	executionIds: string[];
	dataTableIds: string[];
	finalText: string;
	toolCalls: CapturedToolCall[];
	agentActivities: AgentActivity[];
}
export interface ChatToolCall {
	toolName: string;
	args: Record<string, unknown>;
	result?: unknown;
	error?: string;
}
export type ChatEntry =
	| {
			type: 'text';
			content: string;
	  }
	| {
			type: 'tool-call';
			toolCall: ChatToolCall;
	  };
export interface ChatMessage {
	role: 'user' | 'assistant';
	entries: ChatEntry[];
}
export interface ExecutionTestInput {
	triggerType: 'webhook' | 'form' | 'manual' | 'schedule';
	testData: Record<string, unknown>;
	description: string;
	httpMethod?: string;
	path?: string;
}
export interface ExecutionChecklist {
	items: ChecklistItem[];
	testInputs: ExecutionTestInput[];
}
export interface ExecutionTestResult {
	attempted: boolean;
	success: boolean;
	error?: string;
	executionId?: string;
}
export type PromptDataset = 'general' | 'builder';
export interface PromptConfig {
	text: string;
	complexity: 'simple' | 'medium' | 'complex';
	tags: string[];
	triggerType?: 'manual' | 'webhook' | 'schedule' | 'form';
	expectedCredentials?: string[];
	dataset?: PromptDataset;
}
export interface DatasetExample {
	prompt: string;
	tags: string[];
	complexity: 'simple' | 'medium' | 'complex';
	triggerType?: 'manual' | 'webhook' | 'schedule' | 'form';
	checklist?: ChecklistItem[];
	expectedCredentials?: string[];
}
export interface TestScenario {
	name: string;
	description: string;
	dataSetup: string;
	successCriteria: string;
}
export interface WorkflowTestCase {
	prompt: string;
	complexity: 'simple' | 'medium' | 'complex';
	tags: string[];
	triggerType?: 'manual' | 'webhook' | 'schedule' | 'form';
	scenarios: TestScenario[];
}
export type PinData = Record<string, Array<Record<string, unknown>>>;
export interface PinDataGenerationInstructions {
	dataDescription: string;
}
export interface ScenarioResult {
	scenario: TestScenario;
	success: boolean;
	evalResult?: InstanceAiEvalExecutionResult;
	score: number;
	reasoning: string;
	failureCategory?: string;
	rootCause?: string;
}
export interface WorkflowTestCaseResult {
	testCase: WorkflowTestCase;
	workflowId?: string;
	workflowBuildSuccess: boolean;
	buildError?: string;
	scenarioResults: ScenarioResult[];
	workflowJson?: WorkflowResponse;
}
export interface InstanceAiResult {
	prompt: string;
	complexity: PromptConfig['complexity'];
	tags?: string[];
	success: boolean;
	runId: string;
	threadId: string;
	metrics: InstanceAiMetrics;
	outcome: AgentOutcome;
	chatMessages?: ChatMessage[];
	checklist: ChecklistItem[];
	checklistResults: ChecklistResult[];
	checklistScore: number;
	executionChecklist: ChecklistItem[];
	executionChecklistResults: ChecklistResult[];
	executionChecklistScore: number;
	error?: string;
}
export type RunStatus = 'running' | 'completed' | 'failed';
export interface Run {
	id: string;
	createdAt: string;
	status: RunStatus;
	config: {
		prompts: PromptConfig[];
		n8nBaseUrl: string;
	};
	results: InstanceAiResult[];
}
export interface Feedback {
	evaluator: string;
	metric: string;
	score: number;
	comment?: string;
	kind: 'score' | 'metric' | 'detail';
}
