import { z } from 'zod';
import { Z } from 'zod-class';

// Node Suggestion DTOs
export class NodeSuggestionRequestDto extends Z.class({
	workflowData: z.object({
		nodes: z.array(z.any()),
		connections: z.any(),
	}),
	currentNodeId: z.string().optional(),
	contextType: z.enum(['next_node', 'previous_node', 'general']).optional().default('general'),
}) {}

export class NodeSuggestionDto extends Z.class({
	nodeType: z.string(),
	displayName: z.string(),
	description: z.string(),
	category: z.string(),
	confidence: z.number().min(0).max(1),
	reasoning: z.string(),
	connectionHint: z
		.object({
			inputType: z.string().optional(),
			outputType: z.string().optional(),
			position: z.enum(['before', 'after', 'parallel']).optional(),
		})
		.optional(),
}) {}

export class NodeSuggestionResponseDto extends Z.class({
	success: z.boolean(),
	suggestions: z.array(NodeSuggestionDto),
	metadata: z.object({
		contextType: z.string(),
		currentNodeId: z.string().optional(),
		suggestedAt: z.string().datetime(),
	}),
}) {}

// Parameter Mapping DTOs
export class ParameterMappingRequestDto extends Z.class({
	sourceNodeId: z.string(),
	targetNodeId: z.string(),
	workflowData: z.object({
		nodes: z.array(z.any()),
		connections: z.any(),
	}),
}) {}

export class ParameterMappingDto extends Z.class({
	targetParameter: z.string(),
	sourceExpression: z.string(),
	sourceDescription: z.string(),
	confidence: z.number().min(0).max(1),
	mappingType: z.enum(['direct', 'transformation', 'calculated']),
}) {}

export class ParameterMappingResponseDto extends Z.class({
	success: z.boolean(),
	mapping: z.object({
		mappings: z.array(ParameterMappingDto),
		suggestions: z.array(z.string()),
	}),
	metadata: z.object({
		sourceNodeId: z.string(),
		targetNodeId: z.string(),
		mappedAt: z.string().datetime(),
	}),
}) {}

// Workflow Assistance DTOs
export class WorkflowAssistanceRequestDto extends Z.class({
	workflowData: z.object({
		nodes: z.array(z.any()),
		connections: z.any(),
	}),
	query: z.string(),
	context: z
		.object({
			selectedNodeId: z.string().optional(),
			lastAction: z.string().optional(),
		})
		.optional(),
}) {}

export class WorkflowAssistanceActionDto extends Z.class({
	type: z.enum(['add_node', 'modify_node', 'connect_nodes', 'remove_node']),
	nodeId: z.string().optional(),
	nodeType: z.string().optional(),
	parameters: z.record(z.any()).optional(),
	connections: z
		.array(
			z.object({
				source: z.string(),
				target: z.string(),
			}),
		)
		.optional(),
}) {}

export class WorkflowAssistanceDto extends Z.class({
	type: z.enum(['suggestion', 'optimization', 'fix', 'explanation']),
	title: z.string(),
	description: z.string(),
	actionable: z.boolean(),
	actions: z.array(WorkflowAssistanceActionDto).optional(),
	priority: z.enum(['low', 'medium', 'high']),
}) {}

export class WorkflowAssistanceResponseDto extends Z.class({
	success: z.boolean(),
	assistance: z.array(WorkflowAssistanceDto),
	metadata: z.object({
		query: z.string(),
		context: z
			.object({
				selectedNodeId: z.string().optional(),
				lastAction: z.string().optional(),
			})
			.optional(),
		assistedAt: z.string().datetime(),
	}),
}) {}

// Node Recommendations DTOs
export class NodeRecommendationDto extends Z.class({
	nodeType: z.string(),
	displayName: z.string(),
	description: z.string(),
	category: z.string(),
	useCase: z.string(),
	difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
	popularity: z.number(),
	tags: z.array(z.string()),
}) {}

export class NodeRecommendationsResponseDto extends Z.class({
	success: z.boolean(),
	recommendations: z.array(NodeRecommendationDto),
	metadata: z.object({
		category: z.string().optional(),
		useCase: z.string().optional(),
		difficulty: z.string().optional(),
		limit: z.number(),
		recommendedAt: z.string().datetime(),
	}),
}) {}

// Workflow Optimization DTOs
export class WorkflowOptimizationRequestDto extends Z.class({
	workflowData: z.object({
		nodes: z.array(z.any()),
		connections: z.any(),
	}),
	optimizationType: z
		.enum(['performance', 'readability', 'structure', 'all'])
		.optional()
		.default('all'),
}) {}

export class WorkflowOptimizationChangeDto extends Z.class({
	nodeId: z.string(),
	changeType: z.enum(['modify', 'add', 'remove', 'reconnect']),
	description: z.string(),
	parameters: z.record(z.any()).optional(),
}) {}

export class WorkflowOptimizationItemDto extends Z.class({
	type: z.enum(['performance', 'structure', 'readability', 'error_handling']),
	title: z.string(),
	description: z.string(),
	impact: z.enum(['low', 'medium', 'high']),
	effort: z.enum(['low', 'medium', 'high']),
	changes: z.array(WorkflowOptimizationChangeDto),
}) {}

export class WorkflowOptimizationResponseDto extends Z.class({
	success: z.boolean(),
	optimization: z.object({
		optimizations: z.array(WorkflowOptimizationItemDto),
		estimatedImprovement: z.object({
			performance: z.number(),
			maintainability: z.number(),
			reliability: z.number(),
		}),
	}),
	metadata: z.object({
		originalNodeCount: z.number(),
		optimizationType: z.string(),
		optimizedAt: z.string().datetime(),
	}),
}) {}

// Workflow Explanation DTOs
export class WorkflowExplanationRequestDto extends Z.class({
	workflowData: z.object({
		nodes: z.array(z.any()),
		connections: z.any(),
	}),
	explanationType: z.enum(['overview', 'detailed', 'technical']).optional().default('overview'),
	focusNodeId: z.string().optional(),
}) {}

export class WorkflowExplanationFlowItemDto extends Z.class({
	nodeId: z.string(),
	nodeName: z.string(),
	purpose: z.string(),
	inputDescription: z.string().optional(),
	outputDescription: z.string().optional(),
	keyParameters: z
		.array(
			z.object({
				name: z.string(),
				value: z.any(),
				explanation: z.string(),
			}),
		)
		.optional(),
}) {}

export class WorkflowExplanationResponseDto extends Z.class({
	success: z.boolean(),
	explanation: z.object({
		overview: z.string(),
		flow: z.array(WorkflowExplanationFlowItemDto),
		complexity: z.enum(['simple', 'moderate', 'complex']),
		executionTime: z.string(),
		commonPatterns: z.array(z.string()),
		potentialIssues: z.array(z.string()).optional(),
	}),
	metadata: z.object({
		nodeCount: z.number(),
		explanationType: z.string(),
		focusNodeId: z.string().optional(),
		explainedAt: z.string().datetime(),
	}),
}) {}
