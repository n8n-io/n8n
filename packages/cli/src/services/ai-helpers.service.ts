import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import type { IUser, INodeTypeDescription } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import { NodeTypes } from '@/node-types';

// Import AI workflow builder if available (enterprise feature)
let AiWorkflowBuilderService: any;
try {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	AiWorkflowBuilderService = require('@n8n/ai-workflow-builder').AiWorkflowBuilderService;
} catch {
	// AI workflow builder not available - will use fallback implementations
}

export interface NodeSuggestion {
	nodeType: string;
	displayName: string;
	description: string;
	category: string;
	confidence: number;
	reasoning: string;
	connectionHint?: {
		inputType?: string;
		outputType?: string;
		position?: 'before' | 'after' | 'parallel';
	};
}

export interface ParameterMapping {
	targetParameter: string;
	sourceExpression: string;
	sourceDescription: string;
	confidence: number;
	mappingType: 'direct' | 'transformation' | 'calculated';
}

export interface WorkflowAssistance {
	type: 'suggestion' | 'optimization' | 'fix' | 'explanation';
	title: string;
	description: string;
	actionable: boolean;
	actions?: Array<{
		type: 'add_node' | 'modify_node' | 'connect_nodes' | 'remove_node';
		nodeId?: string;
		nodeType?: string;
		parameters?: Record<string, any>;
		connections?: Array<{ source: string; target: string }>;
	}>;
	priority: 'low' | 'medium' | 'high';
}

export interface NodeRecommendation {
	nodeType: string;
	displayName: string;
	description: string;
	category: string;
	useCase: string;
	difficulty: 'beginner' | 'intermediate' | 'advanced';
	popularity: number;
	tags: string[];
}

export interface WorkflowOptimization {
	optimizations: Array<{
		type: 'performance' | 'structure' | 'readability' | 'error_handling';
		title: string;
		description: string;
		impact: 'low' | 'medium' | 'high';
		effort: 'low' | 'medium' | 'high';
		changes: Array<{
			nodeId: string;
			changeType: 'modify' | 'add' | 'remove' | 'reconnect';
			description: string;
			parameters?: Record<string, any>;
		}>;
	}>;
	estimatedImprovement: {
		performance: number;
		maintainability: number;
		reliability: number;
	};
}

export interface WorkflowExplanation {
	overview: string;
	flow: Array<{
		nodeId: string;
		nodeName: string;
		purpose: string;
		inputDescription?: string;
		outputDescription?: string;
		keyParameters?: Array<{
			name: string;
			value: any;
			explanation: string;
		}>;
	}>;
	complexity: 'simple' | 'moderate' | 'complex';
	executionTime: string;
	commonPatterns: string[];
	potentialIssues?: string[];
}

@Service()
export class AiHelpersService {
	private aiWorkflowBuilder?: any;

	constructor(
		private readonly logger: Logger,
		private readonly nodeTypes: NodeTypes,
	) {
		// Initialize AI workflow builder if available
		if (AiWorkflowBuilderService) {
			this.aiWorkflowBuilder = new AiWorkflowBuilderService(this.nodeTypes, undefined, this.logger);
		}
	}

	async suggestNodes(
		workflowData: { nodes: any[]; connections: any },
		user: IUser,
		options: {
			currentNodeId?: string;
			contextType?: 'next_node' | 'previous_node' | 'general';
		} = {},
	): Promise<NodeSuggestion[]> {
		this.logger.debug('Generating node suggestions', {
			userId: user.id,
			nodeCount: workflowData.nodes.length,
			currentNodeId: options.currentNodeId,
		});

		// If AI workflow builder is available, use it
		if (this.aiWorkflowBuilder) {
			try {
				return await this.generateAISuggestions(workflowData, user, options);
			} catch (error) {
				this.logger.warn('AI suggestion failed, falling back to rule-based', { error });
			}
		}

		// Fallback to rule-based suggestions
		return this.generateRuleBasedSuggestions(workflowData, options);
	}

	async mapParameters(
		sourceNodeId: string,
		targetNodeId: string,
		workflowData: { nodes: any[]; connections: any },
		user: IUser,
	): Promise<{ mappings: ParameterMapping[]; suggestions: string[] }> {
		this.logger.debug('Generating parameter mappings', {
			userId: user.id,
			sourceNodeId,
			targetNodeId,
		});

		const sourceNode = workflowData.nodes.find((node) => node.id === sourceNodeId);
		const targetNode = workflowData.nodes.find((node) => node.id === targetNodeId);

		if (!sourceNode || !targetNode) {
			throw new Error('Source or target node not found');
		}

		// If AI workflow builder is available, use it
		if (this.aiWorkflowBuilder) {
			try {
				return await this.generateAIParameterMapping(sourceNode, targetNode, user);
			} catch (error) {
				this.logger.warn('AI parameter mapping failed, falling back to rule-based', { error });
			}
		}

		// Fallback to rule-based mapping
		return this.generateRuleBasedParameterMapping(sourceNode, targetNode);
	}

	async provideWorkflowAssistance(
		workflowData: { nodes: any[]; connections: any },
		query: string,
		user: IUser,
		context?: {
			selectedNodeId?: string;
			lastAction?: string;
		},
	): Promise<WorkflowAssistance[]> {
		this.logger.debug('Providing workflow assistance', {
			userId: user.id,
			query: query.substring(0, 50),
			selectedNodeId: context?.selectedNodeId,
		});

		// If AI workflow builder is available, use it
		if (this.aiWorkflowBuilder) {
			try {
				return await this.generateAIAssistance(workflowData, query, user, context);
			} catch (error) {
				this.logger.warn('AI assistance failed, falling back to rule-based', { error });
			}
		}

		// Fallback to rule-based assistance
		return this.generateRuleBasedAssistance(workflowData, query, context);
	}

	async getNodeRecommendations(
		user: IUser,
		criteria: {
			category?: string;
			useCase?: string;
			difficulty?: 'beginner' | 'intermediate' | 'advanced';
			limit?: number;
		} = {},
	): Promise<NodeRecommendation[]> {
		this.logger.debug('Getting node recommendations', {
			userId: user.id,
			criteria,
		});

		const allNodeTypes = this.nodeTypes.getAll();
		const limit = Math.min(criteria.limit || 10, 50);

		const recommendations: NodeRecommendation[] = allNodeTypes
			.filter((nodeType) => !nodeType.description.hidden)
			.map((nodeType) => ({
				nodeType: nodeType.description.name,
				displayName: nodeType.description.displayName,
				description: nodeType.description.description,
				category: this.getNodeCategory(nodeType.description),
				useCase: this.getNodeUseCase(nodeType.description),
				difficulty: this.getNodeDifficulty(nodeType.description),
				popularity: this.getNodePopularity(nodeType.description),
				tags: this.getNodeTags(nodeType.description),
			}))
			.filter((rec) => {
				if (criteria.category && rec.category !== criteria.category) return false;
				if (criteria.difficulty && rec.difficulty !== criteria.difficulty) return false;
				if (criteria.useCase && !rec.useCase.toLowerCase().includes(criteria.useCase.toLowerCase()))
					return false;
				return true;
			})
			.sort((a, b) => b.popularity - a.popularity)
			.slice(0, limit);

		return recommendations;
	}

	async optimizeWorkflow(
		workflowData: { nodes: any[]; connections: any },
		user: IUser,
		options: {
			optimizationType?: 'performance' | 'readability' | 'structure' | 'all';
		} = {},
	): Promise<WorkflowOptimization> {
		this.logger.debug('Optimizing workflow', {
			userId: user.id,
			nodeCount: workflowData.nodes.length,
			optimizationType: options.optimizationType,
		});

		// Analyze workflow for optimization opportunities
		const optimizations = this.analyzeWorkflowOptimizations(workflowData, options.optimizationType);

		return {
			optimizations,
			estimatedImprovement: {
				performance: this.calculatePerformanceImprovement(optimizations),
				maintainability: this.calculateMaintainabilityImprovement(optimizations),
				reliability: this.calculateReliabilityImprovement(optimizations),
			},
		};
	}

	async explainWorkflow(
		workflowData: { nodes: any[]; connections: any },
		user: IUser,
		options: {
			explanationType?: 'overview' | 'detailed' | 'technical';
			focusNodeId?: string;
		} = {},
	): Promise<WorkflowExplanation> {
		this.logger.debug('Explaining workflow', {
			userId: user.id,
			nodeCount: workflowData.nodes.length,
			explanationType: options.explanationType,
		});

		const { explanationType = 'overview', focusNodeId } = options;

		// Generate workflow explanation
		const flow = workflowData.nodes.map((node) => {
			const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			const nodeDescription = nodeType?.description;
			return {
				nodeId: node.id,
				nodeName: node.name,
				purpose: this.getNodePurpose(node, nodeDescription),
				inputDescription:
					explanationType !== 'overview'
						? this.getInputDescription(node, nodeDescription)
						: undefined,
				outputDescription:
					explanationType !== 'overview'
						? this.getOutputDescription(node, nodeDescription)
						: undefined,
				keyParameters:
					explanationType === 'detailed' ? this.getKeyParameters(node, nodeDescription) : undefined,
			};
		});

		return {
			overview: this.generateWorkflowOverview(workflowData),
			flow: focusNodeId ? flow.filter((f) => f.nodeId === focusNodeId) : flow,
			complexity: this.determineWorkflowComplexity(workflowData),
			executionTime: this.estimateExecutionTime(workflowData),
			commonPatterns: this.identifyCommonPatterns(workflowData),
			potentialIssues:
				explanationType !== 'overview' ? this.identifyPotentialIssues(workflowData) : undefined,
		};
	}

	// Private helper methods for AI-powered suggestions
	private async generateAISuggestions(
		workflowData: { nodes: any[]; connections: any },
		user: IUser,
		options: any,
	): Promise<NodeSuggestion[]> {
		// This would integrate with the AI workflow builder's node search capabilities
		// For now, return placeholder that would be replaced with actual AI integration
		return this.generateRuleBasedSuggestions(workflowData, options);
	}

	private async generateAIParameterMapping(
		sourceNode: any,
		targetNode: any,
		user: IUser,
	): Promise<{ mappings: ParameterMapping[]; suggestions: string[] }> {
		// This would integrate with the AI workflow builder's parameter mapping capabilities
		return this.generateRuleBasedParameterMapping(sourceNode, targetNode);
	}

	private async generateAIAssistance(
		workflowData: { nodes: any[]; connections: any },
		query: string,
		user: IUser,
		context?: any,
	): Promise<WorkflowAssistance[]> {
		// This would integrate with the AI workflow builder's assistance capabilities
		return this.generateRuleBasedAssistance(workflowData, query, context);
	}

	// Fallback rule-based implementations
	private generateRuleBasedSuggestions(
		workflowData: { nodes: any[]; connections: any },
		options: any,
	): NodeSuggestion[] {
		const { currentNodeId, contextType } = options;
		const allNodeTypes = this.nodeTypes.getAll();

		// Simple heuristic-based suggestions
		const suggestions: NodeSuggestion[] = [];

		if (contextType === 'next_node' && currentNodeId) {
			const currentNode = workflowData.nodes.find((node) => node.id === currentNodeId);
			if (currentNode) {
				// Suggest common next nodes based on current node type
				const nextNodeTypes = this.getCommonNextNodes(currentNode.type);
				nextNodeTypes.forEach((nodeTypeName, index) => {
					const nodeType = allNodeTypes.find((nt) => nt.description.name === nodeTypeName);
					if (nodeType && !nodeType.description.hidden) {
						suggestions.push({
							nodeType: nodeType.description.name,
							displayName: nodeType.description.displayName,
							description: nodeType.description.description,
							category: this.getNodeCategory(nodeType.description),
							confidence: Math.max(0.9 - index * 0.1, 0.5),
							reasoning: `Commonly used after ${currentNode.type} nodes`,
							connectionHint: {
								position: 'after',
								inputType: 'main',
								outputType: 'main',
							},
						});
					}
				});
			}
		} else {
			// General suggestions based on popular nodes
			const popularNodes = ['Set', 'If', 'HTTP Request', 'Code', 'Merge', 'Switch'];
			popularNodes.forEach((nodeTypeName, index) => {
				const nodeType = allNodeTypes.find((nt) => nt.description.name === nodeTypeName);
				if (nodeType && !nodeType.description.hidden) {
					suggestions.push({
						nodeType: nodeType.description.name,
						displayName: nodeType.description.displayName,
						description: nodeType.description.description,
						category: this.getNodeCategory(nodeType.description),
						confidence: Math.max(0.8 - index * 0.1, 0.4),
						reasoning: 'Commonly used in workflows',
					});
				}
			});
		}

		return suggestions.slice(0, 5);
	}

	private generateRuleBasedParameterMapping(
		sourceNode: any,
		targetNode: any,
	): { mappings: ParameterMapping[]; suggestions: string[] } {
		const mappings: ParameterMapping[] = [];
		const suggestions: string[] = [];

		// Get node type descriptions for enhanced analysis
		const sourceNodeType = this.nodeTypes.getByNameAndVersion(
			sourceNode.type,
			sourceNode.typeVersion,
		);
		const targetNodeType = this.nodeTypes.getByNameAndVersion(
			targetNode.type,
			targetNode.typeVersion,
		);

		if (!sourceNodeType || !targetNodeType) {
			suggestions.push('Could not analyze node types for parameter mapping');
			return { mappings, suggestions };
		}

		// Use node type descriptions for parameter analysis
		const sourceData = sourceNode.parameters || {};
		const targetOutputs = targetNodeType.description.outputs || [];
		const sourceInputs = sourceNodeType.description.inputs || [];

		if (targetNodeType.description.properties) {
			targetNodeType.description.properties.forEach((prop) => {
				// Enhanced parameter analysis using NodeHelpers
				const isDisplayed = NodeHelpers.displayParameter(
					targetNode.parameters || {},
					prop,
					targetNode,
					targetNodeType.description,
				);

				if (!isDisplayed) return;

				// Type-aware field matching
				if (prop.type === 'string' && sourceData) {
					// Look for similar field names with type consideration
					const similarFields = Object.keys(sourceData).filter((key) => {
						const similarity = this.calculateFieldSimilarity(key, prop.name);
						return similarity > 0.6;
					});

					if (similarFields.length > 0) {
						const bestMatch = similarFields[0];
						const confidence = this.calculateMappingConfidence(
							sourceNodeType.description,
							targetNodeType.description,
							bestMatch,
							prop,
						);

						mappings.push({
							targetParameter: prop.name,
							sourceExpression: `{{ $json.${bestMatch} }}`,
							sourceDescription: `Map from ${sourceNode.name}.${bestMatch}`,
							confidence,
							mappingType: this.determineMappingType(
								sourceNodeType.description,
								targetNodeType.description,
								prop,
							),
						});
					}
				}

				// Special handling for common parameter types
				if (prop.name === 'url' && sourceData.url) {
					mappings.push({
						targetParameter: 'url',
						sourceExpression: `{{ $json.url }}`,
						sourceDescription: `Direct URL mapping from ${sourceNode.name}`,
						confidence: 0.95,
						mappingType: 'direct',
					});
				}

				if (prop.name === 'email' && (sourceData.email || sourceData.emailAddress)) {
					const sourceField = sourceData.email ? 'email' : 'emailAddress';
					mappings.push({
						targetParameter: 'email',
						sourceExpression: `{{ $json.${sourceField} }}`,
						sourceDescription: `Email mapping from ${sourceNode.name}`,
						confidence: 0.9,
						mappingType: 'direct',
					});
				}
			});
		}

		// Enhanced suggestions based on node types
		if (
			sourceNodeType.description.group?.includes('trigger') &&
			targetNodeType.description.group?.includes('transform')
		) {
			suggestions.push(
				'Trigger to transform node: Consider mapping event data to transform parameters',
			);
		}

		if (
			this.isDataProcessingNode(sourceNodeType.description) &&
			this.isDataProcessingNode(targetNodeType.description)
		) {
			suggestions.push('Data processing nodes: Use expressions to transform data structure');
		}

		suggestions.push(
			'Consider using expressions to transform data between nodes',
			'Check if the data types match between source and target parameters',
			'Use the Code node for complex data transformations',
		);

		return { mappings, suggestions };
	}

	private generateRuleBasedAssistance(
		workflowData: { nodes: any[]; connections: any },
		query: string,
		context?: any,
	): WorkflowAssistance[] {
		const assistance: WorkflowAssistance[] = [];
		const queryLower = query.toLowerCase();

		if (queryLower.includes('error') || queryLower.includes('fail')) {
			assistance.push({
				type: 'fix',
				title: 'Add Error Handling',
				description: 'Consider adding error handling to prevent workflow failures',
				actionable: true,
				actions: [
					{
						type: 'add_node',
						nodeType: 'If',
						parameters: {
							conditions: {
								string: [
									{
										value1: '={{ $json.error }}',
										operation: 'exists',
									},
								],
							},
						},
					},
				],
				priority: 'high',
			});
		}

		if (queryLower.includes('slow') || queryLower.includes('performance')) {
			assistance.push({
				type: 'optimization',
				title: 'Improve Performance',
				description: 'Consider optimizing your workflow for better performance',
				actionable: false,
				priority: 'medium',
			});
		}

		if (queryLower.includes('data') || queryLower.includes('transform')) {
			assistance.push({
				type: 'suggestion',
				title: 'Data Transformation',
				description: 'Use the Set or Code node to transform your data',
				actionable: true,
				actions: [
					{
						type: 'add_node',
						nodeType: 'Set',
					},
				],
				priority: 'medium',
			});
		}

		return assistance;
	}

	// Helper methods for node analysis
	private getNodeCategory(nodeType: INodeTypeDescription): string {
		if (nodeType.group) {
			return nodeType.group[0] || 'utility';
		}
		return 'utility';
	}

	private getNodeUseCase(nodeType: INodeTypeDescription): string {
		// Simple heuristic based on node type
		const name = nodeType.name.toLowerCase();
		if (name.includes('http') || name.includes('webhook')) return 'API communication';
		if (name.includes('database') || name.includes('sql')) return 'data storage';
		if (name.includes('email') || name.includes('slack')) return 'communication';
		if (name.includes('file') || name.includes('csv')) return 'file processing';
		return 'data processing';
	}

	private getNodeDifficulty(
		nodeType: INodeTypeDescription,
	): 'beginner' | 'intermediate' | 'advanced' {
		const simpleNodes = ['Set', 'If', 'Merge', 'Switch'];
		const advancedNodes = ['Code', 'Function', 'Execute Command'];

		if (simpleNodes.includes(nodeType.name)) return 'beginner';
		if (advancedNodes.includes(nodeType.name)) return 'advanced';
		return 'intermediate';
	}

	private getNodePopularity(nodeType: INodeTypeDescription): number {
		const popularNodes: Record<string, number> = {
			'HTTP Request': 100,
			Set: 95,
			If: 90,
			Code: 85,
			Merge: 80,
			Switch: 75,
			Webhook: 70,
		};
		return popularNodes[nodeType.name] || 50;
	}

	private getNodeTags(nodeType: INodeTypeDescription): string[] {
		const tags = [];
		if (nodeType.group) tags.push(...nodeType.group);
		if (nodeType.name.toLowerCase().includes('api')) tags.push('api');
		if (nodeType.credentials) tags.push('requires-auth');
		return tags;
	}

	private getCommonNextNodes(nodeType: string): string[] {
		const commonNextNodes: Record<string, string[]> = {
			'HTTP Request': ['Set', 'If', 'Code', 'Merge'],
			Webhook: ['Set', 'If', 'HTTP Request'],
			Set: ['If', 'HTTP Request', 'Code'],
			If: ['Set', 'HTTP Request', 'Stop and Error'],
			Code: ['Set', 'If', 'HTTP Request'],
		};
		return commonNextNodes[nodeType] || ['Set', 'If', 'HTTP Request'];
	}

	// Workflow optimization analysis methods
	private analyzeWorkflowOptimizations(
		workflowData: { nodes: any[]; connections: any },
		optimizationType?: string,
	): WorkflowOptimization['optimizations'] {
		const optimizations: WorkflowOptimization['optimizations'] = [];

		// Check for missing error handling
		const hasErrorHandling = workflowData.nodes.some(
			(node) => node.type === 'If' && JSON.stringify(node.parameters).includes('error'),
		);

		if (!hasErrorHandling) {
			optimizations.push({
				type: 'error_handling',
				title: 'Add Error Handling',
				description: 'Workflow lacks error handling mechanisms',
				impact: 'high',
				effort: 'low',
				changes: [
					{
						nodeId: 'new-error-handler',
						changeType: 'add',
						description: 'Add If node to check for errors',
						parameters: {
							conditions: {
								string: [{ value1: '={{ $json.error }}', operation: 'exists' }],
							},
						},
					},
				],
			});
		}

		// Check for long node chains
		if (workflowData.nodes.length > 10) {
			optimizations.push({
				type: 'structure',
				title: 'Consider Breaking Down Workflow',
				description: 'Large workflows can be hard to maintain',
				impact: 'medium',
				effort: 'high',
				changes: [
					{
						nodeId: 'workflow-split',
						changeType: 'modify',
						description: 'Consider splitting into smaller sub-workflows',
					},
				],
			});
		}

		return optimizations;
	}

	private calculatePerformanceImprovement(
		optimizations: WorkflowOptimization['optimizations'],
	): number {
		return optimizations.filter((opt) => opt.type === 'performance').length * 15;
	}

	private calculateMaintainabilityImprovement(
		optimizations: WorkflowOptimization['optimizations'],
	): number {
		return (
			optimizations.filter((opt) => opt.type === 'readability' || opt.type === 'structure').length *
			20
		);
	}

	private calculateReliabilityImprovement(
		optimizations: WorkflowOptimization['optimizations'],
	): number {
		return optimizations.filter((opt) => opt.type === 'error_handling').length * 25;
	}

	// Workflow explanation methods
	private generateWorkflowOverview(workflowData: { nodes: any[]; connections: any }): string {
		const nodeCount = workflowData.nodes.length;
		const connectionCount = Object.keys(workflowData.connections || {}).length;

		return `This workflow contains ${nodeCount} nodes and ${connectionCount} connections. It processes data through a series of connected operations to achieve the desired outcome.`;
	}

	private getNodePurpose(node: any, nodeType?: INodeTypeDescription): string {
		if (nodeType) {
			return `${nodeType.displayName}: ${nodeType.description}`;
		}
		return `${node.name}: Performs ${node.type} operations`;
	}

	private getInputDescription(node: any, nodeType?: INodeTypeDescription): string {
		return 'Receives data from connected input nodes';
	}

	private getOutputDescription(node: any, nodeType?: INodeTypeDescription): string {
		return 'Outputs processed data to connected nodes';
	}

	private getKeyParameters(
		node: any,
		nodeType?: INodeTypeDescription,
	): Array<{ name: string; value: any; explanation: string }> {
		const params: Array<{ name: string; value: any; explanation: string }> = [];
		if (node.parameters) {
			Object.entries(node.parameters)
				.slice(0, 3)
				.forEach(([key, value]) => {
					params.push({
						name: key,
						value,
						explanation: `Configuration parameter for ${key}`,
					});
				});
		}
		return params;
	}

	private determineWorkflowComplexity(workflowData: { nodes: any[]; connections: any }):
		| 'simple'
		| 'moderate'
		| 'complex' {
		const nodeCount = workflowData.nodes.length;
		if (nodeCount <= 5) return 'simple';
		if (nodeCount <= 15) return 'moderate';
		return 'complex';
	}

	private estimateExecutionTime(workflowData: { nodes: any[]; connections: any }): string {
		const nodeCount = workflowData.nodes.length;
		const hasHttpNodes = workflowData.nodes.some(
			(node) => node.type.includes('HTTP') || node.type.includes('Request'),
		);

		let baseTime = nodeCount * 0.5; // 0.5 seconds per node base time
		if (hasHttpNodes) baseTime += 2; // Add time for HTTP requests

		if (baseTime < 5) return 'Less than 5 seconds';
		if (baseTime < 30) return '5-30 seconds';
		return 'More than 30 seconds';
	}

	private identifyCommonPatterns(workflowData: { nodes: any[]; connections: any }): string[] {
		const patterns = [];

		if (workflowData.nodes.some((node) => node.type === 'Webhook')) {
			patterns.push('Webhook trigger pattern');
		}

		if (workflowData.nodes.some((node) => node.type === 'If')) {
			patterns.push('Conditional logic pattern');
		}

		if (workflowData.nodes.some((node) => node.type.includes('HTTP'))) {
			patterns.push('API integration pattern');
		}

		return patterns;
	}

	private identifyPotentialIssues(workflowData: { nodes: any[]; connections: any }): string[] {
		const issues = [];

		const hasErrorHandling = workflowData.nodes.some(
			(node) => node.type === 'If' && JSON.stringify(node.parameters).includes('error'),
		);

		if (!hasErrorHandling) {
			issues.push('No error handling detected');
		}

		if (workflowData.nodes.length > 20) {
			issues.push('Workflow may be too complex');
		}

		return issues;
	}

	// Enhanced helper methods for NodeHelpers integration
	private calculateFieldSimilarity(field1: string, field2: string): number {
		const f1 = field1.toLowerCase();
		const f2 = field2.toLowerCase();

		// Exact match
		if (f1 === f2) return 1.0;

		// Substring match
		if (f1.includes(f2) || f2.includes(f1)) return 0.8;

		// Common prefixes/suffixes
		const commonWords = ['id', 'name', 'email', 'url', 'address', 'phone', 'date', 'time'];
		for (const word of commonWords) {
			if (f1.includes(word) && f2.includes(word)) return 0.7;
		}

		// Levenshtein distance similarity
		const distance = this.levenshteinDistance(f1, f2);
		const maxLength = Math.max(f1.length, f2.length);
		return 1 - distance / maxLength;
	}

	private levenshteinDistance(str1: string, str2: string): number {
		const matrix = [];
		for (let i = 0; i <= str2.length; i++) {
			matrix[i] = [i];
		}
		for (let j = 0; j <= str1.length; j++) {
			matrix[0][j] = j;
		}
		for (let i = 1; i <= str2.length; i++) {
			for (let j = 1; j <= str1.length; j++) {
				if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
					matrix[i][j] = matrix[i - 1][j - 1];
				} else {
					matrix[i][j] = Math.min(
						matrix[i - 1][j - 1] + 1,
						matrix[i][j - 1] + 1,
						matrix[i - 1][j] + 1,
					);
				}
			}
		}
		return matrix[str2.length][str1.length];
	}

	private calculateMappingConfidence(
		sourceNodeType: INodeTypeDescription,
		targetNodeType: INodeTypeDescription,
		sourceField: string,
		targetProperty: any,
	): number {
		let confidence = 0.5;

		// Type compatibility
		if (targetProperty.type === 'string') confidence += 0.2;

		// Node type compatibility
		if (sourceNodeType.group?.some((g) => targetNodeType.group?.includes(g))) {
			confidence += 0.2;
		}

		// Field name similarity
		const similarity = this.calculateFieldSimilarity(sourceField, targetProperty.name);
		confidence += similarity * 0.3;

		return Math.min(confidence, 1.0);
	}

	private determineMappingType(
		sourceNodeType: INodeTypeDescription,
		targetNodeType: INodeTypeDescription,
		targetProperty: any,
	): 'direct' | 'transformation' | 'calculated' {
		// Simple type matching suggests direct mapping
		if (targetProperty.type === 'string' || targetProperty.type === 'number') {
			return 'direct';
		}

		// Complex types or different node categories suggest transformation
		if (
			sourceNodeType.group?.some((g) => !targetNodeType.group?.includes(g)) ||
			targetProperty.type === 'collection'
		) {
			return 'transformation';
		}

		return 'calculated';
	}

	private isDataProcessingNode(nodeType: INodeTypeDescription): boolean {
		const dataProcessingGroups = ['transform', 'utility', 'output'];
		return nodeType.group?.some((group) => dataProcessingGroups.includes(group)) ?? false;
	}
}
