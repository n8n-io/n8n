/**
 * Structural shapes the engine reads. `INode` and `IWorkflowBase` from
 * `n8n-workflow`, and both git export formats, satisfy them, so the engine
 * does not depend on `n8n-workflow` and stays small for the CLI.
 */
export interface RuleNode {
	readonly id?: string;
	readonly name: string;
	readonly type: string;
	readonly typeVersion?: number;
	readonly parameters?: object;
	readonly credentials?: object | null;
	readonly disabled?: boolean;
	readonly retryOnFail?: boolean;
}

export interface RuleWorkflow {
	readonly id?: string | null;
	readonly name: string;
	readonly description?: string | null;
	readonly nodes: readonly RuleNode[];
	readonly connections?: object | null;
	readonly settings?: object | null;
	/** Inline agent tool nodes are appended after the host nodes. Only the host nodes are checked. */
	readonly hostNodeCount?: number;
}

export type RuleSeverity = 'off' | 'warn' | 'block';
export type FindingSeverity = Exclude<RuleSeverity, 'off'>;
export type RuleScope = 'instance' | 'project';
export type RuleCategory = 'reliability' | 'security' | 'conventions';

export interface RuleFinding {
	readonly ruleId: string;
	readonly ruleKind: 'catalogue' | 'custom';
	readonly scope: RuleScope;
	readonly severity: FindingSeverity;
	/** English text for the API, the CLI and the audit log. The editor renders `params` with i18n. */
	readonly message: string;
	readonly params: Readonly<Record<string, string>>;
	readonly nodeId?: string;
	readonly nodeName?: string;
	readonly parameterPath?: string;
	readonly exempted: boolean;
	/** Instance admins can always exempt. Project admins can exempt only when this is true. */
	readonly projectCanExempt: boolean;
}

export interface RuleEvaluationError {
	readonly ruleId: string;
	readonly message: string;
}

export interface RuleEvaluation {
	readonly findings: RuleFinding[];
	readonly errors: RuleEvaluationError[];
}

export interface RegexTester {
	test(pattern: string, input: string, flags?: string): boolean;
}

/** Instance settings the engine cannot read from the workflow itself. */
export interface RuleDefaults {
	readonly callerPolicy?: string;
	readonly executionTimeout?: number;
	readonly maxExecutionTimeout?: number;
}

export interface EvaluateOptions {
	/** Rule ids exempted for this workflow. */
	readonly exemptedRuleIds?: ReadonlySet<string> | readonly string[];
	readonly regex?: RegexTester;
	readonly defaults?: RuleDefaults;
	/** Returns the name n8n gives a new node of this type. Without it, the default-name rule is skipped. */
	readonly getDefaultNodeName?: (node: RuleNode) => string | undefined;
}

export interface RuleContext {
	readonly regex: RegexTester;
	readonly defaults: RuleDefaults;
	readonly getDefaultNodeName?: (node: RuleNode) => string | undefined;
}

/** What a rule reports before the engine adds severity, scope and exemption. */
export interface RawFinding {
	readonly message: string;
	readonly params: Record<string, string>;
	readonly node?: RuleNode;
	readonly parameterPath?: string;
}
