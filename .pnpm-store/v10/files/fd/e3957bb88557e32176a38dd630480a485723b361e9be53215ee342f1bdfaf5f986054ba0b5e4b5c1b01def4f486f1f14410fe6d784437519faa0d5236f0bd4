/**
 * @fileoverview This file contains the types for ESLint Scope.
 * It was initially extracted from the DefinitelyTyped repository.
 */

/*
 * MIT License
 * Copyright (c) Microsoft Corporation.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE
 */

//------------------------------------------------------------------------------
// Imports
//------------------------------------------------------------------------------

import type { Visitor, VisitorOptions } from "esrecurse";
import type * as ESTree from "estree";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

interface JSXIdentifier extends ESTree.BaseNode {
	type: "JSXIdentifier";
	name: string;
}

//------------------------------------------------------------------------------
// Exports
//------------------------------------------------------------------------------

/**
 * Options for scope analysis.
 */
export interface AnalyzeOptions {
	/**
	 * Whether to ignore `eval()` calls, which normally create scopes.
	 * @default false
	 */
	ignoreEval?: boolean;

	/**
	 * Whether to create a top-level function scope for CommonJS evaluation.
	 * @default false
	 */
	nodejsScope?: boolean;

	/**
	 * Whether to evaluate code in strict mode even outside modules or without `"use strict"`.
	 * @default false
	 */
	impliedStrict?: boolean;

	/**
	 * The ECMAScript version to use for evaluation (e.g., `5`, `2015`, `2022`).
	 * @default 5
	 */
	ecmaVersion?: number;

	/**
	 * The type of JavaScript file to evaluate.
	 * @default "script"
	 */
	sourceType?: "script" | "module" | "commonjs";

	/**
	 * Visitor key information for performance enhancement.
	 * @default null
	 */
	childVisitorKeys?: {
		readonly [type: string]: ReadonlyArray<string>;
	} | null;

	/**
	 * Strategy to use when `childVisitorKeys` is not specified.
	 * @default "iteration"
	 */
	fallback?: "iteration" | ((node: ESTree.Node) => string[]);

	/**
	 * Whether to enable optimistic scope analysis.
	 * @default false
	 */
	optimistic?: boolean;

	/**
	 * Enables the tracking of JSX components as variable references.
	 * @default false
	 */
	jsx?: boolean;
}

/**
 * Callback function for pattern visitors.
 */
export type PatternVisitorCallback = (
	pattern: ESTree.Identifier,
	misc: {
		topLevel: boolean;
		rest: boolean;
		assignments: ESTree.AssignmentPattern[];
	},
) => void;

/**
 * Manages the scope hierarchy of an AST.
 */
export class ScopeManager {
	/**
	 * Creates a new `ScopeManager` instance.
	 * @param options Options for scope analysis.
	 */
	constructor(options: AnalyzeOptions);

	/**
	 * The global scope, initially set to `null`.
	 */
	globalScope: GlobalScope | null;

	/**
	 * All scopes in the analyzed program.
	 */
	scopes: Scope[];

	/**
	 * Adds variables to the global scope and resolves references to them.
	 * @param names An array of strings, the names of variables to add to the global scope.
	 * @returns void
	 */
	addGlobals(names: ReadonlyArray<string>): void;

	/**
	 * Acquires the scope for a given node.
	 * @param node The AST node to get the scope for.
	 * @param inner Whether to get the innermost scope. (default: `false`)
	 * @returns The scope or null if not found.
	 */
	acquire(node: ESTree.Node, inner?: boolean): Scope | null;

	/**
	 * acquire all scopes from node.
	 * @param node node for the acquired scope.
	 * @returns Scope array
	 * @deprecated
	 */
	acquireAll(node: ESTree.Node): Scope[] | null;

	/**
	 * Releases a scope, moving to its parent.
	 * @param node The AST node to release the scope for.
	 * @param inner Whether to release the innermost scope. (default: `false`)
	 * @returns The parent scope or null if not found.
	 */
	release(node: ESTree.Node, inner?: boolean): Scope | null;

	/**
	 * Gets all scopes for a given node, including parents.
	 * @param node The AST node to get scopes for.
	 * @param inner Whether to start from the innermost scope.
	 * @returns Array of scopes or empty array if none found.
	 */
	getDeclaredVariables(node: ESTree.Node): Variable[];

	/**
	 * Determines if the global return statement should be allowed.
	 * @returns `true` if the global return is enabled.
	 */
	isGlobalReturn(): boolean;

	/** @deprecated */
	isModule(): boolean;

	/** @deprecated */
	isImpliedStrict(): boolean;

	/** @deprecated */
	isStrictModeSupported(): boolean;

	/** @deprecated */
	attach(): void;

	/** @deprecated */
	detach(): void;
}

/**
 * Base export class for all scopes.
 */
export class Scope<
	TVariable extends Variable = Variable,
	TReference extends Reference = Reference,
> {
	/**
	 * Creates a new `Scope` instance.
	 * @param scopeManager The scope manager this scope belongs to.
	 * @param type The type of the scope.
	 * @param upperScope The parent scope, or null for the global scope.
	 * @param block The AST node that created this scope.
	 * @param isMethodDefinition Whether this scope is for a method definition.
	 */
	constructor(
		scopeManager: ScopeManager,
		type: typeof this.type,
		upperScope: Scope | null,
		block: ESTree.Node,
		isMethodDefinition: boolean,
	);

	/**
	 * The type of the scope (e.g., 'global', 'function').
	 */
	type:
		| "block"
		| "catch"
		| "class"
		| "class-field-initializer"
		| "class-static-block"
		| "for"
		| "function"
		| "function-expression-name"
		| "global"
		| "module"
		| "switch"
		| "with";

	/**
	 * Whether the scope is in strict mode.
	 */
	isStrict: boolean;

	/**
	 * The parent scope, or null for the global scope.
	 */
	upper: Scope | null;

	/**
	 * The scope where variables are declared (same as this for most scopes).
	 */
	variableScope: Scope;

	/**
	 * Variables defined in this scope.
	 */
	variables: TVariable[];

	/**
	 * References to variables in this scope.
	 */
	references: TReference[];

	/**
	 * Child scopes.
	 */
	childScopes: Scope[];

	/**
	 * The AST node that created this scope.
	 */
	block: ESTree.Node;

	/**
	 * Whether this is a function expression scope.
	 */
	functionExpressionScope: boolean;

	/**
	 * Map of variable names to variables.
	 */
	set: Map<string, TVariable>;

	/**
	 * The tainted variables of this scope.
	 * @deprecated
	 */
	taints: Map<string, TVariable>;

	/**
	 * References that pass through this scope to outer scopes.
	 */
	through: TReference[];

	/**
	 * Dynamic flag for certain scope types.
	 * @deprecated
	 */
	dynamic: boolean;

	/**
	 * Direct call to eval() flag.
	 * @deprecated
	 */
	directCallToEvalScope: boolean;

	/**
	 * This scope flag.
	 * @deprecated
	 */
	thisFound: boolean;

	/**
	 * Resolves a reference in this scope.
	 * @param ident An AST node to get their reference object.
	 * @deprecated
	 */
	resolve(ident: ESTree.Identifier): TReference | null;

	/**
	 * Whether the reference is static.
	 * @deprecated
	 */
	isStatic(): boolean;

	/**
	 * Returns whether this scope has materialized arguments.
	 * @deprecated
	 */
	isArgumentsMaterialized(): boolean;

	/**
	 * Returns whether this scope has materialized `this` reference.
	 * @deprecated
	 */
	isThisMaterialized(): boolean;

	/** @deprecated */
	isUsedName(name: string): boolean;
}

/**
 * Global scope.
 */
export class GlobalScope extends Scope {
	/**
	 * Creates a new GlobalScope instance.
	 * @param scopeManager The scope manager this scope belongs to.
	 * @param block The AST node that created this scope.
	 */
	constructor(scopeManager: ScopeManager, block: ESTree.Node);

	type: "global";

	functionExpressionScope: false;

	isArgumentsMaterialized(): true;

	isThisMaterialized(): true;

	/**
	 * Implicit references (e.g., 'arguments' in functions).
	 */
	implicit: {
		left: Reference[];
		set: Map<string, Variable>;
		variables: Variable[];
	};
}

/**
 * Module scope.
 */
export class ModuleScope extends Scope {
	/**
	 * Creates a new ModuleScope instance.
	 * @param scopeManager The scope manager this scope belongs to.
	 * @param upperScope The parent scope.
	 * @param block The AST node that created this scope.
	 */
	constructor(
		scopeManager: ScopeManager,
		upperScope: Scope,
		block: ESTree.Node,
	);

	type: "module";

	functionExpressionScope: false;

	isArgumentsMaterialized(): true;

	isThisMaterialized(): true;
}

/**
 * Function expression name scope.
 */
export class FunctionExpressionNameScope extends Scope {
	/**
	 * Creates a new FunctionExpressionNameScope instance.
	 * @param scopeManager The scope manager this scope belongs to.
	 * @param upperScope The parent scope.
	 * @param block The AST node that created this scope.
	 */
	constructor(
		scopeManager: ScopeManager,
		upperScope: Scope,
		block: ESTree.Node,
	);

	type: "function-expression-name";

	functionExpressionScope: true;

	isArgumentsMaterialized(): true;

	isThisMaterialized(): true;
}

/**
 * Catch scope.
 */
export class CatchScope extends Scope {
	/**
	 * Creates a new CatchScope instance.
	 * @param scopeManager The scope manager this scope belongs to.
	 * @param upperScope The parent scope.
	 * @param block The AST node that created this scope.
	 */
	constructor(
		scopeManager: ScopeManager,
		upperScope: Scope,
		block: ESTree.Node,
	);

	type: "catch";

	functionExpressionScope: false;

	isArgumentsMaterialized(): true;

	isThisMaterialized(): true;
}

/**
 * With scope.
 */
export class WithScope extends Scope {
	/**
	 * Creates a new WithScope instance.
	 * @param scopeManager The scope manager this scope belongs to.
	 * @param upperScope The parent scope.
	 * @param block The AST node that created this scope.
	 */
	constructor(
		scopeManager: ScopeManager,
		upperScope: Scope,
		block: ESTree.Node,
	);

	type: "with";

	functionExpressionScope: false;

	isArgumentsMaterialized(): true;

	isThisMaterialized(): true;
}

/**
 * Block scope.
 */
export class BlockScope extends Scope {
	/**
	 * Creates a new BlockScope instance.
	 * @param scopeManager The scope manager this scope belongs to.
	 * @param upperScope The parent scope.
	 * @param block The AST node that created this scope.
	 */
	constructor(
		scopeManager: ScopeManager,
		upperScope: Scope,
		block: ESTree.Node,
	);

	type: "block";

	functionExpressionScope: false;

	isArgumentsMaterialized(): true;

	isThisMaterialized(): true;
}

/**
 * Switch scope.
 */
export class SwitchScope extends Scope {
	/**
	 * Creates a new SwitchScope instance.
	 * @param scopeManager The scope manager this scope belongs to.
	 * @param upperScope The parent scope.
	 * @param block The AST node that created this scope.
	 */
	constructor(
		scopeManager: ScopeManager,
		upperScope: Scope,
		block: ESTree.Node,
	);

	type: "switch";

	functionExpressionScope: false;

	isArgumentsMaterialized(): true;

	isThisMaterialized(): true;
}

/**
 * Function scope.
 */
export class FunctionScope extends Scope {
	/**
	 * Creates a new FunctionScope instance.
	 * @param scopeManager The scope manager this scope belongs to.
	 * @param upperScope The parent scope.
	 * @param block The AST node that created this scope.
	 * @param isMethodDefinition Whether this scope is for a method definition.
	 */
	constructor(
		scopeManager: ScopeManager,
		upperScope: Scope,
		block: ESTree.Node,
		isMethodDefinition: boolean,
	);

	type: "function";

	functionExpressionScope: false;
}

/**
 * Scope of for, for-in, and for-of statements.
 */
export class ForScope extends Scope {
	/**
	 * Creates a new ForScope instance.
	 * @param scopeManager The scope manager this scope belongs to.
	 * @param upperScope The parent scope.
	 * @param block The AST node that created this scope.
	 */
	constructor(
		scopeManager: ScopeManager,
		upperScope: Scope,
		block: ESTree.Node,
	);

	type: "for";

	functionExpressionScope: false;

	isArgumentsMaterialized(): true;

	isThisMaterialized(): true;
}

/**
 * Class scope.
 */
export class ClassScope extends Scope {
	/**
	 * Creates a new ClassScope instance.
	 * @param scopeManager The scope manager this scope belongs to.
	 * @param upperScope The parent scope.
	 * @param block The AST node that created this scope.
	 */
	constructor(
		scopeManager: ScopeManager,
		upperScope: Scope,
		block: ESTree.Node,
	);

	type: "class";

	functionExpressionScope: false;

	isArgumentsMaterialized(): true;

	isThisMaterialized(): true;
}

/**
 * Class field initializer scope.
 */
export class ClassFieldInitializerScope extends Scope {
	/**
	 * Creates a new ClassFieldInitializerScope instance.
	 * @param scopeManager The scope manager this scope belongs to.
	 * @param upperScope The parent scope.
	 * @param block The AST node that created this scope.
	 */
	constructor(
		scopeManager: ScopeManager,
		upperScope: Scope,
		block: ESTree.Node,
	);

	type: "class-field-initializer";

	functionExpressionScope: false;

	isArgumentsMaterialized(): true;

	isThisMaterialized(): true;
}

/**
 * Class static block scope.
 */
export class ClassStaticBlockScope extends Scope {
	/**
	 * Creates a new ClassStaticBlockScope instance.
	 * @param scopeManager The scope manager this scope belongs to.
	 * @param upperScope The parent scope.
	 * @param block The AST node that created this scope.
	 */
	constructor(
		scopeManager: ScopeManager,
		upperScope: Scope,
		block: ESTree.Node,
	);

	type: "class-static-block";

	functionExpressionScope: false;

	isArgumentsMaterialized(): true;

	isThisMaterialized(): true;
}

/**
 * Represents a variable in a scope.
 */
export class Variable<TReference extends Reference = Reference> {
	static readonly CatchClause: "CatchClause";
	static readonly Parameter: "Parameter";
	static readonly FunctionName: "FunctionName";
	static readonly ClassName: "ClassName";
	static readonly Variable: "Variable";
	static readonly ImportBinding: "ImportBinding";
	static readonly ImplicitGlobalVariable: "ImplicitGlobalVariable";

	/**
	 * Creates a new Variable instance.
	 * @param name The name of the variable.
	 * @param scope The scope where the variable is defined.
	 */
	constructor(name: string, scope: Scope);

	/**
	 * The name of the variable.
	 */
	name: string;

	/**
	 * The scope where the variable is defined.
	 */
	scope: Scope;

	/**
	 * Identifiers that declare this variable.
	 */
	identifiers: ESTree.Identifier[];

	/**
	 * References to this variable.
	 */
	references: TReference[];

	/**
	 * Definitions of this variable.
	 */
	defs: Definition[];

	/**
	 * Whether the variable is tainted (e.g., potentially modified externally).
	 * @deprecated
	 */
	tainted: boolean;

	/**
	 * Stack flag for certain variable types.
	 * @deprecated
	 */
	stack: boolean;
}

/**
 * Represents a reference to a variable.
 */
export class Reference {
	static readonly READ: 1;
	static readonly WRITE: 2;
	static readonly RW: 3;

	/**
	 * Creates a new Reference instance.
	 * @param ident The identifier node of the reference.
	 * @param scope The scope where the reference occurs.
	 * @param flag The reference flag (read, write, or read-write).
	 * @param writeExpr The expression being written, if applicable.
	 * @param maybeImplicitGlobal Information about a possible global variable, if applicable.
	 * @param partial Whether this is a partial reference.
	 * @param init Whether this is an initialization reference.
	 */
	constructor(
		ident: ESTree.Identifier | JSXIdentifier,
		scope: Scope,
		flag: number,
		writeExpr: ESTree.Expression | null,
		maybeImplicitGlobal: {
			pattern: ESTree.Pattern;
			node: ESTree.Node;
		} | null,
		partial: boolean,
		init: boolean,
	);

	/**
	 * The identifier node of the reference.
	 */
	identifier: ESTree.Identifier | JSXIdentifier;

	/**
	 * The variable being referenced, or null if unresolved.
	 */
	resolved: Variable | null;

	/**
	 * Whether the reference is static.
	 * @deprecated
	 */
	isStatic(): boolean;

	/**
	 * Whether this is a write operation.
	 */
	isWrite(): boolean;

	/**
	 * Whether this is a read operation.
	 */
	isRead(): boolean;

	/**
	 * The scope where the reference occurs.
	 */
	from: Scope;

	/**
	 * Whether the reference comes from a dynamic scope (such as 'eval',
	 * 'with', etc.), and may be trapped by dynamic scopes.
	 * @deprecated
	 */
	tainted: boolean;

	/**
	 * The expression being written, if applicable.
	 */
	writeExpr?: ESTree.Expression | null;

	/**
	 * Whether this is a partial reference.
	 * @deprecated
	 */
	partial?: boolean;

	/**
	 * Whether this is an initialization reference.
	 */
	init?: boolean;

	/**
	 * Whether this reference is only read.
	 * @returns True if the reference is read-only.
	 */
	isReadOnly(): boolean;

	/**
	 * Whether this reference is only written.
	 * @returns True if the reference is write-only.
	 */
	isWriteOnly(): boolean;

	/**
	 * Whether this reference is read-write.
	 * @returns True if the reference is read-write.
	 */
	isReadWrite(): boolean;

	/** @deprecated */
	flag: number;
}

/**
 * Represents a variable definition.
 */
export const Definition: {
	/**
	 * Creates a new Definition instance.
	 * @param type The type of definition (e.g., 'Variable', 'Parameter').
	 * @param name The identifier node of the definition.
	 * @param node The AST node where the definition occurs.
	 * @param parent The parent node, if applicable.
	 * @param index The index of the definition in a pattern, if applicable.
	 * @param kind The kind of variable (e.g., 'var', 'let', 'const'), if applicable.
	 */
	new (
		type: Definition["type"],
		name: ESTree.Identifier,
		node: Definition["node"],
		parent: Definition["parent"],
		index: number | null,
		kind: string | null,
	): Definition;
};

export type Definition = (
	| { type: "CatchClause"; node: ESTree.CatchClause; parent: null }
	| {
			type: "ClassName";
			node: ESTree.ClassDeclaration | ESTree.ClassExpression;
			parent: null;
	  }
	| {
			type: "FunctionName";
			node: ESTree.FunctionDeclaration | ESTree.FunctionExpression;
			parent: null;
	  }
	| {
			type: "ImplicitGlobalVariable";
			node:
				| ESTree.AssignmentExpression
				| ESTree.ForInStatement
				| ESTree.ForOfStatement;
			parent: null;
	  }
	| {
			type: "ImportBinding";
			node:
				| ESTree.ImportSpecifier
				| ESTree.ImportDefaultSpecifier
				| ESTree.ImportNamespaceSpecifier;
			parent: ESTree.ImportDeclaration;
	  }
	| {
			type: "Parameter";
			node:
				| ESTree.FunctionDeclaration
				| ESTree.FunctionExpression
				| ESTree.ArrowFunctionExpression;
			parent: null;
	  }
	| {
			type: "Variable";
			node: ESTree.VariableDeclarator;
			parent: ESTree.VariableDeclaration;
	  }
) & {
	/**
	 * The identifier node of the definition.
	 */
	name: ESTree.Identifier;

	/**
	 * The index of the definition in a pattern, if applicable.
	 * @deprecated
	 */
	index: number | null;

	/**
	 * The kind of variable (e.g., 'var', 'let', 'const'), if applicable.
	 * @deprecated
	 */
	kind: string | null;
};

/**
 * Visitor for destructuring patterns.
 */
export class PatternVisitor extends Visitor {
	static isPattern(
		node: ESTree.Node,
	): node is
		| ESTree.Identifier
		| ESTree.ObjectPattern
		| ESTree.ArrayPattern
		| ESTree.SpreadElement
		| ESTree.RestElement
		| ESTree.AssignmentPattern;

	constructor(
		options: VisitorOptions | null | undefined,
		rootPattern: ESTree.Pattern,
		callback: PatternVisitorCallback,
	);

	rootPattern: ESTree.Pattern;

	callback: PatternVisitorCallback;

	assignments: Array<ESTree.AssignmentExpression | ESTree.AssignmentPattern>;

	rightHandNodes: ESTree.Node[];

	restElements: ESTree.RestElement[];

	Identifier(pattern: ESTree.Identifier): void;

	Property(pattern: ESTree.Property): void;

	ArrayPattern(pattern: ESTree.ArrayPattern): void;

	AssignmentPattern(pattern: ESTree.AssignmentPattern): void;

	RestElement(pattern: ESTree.RestElement): void;

	MemberExpression(pattern: ESTree.MemberExpression): void;

	SpreadElement(pattern: ESTree.SpreadElement): void;

	ArrayExpression(pattern: ESTree.ArrayExpression): void;

	AssignmentExpression(pattern: ESTree.AssignmentExpression): void;

	CallExpression(pattern: ESTree.CallExpression): void;
}

/**
 * Visitor class for traversing AST nodes and creating variable references and bindings.
 */
export class Referencer extends Visitor {
	/**
	 * Creates a new Referencer instance.
	 * @param options Options for scope analysis.
	 * @param scopeManager The scope manager to use.
	 */
	constructor(
		options: VisitorOptions | null | undefined,
		scopeManager: ScopeManager,
	);

	/**
	 * Options for scope analysis.
	 */
	options: VisitorOptions | null | undefined;

	/**
	 * The scope manager being used.
	 */
	scopeManager: ScopeManager;

	/**
	 * The parent node.
	 */
	parent: ESTree.Node | null;

	/**
	 * Whether currently inside a method definition.
	 */
	isInnerMethodDefinition: boolean;

	/**
	 * Gets the current scope.
	 * @returns The current scope.
	 */
	currentScope(): Scope;

	/**
	 * Closes scopes up to the given node.
	 * @param node The AST node.
	 */
	close(node: ESTree.Node): void;

	/**
	 * Pushes a new inner method definition state.
	 * @param isInnerMethodDefinition Whether inside a method definition.
	 * @returns The previous state.
	 */
	pushInnerMethodDefinition(isInnerMethodDefinition: boolean): boolean;

	/**
	 * Pops the inner method definition state.
	 * @param isInnerMethodDefinition The state to restore.
	 */
	popInnerMethodDefinition(isInnerMethodDefinition: boolean): void;

	/**
	 * References default values in patterns.
	 * @param pattern The pattern.
	 * @param assignments The assignments.
	 * @param maybeImplicitGlobal Information about a possible implicit global.
	 * @param init Whether this is an initialization.
	 */
	referencingDefaultValue(
		pattern: ESTree.Pattern,
		assignments: Array<
			ESTree.AssignmentExpression | ESTree.AssignmentPattern
		>,
		maybeImplicitGlobal: {
			pattern: ESTree.Pattern;
			node: ESTree.Node;
		} | null,
		init: boolean,
	): void;

	/**
	 * Visits a pattern node.
	 * @param node The pattern node.
	 * @param options Options or callback.
	 * @param callback The callback function.
	 */
	visitPattern(
		node: ESTree.Pattern,
		options: { processRightHandNodes: boolean } | PatternVisitorCallback,
		callback?: PatternVisitorCallback,
	): void;

	/**
	 * Visits a function node.
	 * @param node The function node.
	 */
	visitFunction(
		node:
			| ESTree.FunctionDeclaration
			| ESTree.FunctionExpression
			| ESTree.ArrowFunctionExpression,
	): void;

	/**
	 * Visits a class node.
	 * @param node The class node.
	 */
	visitClass(node: ESTree.ClassDeclaration | ESTree.ClassExpression): void;

	/**
	 * Visits a property node.
	 * @param node The property node.
	 */
	visitProperty(node: ESTree.Property | ESTree.MethodDefinition): void;

	/**
	 * Visits a for-in or for-of statement.
	 * @param node The for-in or for-of node.
	 */
	visitForIn(node: ESTree.ForInStatement | ESTree.ForOfStatement): void;

	/**
	 * Visits a variable declaration.
	 * @param variableTargetScope The scope where the variable should be defined.
	 * @param type The variable type.
	 * @param node The variable declaration node.
	 * @param index The index of the declarator.
	 */
	visitVariableDeclaration(
		variableTargetScope: Scope,
		type: typeof Variable.Variable,
		node: ESTree.VariableDeclaration,
		index: number,
	): void;

	/**
	 * Visits an export declaration.
	 * @param node The export declaration node.
	 */
	visitExportDeclaration(
		node:
			| ESTree.ExportAllDeclaration
			| ESTree.ExportDefaultDeclaration
			| ESTree.ExportNamedDeclaration,
	): void;

	AssignmentExpression(node: ESTree.AssignmentExpression): void;
	CatchClause(node: ESTree.CatchClause): void;
	Program(node: ESTree.Program): void;
	Identifier(node: ESTree.Identifier): void;
	PrivateIdentifier(): void;
	UpdateExpression(node: ESTree.UpdateExpression): void;
	MemberExpression(node: ESTree.MemberExpression): void;
	Property(node: ESTree.Property): void;
	PropertyDefinition(node: ESTree.PropertyDefinition): void;
	StaticBlock(node: ESTree.StaticBlock): void;
	MethodDefinition(node: ESTree.MethodDefinition): void;
	BreakStatement(): void;
	ContinueStatement(): void;
	LabeledStatement(node: ESTree.LabeledStatement): void;
	ForStatement(node: ESTree.ForStatement): void;
	ClassExpression(node: ESTree.ClassExpression): void;
	ClassDeclaration(node: ESTree.ClassDeclaration): void;
	CallExpression(node: ESTree.CallExpression): void;
	BlockStatement(node: ESTree.BlockStatement): void;
	ThisExpression(): void;
	WithStatement(node: ESTree.WithStatement): void;
	VariableDeclaration(node: ESTree.VariableDeclaration): void;
	SwitchStatement(node: ESTree.SwitchStatement): void;
	FunctionDeclaration(node: ESTree.FunctionDeclaration): void;
	FunctionExpression(node: ESTree.FunctionExpression): void;
	ForOfStatement(node: ESTree.ForOfStatement): void;
	ForInStatement(node: ESTree.ForInStatement): void;
	ArrowFunctionExpression(node: ESTree.ArrowFunctionExpression): void;
	ImportDeclaration(node: ESTree.ImportDeclaration): void;
	ExportDeclaration(
		node:
			| ESTree.ExportAllDeclaration
			| ESTree.ExportDefaultDeclaration
			| ESTree.ExportNamedDeclaration,
	): void;
	ExportAllDeclaration(node: ESTree.ExportAllDeclaration): void;
	ExportDefaultDeclaration(node: ESTree.ExportDefaultDeclaration): void;
	ExportNamedDeclaration(node: ESTree.ExportNamedDeclaration): void;
	ExportSpecifier(node: ESTree.ExportSpecifier): void;
	MetaProperty(): void;
	JSXIdentifier(node: JSXIdentifier): void;
	JSXMemberExpression(node: any): void;
	JSXElement(node: any): void;
	JSXOpeningElement(node: any): void;
	JSXAttribute(node: any): void;
	JSXExpressionContainer(node: any): void;
	JSXNamespacedName(node: any): void;
}

/**
 * Analyzes the scope of an AST.
 * @param ast The ESTree-compliant AST to analyze.
 * @param options Options for scope analysis.
 * @returns The scope manager for the analyzed AST.
 */
export function analyze(
	ast: ESTree.Program,
	options?: AnalyzeOptions,
): ScopeManager;

/**
 * The version of ESLint Scope.
 */
export const version: string;
