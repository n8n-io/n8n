import { createHash } from 'node:crypto';

import { transformSync } from 'esbuild';
import {
	Project,
	SyntaxKind,
	type SourceFile,
	type Node,
	type CallExpression,
	type VariableDeclaration,
	type FunctionDeclaration,
} from 'ts-morph';

import type {
	WorkflowGraphData,
	GraphNodeData,
	GraphEdgeData,
	GraphStepConfig,
} from '../graph/graph.types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TranspilerResult {
	code: string;
	graph: WorkflowGraphData;
	sourceMap: string | null;
	errors: CompilationError[];
	warnings: CompilationError[];
}

export interface CompilationError {
	message: string;
	line?: number;
	column?: number;
	severity: 'error' | 'warning';
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface StepDefinition {
	/** User-provided step name (from the definition object) */
	name: string;
	/** Deterministic ID derived from the step name */
	id: string;
	/** The full text of the step function body (second argument) */
	functionBodyText: string;
	/** Parsed retry config from the definition object */
	retryConfig?: { maxAttempts: number; baseDelay: number; maxDelay?: number; jitter?: boolean };
	/** Parsed timeout from the definition object */
	timeout?: number;
	/** Step type from the definition object */
	stepType?: string;
	/** Icon name from the definition object */
	icon?: string;
	/** Hex color from the definition object */
	color?: string;
	/** Description from the definition object */
	description?: string;
	/** Names of variables from other step outputs referenced inside the body */
	dependencies: Map<string, string>; // variableName -> sourceStepId
	/** The variable name this step's output is assigned to (if any) */
	assignedVariable: string | undefined;
	/** Position in source for error reporting */
	line: number;
	column: number;
	/** The CallExpression node for the ctx.step() call */
	callNode: CallExpression;
	/** Variables from ctx.triggerData referenced inside the step body */
	triggerDataVars: Set<string>;
	/** Whether this step is inside a conditional (if/else) */
	conditionalParent?: ConditionalInfo;
}

interface ConditionalInfo {
	/** The condition expression text */
	conditionText: string;
	/** Whether this step is in the 'then' or 'else' branch */
	branch: 'then' | 'else';
	/** The step ID whose output the condition references (if any) */
	conditionSourceStepId?: string;
	/** The variable name in the condition that references the step output */
	conditionVariableName?: string;
}

interface HelperFunction {
	name: string;
	text: string;
	/** Names of other helpers this one references */
	references: Set<string>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex').substring(0, 12);
}

function sanitizeName(name: string): string {
	return name
		.replace(/[^a-zA-Z0-9_]/g, '_')
		.replace(/^(\d)/, '_$1')
		.replace(/_+/g, '_');
}

function toCamelCase(name: string): string {
	return sanitizeName(name).replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// TranspilerService
// ---------------------------------------------------------------------------

export class TranspilerService {
	compile(source: string): TranspilerResult {
		const errors: CompilationError[] = [];
		const warnings: CompilationError[] = [];

		// Validate basic structure
		if (!source.trim()) {
			errors.push({ message: 'Empty source file', severity: 'error' });
			return { code: '', graph: { nodes: [], edges: [] }, sourceMap: null, errors, warnings };
		}

		if (!source.includes('defineWorkflow')) {
			errors.push({
				message: 'Source must use defineWorkflow() to define a workflow',
				severity: 'error',
			});
			return { code: '', graph: { nodes: [], edges: [] }, sourceMap: null, errors, warnings };
		}

		// Parse with ts-morph
		const project = new Project({
			useInMemoryFileSystem: true,
			compilerOptions: {
				target: 99, // ESNext
				module: 99, // ESNext
				strict: false,
				noEmit: true,
			},
		});

		const sourceFile = project.createSourceFile('workflow.ts', source);

		// Find the run method
		const runMethod = this.findRunMethod(sourceFile);
		if (!runMethod) {
			errors.push({
				message: 'Could not find run() method in defineWorkflow()',
				severity: 'error',
			});
			return { code: '', graph: { nodes: [], edges: [] }, sourceMap: null, errors, warnings };
		}

		// Step 1: Find all ctx.step() calls
		const steps = this.findStepCalls(runMethod);

		if (steps.length === 0) {
			errors.push({
				message: 'No ctx.step() calls found in run() method',
				severity: 'error',
			});
			return { code: '', graph: { nodes: [], edges: [] }, sourceMap: null, errors, warnings };
		}

		// Check for duplicate step names
		const nameSet = new Set<string>();
		for (const step of steps) {
			if (nameSet.has(step.name)) {
				errors.push({
					message: `Duplicate step name: '${step.name}'`,
					line: step.line,
					column: step.column,
					severity: 'error',
				});
			}
			nameSet.add(step.name);
		}

		if (errors.length > 0) {
			return { code: '', graph: { nodes: [], edges: [] }, sourceMap: null, errors, warnings };
		}

		// Step 2: Build variable-to-step mapping and analyze dependencies
		const variableToStepId = new Map<string, string>();
		for (const step of steps) {
			if (step.assignedVariable) {
				variableToStepId.set(step.assignedVariable, step.id);
			}
		}

		// Detect variables destructured from ctx.triggerData
		const triggerDataVars = this.findTriggerDataVariables(runMethod);

		// Resolve dependencies for each step
		for (const step of steps) {
			this.resolveStepDependencies(step, variableToStepId);
			// Also check for trigger data variable references
			this.resolveTriggerDataDependencies(step, triggerDataVars);
		}

		// Step 3: Detect conditionals
		this.detectConditionals(runMethod, steps, variableToStepId);

		// Step 4: Find helper functions
		const helpers = this.findHelperFunctions(sourceFile, steps);

		// Step 5: Build the graph
		const graph = this.buildGraph(steps);

		// Step 6: Generate compiled code
		const rawCode = this.generateCode(steps, helpers);

		// Step 7: Compile with esbuild
		const { code, sourceMap } = this.compileWithEsbuild(rawCode);

		return { code, graph, sourceMap, errors, warnings };
	}

	// -----------------------------------------------------------------------
	// AST analysis methods
	// -----------------------------------------------------------------------

	private findRunMethod(sourceFile: SourceFile): Node | undefined {
		// Look for defineWorkflow({ ... run(ctx) { } })
		// The run method is a property assignment or method inside the object literal
		// passed to defineWorkflow()
		const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

		for (const call of callExpressions) {
			const expr = call.getExpression();
			if (expr.getText() === 'defineWorkflow') {
				const args = call.getArguments();
				if (args.length > 0) {
					const objLiteral = args[0];
					if (objLiteral.isKind(SyntaxKind.ObjectLiteralExpression)) {
						// Find the 'run' property
						for (const prop of objLiteral.getProperties()) {
							if (prop.isKind(SyntaxKind.MethodDeclaration) && prop.getName() === 'run') {
								return prop;
							}
							if (prop.isKind(SyntaxKind.PropertyAssignment) && prop.getName() === 'run') {
								return prop.getInitializerOrThrow();
							}
						}
					}
				}
			}
		}

		return undefined;
	}

	private findStepCalls(runMethod: Node): StepDefinition[] {
		const steps: StepDefinition[] = [];
		const callExpressions = runMethod.getDescendantsOfKind(SyntaxKind.CallExpression);

		for (const call of callExpressions) {
			if (!this.isCtxStepCall(call)) continue;

			const args = call.getArguments();
			if (args.length < 2) continue;

			// First arg: StepDefinition object literal
			const defArg = args[0];
			if (!defArg.isKind(SyntaxKind.ObjectLiteralExpression)) continue;

			// Extract 'name' property (required)
			const nameProp = defArg.getProperty('name');
			if (!nameProp || !nameProp.isKind(SyntaxKind.PropertyAssignment)) continue;
			const nameInit = nameProp.getInitializer();
			let stepName: string;
			if (nameInit?.isKind(SyntaxKind.StringLiteral)) {
				stepName = nameInit.getLiteralText();
			} else if (nameInit?.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
				stepName = nameInit.getLiteralText();
			} else {
				continue; // skip dynamic names
			}

			// Second arg: step function
			const fnArg = args[1];
			const fnBodyText = this.extractFunctionBodyText(fnArg);
			if (fnBodyText === undefined) continue;

			// Extract display properties from the definition object
			const description = this.extractStringProperty(defArg, 'description');
			const icon = this.extractStringProperty(defArg, 'icon');
			const color = this.extractStringProperty(defArg, 'color');
			const stepType = this.extractStringProperty(defArg, 'stepType');

			// Extract retry config from the definition object
			const retryProp = defArg.getProperty('retry');
			const retryConfig = retryProp ? this.parseRetryConfig(retryProp.getText()) : undefined;

			// Extract timeout from the definition object
			const timeoutProp = defArg.getProperty('timeout');
			let timeout: number | undefined;
			if (timeoutProp?.isKind(SyntaxKind.PropertyAssignment)) {
				const timeoutInit = timeoutProp.getInitializer();
				if (timeoutInit?.isKind(SyntaxKind.NumericLiteral)) {
					timeout = parseInt(timeoutInit.getText(), 10);
				}
			}

			// Determine assigned variable
			const assignedVariable = this.findAssignedVariable(call);

			const stepId = sha256(stepName);

			const { line, column } = sourceFileLineAndColumn(call);

			steps.push({
				name: stepName,
				id: stepId,
				functionBodyText: fnBodyText,
				retryConfig,
				timeout,
				stepType,
				icon,
				color,
				description,
				dependencies: new Map(),
				triggerDataVars: new Set(),
				assignedVariable,
				line,
				column,
				callNode: call,
			});
		}

		return steps;
	}

	private extractStringProperty(obj: Node, propName: string): string | undefined {
		if (!obj.isKind(SyntaxKind.ObjectLiteralExpression)) return undefined;
		const prop = obj.getProperty(propName);
		if (!prop?.isKind(SyntaxKind.PropertyAssignment)) return undefined;
		const init = prop.getInitializer();
		if (init?.isKind(SyntaxKind.StringLiteral)) {
			return init.getLiteralText();
		}
		return undefined;
	}

	private isCtxStepCall(call: CallExpression): boolean {
		const expr = call.getExpression();
		if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
			const name = expr.getName();
			if (name === 'step') {
				const objectExpr = expr.getExpression();
				// Match ctx.step, or any *.step pattern
				return objectExpr.getText() === 'ctx';
			}
		}
		return false;
	}

	private extractFunctionBodyText(node: Node): string | undefined {
		if (node.isKind(SyntaxKind.ArrowFunction)) {
			const body = node.getBody();
			if (body.isKind(SyntaxKind.Block)) {
				// Get the text inside the braces
				const fullText = body.getText();
				return fullText.slice(1, -1).trim();
			}
			// Expression body: return the expression
			return `return ${body.getText()};`;
		}
		if (node.isKind(SyntaxKind.FunctionExpression)) {
			const body = node.getBody();
			const fullText = body.getText();
			return fullText.slice(1, -1).trim();
		}
		return undefined;
	}

	private findAssignedVariable(call: CallExpression): string | undefined {
		// Walk up: call might be inside an AwaitExpression, then a VariableDeclaration
		let current: Node = call;
		const parent = current.getParent();
		if (parent?.isKind(SyntaxKind.AwaitExpression)) {
			current = parent;
		}

		const grandParent = current.getParent();
		if (grandParent?.isKind(SyntaxKind.VariableDeclaration)) {
			const nameNode = (grandParent as VariableDeclaration).getNameNode();
			if (nameNode.isKind(SyntaxKind.Identifier)) {
				return nameNode.getText();
			}
			if (nameNode.isKind(SyntaxKind.ObjectBindingPattern)) {
				return nameNode.getText();
			}
		}

		// Handle Promise.all destructuring: const [a, b] = await Promise.all([ctx.step(...), ...])
		// Walk up: call → ArrayLiteralExpression → CallExpression(Promise.all) → AwaitExpression → VariableDeclaration
		const arrayParent = call.getParent(); // might be the array literal
		if (arrayParent?.isKind(SyntaxKind.ArrayLiteralExpression)) {
			const promiseAllCall = arrayParent.getParent(); // Promise.all(...)
			if (promiseAllCall?.isKind(SyntaxKind.CallExpression)) {
				let promiseAllCurrent: Node = promiseAllCall;
				const awaitParent = promiseAllCurrent.getParent();
				if (awaitParent?.isKind(SyntaxKind.AwaitExpression)) {
					promiseAllCurrent = awaitParent;
				}
				const varDecl = promiseAllCurrent.getParent();
				if (varDecl?.isKind(SyntaxKind.VariableDeclaration)) {
					const nameNode = (varDecl as VariableDeclaration).getNameNode();
					if (nameNode.isKind(SyntaxKind.ArrayBindingPattern)) {
						// Find the index of this call in the array
						const elements = arrayParent.getElements();
						const callIndex = elements.findIndex((el) => el === call);
						if (callIndex >= 0) {
							const bindings = nameNode.getElements();
							const binding = bindings[callIndex];
							if (binding && binding.isKind(SyntaxKind.BindingElement)) {
								return binding.getName();
							}
						}
					}
				}
			}
		}

		return undefined;
	}

	private resolveStepDependencies(
		step: StepDefinition,
		variableToStepId: Map<string, string>,
	): void {
		// Parse the function body text to find references to variables assigned from other steps
		for (const [varName, stepId] of variableToStepId) {
			if (stepId === step.id) continue; // Skip self-reference

			// Check if the variable name appears in the function body
			// Use word-boundary matching to avoid partial matches
			const regex = new RegExp(`\\b${escapeRegExp(varName)}\\b`);
			if (regex.test(step.functionBodyText)) {
				step.dependencies.set(varName, stepId);
			}
		}
	}

	/**
	 * Find variables destructured from ctx.triggerData in the run() body.
	 * e.g. `const { body, headers, query } = ctx.triggerData;`
	 * Returns a map: variableName -> destructuring pattern text
	 */
	private findTriggerDataVariables(runMethod: Node): Map<string, string> {
		const vars = new Map<string, string>();

		const varDeclarations = runMethod.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
		for (const decl of varDeclarations) {
			const init = decl.getInitializer();
			if (!init) continue;

			// Match: ctx.triggerData or similar
			const initText = init.getText();
			if (initText === 'ctx.triggerData' || initText.endsWith('.triggerData')) {
				const nameNode = decl.getNameNode();
				if (nameNode.isKind(SyntaxKind.ObjectBindingPattern)) {
					// Destructuring: const { body, headers } = ctx.triggerData
					for (const element of nameNode.getElements()) {
						const name = element.getName();
						vars.set(name, name);
					}
				} else if (nameNode.isKind(SyntaxKind.Identifier)) {
					// Simple: const triggerData = ctx.triggerData
					vars.set(nameNode.getText(), nameNode.getText());
				}
			}
		}

		return vars;
	}

	/**
	 * Check if a step's function body references variables from ctx.triggerData
	 * and add them to step.triggerDataVars
	 */
	private resolveTriggerDataDependencies(
		step: StepDefinition,
		triggerDataVars: Map<string, string>,
	): void {
		for (const [varName] of triggerDataVars) {
			const regex = new RegExp(`\\b${escapeRegExp(varName)}\\b`);
			if (regex.test(step.functionBodyText)) {
				step.triggerDataVars.add(varName);
			}
		}
	}

	private detectConditionals(
		runMethod: Node,
		steps: StepDefinition[],
		variableToStepId: Map<string, string>,
	): void {
		const ifStatements = runMethod.getDescendantsOfKind(SyntaxKind.IfStatement);

		for (const ifStmt of ifStatements) {
			const conditionText = ifStmt.getExpression().getText();

			// Determine which step the condition references by looking for
			// variable names that are step outputs in the condition expression
			let conditionSourceStepId: string | undefined;
			let conditionVariableName: string | undefined;
			for (const [varName, stepId] of variableToStepId) {
				const regex = new RegExp(`\\b${escapeRegExp(varName)}\\b`);
				if (regex.test(conditionText)) {
					conditionSourceStepId = stepId;
					conditionVariableName = varName;
					break;
				}
			}

			// Find step calls in the 'then' block
			const thenBlock = ifStmt.getThenStatement();
			const thenStepCalls = thenBlock.getDescendantsOfKind(SyntaxKind.CallExpression);

			for (const call of thenStepCalls) {
				if (!this.isCtxStepCall(call)) continue;
				const step = this.findStepForCall(call, steps);
				if (step) {
					step.conditionalParent = {
						conditionText,
						branch: 'then',
						conditionSourceStepId,
						conditionVariableName,
					};

					// Add the condition source as a dependency if the step body
					// does not already reference it, so the edge connects properly
					if (conditionSourceStepId && !step.dependencies.has(conditionText.split('.')[0])) {
						// Find the variable name for this step ID
						for (const [varName, sid] of variableToStepId) {
							if (sid === conditionSourceStepId) {
								step.dependencies.set(varName, sid);
								break;
							}
						}
					}
				}
			}

			// Find step calls in the 'else' block
			const elseStmt = ifStmt.getElseStatement();
			if (elseStmt) {
				const elseStepCalls = elseStmt.getDescendantsOfKind(SyntaxKind.CallExpression);
				for (const call of elseStepCalls) {
					if (!this.isCtxStepCall(call)) continue;
					const step = this.findStepForCall(call, steps);
					if (step) {
						step.conditionalParent = {
							conditionText,
							branch: 'else',
							conditionSourceStepId,
							conditionVariableName,
						};

						// Add the condition source as a dependency
						if (conditionSourceStepId) {
							for (const [varName, sid] of variableToStepId) {
								if (sid === conditionSourceStepId) {
									step.dependencies.set(varName, sid);
									break;
								}
							}
						}
					}
				}
			}
		}
	}

	private findStepForCall(
		call: CallExpression,
		steps: StepDefinition[],
	): StepDefinition | undefined {
		const args = call.getArguments();
		if (args.length < 1) return undefined;

		const defArg = args[0];
		if (defArg.isKind(SyntaxKind.ObjectLiteralExpression)) {
			const nameProp = defArg.getProperty('name');
			if (nameProp?.isKind(SyntaxKind.PropertyAssignment)) {
				const init = nameProp.getInitializer();
				if (init?.isKind(SyntaxKind.StringLiteral)) {
					const name = init.getLiteralText();
					return steps.find((s) => s.name === name);
				}
			}
		}

		return undefined;
	}

	private findHelperFunctions(sourceFile: SourceFile, steps: StepDefinition[]): HelperFunction[] {
		const helpers: HelperFunction[] = [];
		const allFnBodies = steps.map((s) => s.functionBodyText).join('\n');

		// Find top-level function declarations
		for (const fn of sourceFile.getFunctions()) {
			const name = fn.getName();
			if (!name) continue;

			helpers.push({
				name,
				text: fn.getText(),
				references: this.findFunctionReferences(fn, sourceFile),
			});
		}

		// Find top-level const/let arrow functions
		for (const stmt of sourceFile.getVariableStatements()) {
			for (const decl of stmt.getDeclarations()) {
				const init = decl.getInitializer();
				if (
					init &&
					(init.isKind(SyntaxKind.ArrowFunction) || init.isKind(SyntaxKind.FunctionExpression))
				) {
					const name = decl.getName();
					helpers.push({
						name,
						text: stmt.getText(),
						references: this.findVariableReferences(name, sourceFile),
					});
				}
			}
		}

		// Filter to only helpers referenced by step functions (directly or transitively)
		const referencedNames = new Set<string>();
		const helperMap = new Map(helpers.map((h) => [h.name, h]));

		const markReferenced = (name: string) => {
			if (referencedNames.has(name)) return;
			referencedNames.add(name);
			const helper = helperMap.get(name);
			if (helper) {
				for (const ref of helper.references) {
					if (helperMap.has(ref)) {
						markReferenced(ref);
					}
				}
			}
		};

		for (const helper of helpers) {
			// Check if any step body references this helper
			const regex = new RegExp(`\\b${escapeRegExp(helper.name)}\\b`);
			if (regex.test(allFnBodies)) {
				markReferenced(helper.name);
			}
		}

		return helpers.filter((h) => referencedNames.has(h.name));
	}

	private findFunctionReferences(fn: FunctionDeclaration, _sourceFile: SourceFile): Set<string> {
		const refs = new Set<string>();
		const fnBody = fn.getBody();
		if (!fnBody) return refs;

		const identifiers = fnBody.getDescendantsOfKind(SyntaxKind.Identifier);
		for (const id of identifiers) {
			refs.add(id.getText());
		}
		return refs;
	}

	private findVariableReferences(name: string, sourceFile: SourceFile): Set<string> {
		const refs = new Set<string>();
		const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
		for (const id of identifiers) {
			const text = id.getText();
			if (text !== name) {
				refs.add(text);
			}
		}
		return refs;
	}

	private parseRetryConfig(
		optionsText: string,
	): { maxAttempts: number; baseDelay: number; maxDelay?: number; jitter?: boolean } | undefined {
		// Extract retry config from options text like { retry: { maxAttempts: 3, baseDelay: 1000 } }
		const retryMatch = optionsText.match(/retry\s*:\s*\{([^}]+)\}/);
		if (!retryMatch) return undefined;

		const retryText = retryMatch[1];

		const maxAttemptsMatch = retryText.match(/maxAttempts\s*:\s*(\d+)/);
		const baseDelayMatch = retryText.match(/baseDelay\s*:\s*(\d+)/);
		const maxDelayMatch = retryText.match(/maxDelay\s*:\s*(\d+)/);
		const jitterMatch = retryText.match(/jitter\s*:\s*(true|false)/);

		if (!maxAttemptsMatch || !baseDelayMatch) return undefined;

		return {
			maxAttempts: parseInt(maxAttemptsMatch[1], 10),
			baseDelay: parseInt(baseDelayMatch[1], 10),
			maxDelay: maxDelayMatch ? parseInt(maxDelayMatch[1], 10) : undefined,
			jitter: jitterMatch ? jitterMatch[1] === 'true' : undefined,
		};
	}

	// -----------------------------------------------------------------------
	// Graph building
	// -----------------------------------------------------------------------

	private buildGraph(steps: StepDefinition[]): WorkflowGraphData {
		const nodes: GraphNodeData[] = [];
		const edges: GraphEdgeData[] = [];

		// Every workflow has an implicit manual trigger node
		nodes.push({
			id: 'trigger',
			name: 'Manual Trigger',
			type: 'trigger',
			stepFunctionRef: 'step_trigger',
			config: { name: 'Manual Trigger' },
		});

		for (const step of steps) {
			const config: GraphNodeData['config'] = { name: step.name };

			if (step.retryConfig) {
				config.retryConfig = step.retryConfig;
			}

			if (step.timeout) {
				config.timeout = step.timeout;
			}

			if (step.stepType) {
				config.stepType = step.stepType as GraphStepConfig['stepType'];
			}

			if (step.icon) {
				config.icon = step.icon;
			}

			if (step.color) {
				config.color = step.color;
			}

			if (step.description) {
				config.description = step.description;
			}

			nodes.push({
				id: step.id,
				name: step.name,
				type: 'step',
				stepFunctionRef: `step_${step.id}`,
				config,
			});
		}

		// Build edges from dependencies
		for (const step of steps) {
			if (step.dependencies.size === 0) {
				// No dependencies - connect from trigger
				const conditionExpr = this.getConditionExpression(step);
				edges.push({
					from: 'trigger',
					to: step.id,
					...(conditionExpr ? { condition: conditionExpr } : {}),
				});
			} else {
				for (const [, sourceStepId] of step.dependencies) {
					const conditionExpr = this.getConditionExpression(step);
					edges.push({
						from: sourceStepId,
						to: step.id,
						...(conditionExpr ? { condition: conditionExpr } : {}),
					});
				}
			}
		}

		return { nodes, edges };
	}

	private getConditionExpression(step: StepDefinition): string | undefined {
		if (!step.conditionalParent) return undefined;

		const { conditionText, branch, conditionVariableName } = step.conditionalParent;

		// Replace the source variable name with 'output' so evaluateCondition
		// can evaluate it with the step output as the 'output' parameter.
		// e.g. "data.amount > 100" → "output.amount > 100"
		let expr = conditionText;
		if (conditionVariableName) {
			const regex = new RegExp(`\\b${escapeRegExp(conditionVariableName)}\\b`, 'g');
			expr = expr.replace(regex, 'output');
		}

		if (branch === 'then') {
			return expr;
		}
		return `!(${expr})`;
	}

	// -----------------------------------------------------------------------
	// Code generation
	// -----------------------------------------------------------------------

	private generateCode(steps: StepDefinition[], helpers: HelperFunction[]): string {
		const parts: string[] = [];

		// Emit helper functions at module level
		if (helpers.length > 0) {
			parts.push('// --- Helper functions ---');
			for (const helper of helpers) {
				// Strip TypeScript annotations for JS output
				parts.push(helper.text);
			}
			parts.push('');
		}

		// Emit each step as an exported function
		parts.push('// --- Step functions ---');
		for (const step of steps) {
			const fnName = `step_${toCamelCase(step.name)}`;
			const exportName = `step_${step.id}`;

			// Generate variable injection lines for dependencies
			const injections: string[] = [];
			for (const [varName, sourceStepId] of step.dependencies) {
				injections.push(`const ${varName} = ctx.input['${sourceStepId}'];`);
			}
			// Inject trigger data variables
			if (step.triggerDataVars.size > 0) {
				const varNames = [...step.triggerDataVars].join(', ');
				injections.push(`const { ${varNames} } = ctx.triggerData;`);
			}

			const body = step.functionBodyText;
			const injectionBlock = injections.length > 0 ? injections.join('\n    ') + '\n    ' : '';

			parts.push(
				`exports.${exportName} = async function ${fnName}(ctx) {\n    ${injectionBlock}${body}\n};`,
			);
			parts.push('');
		}

		return parts.join('\n');
	}

	private compileWithEsbuild(rawCode: string): { code: string; sourceMap: string | null } {
		try {
			const result = transformSync(rawCode, {
				loader: 'ts',
				format: 'cjs',
				target: 'node18',
				sourcemap: 'external',
				sourcefile: 'workflow.ts',
			});

			return {
				code: result.code,
				sourceMap: result.map || null,
			};
		} catch (err) {
			// If esbuild fails, return the raw code without source map
			return { code: rawCode, sourceMap: null };
		}
	}
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sourceFileLineAndColumn(node: Node): { line: number; column: number } {
	const sourceFile = node.getSourceFile();
	const pos = node.getStart();
	const lineAndCol = sourceFile.getLineAndColumnAtPos(pos);
	return { line: lineAndCol.line, column: lineAndCol.column };
}
