/**
 * @fileoverview This file contains the core types for ESLint. It was initially extracted
 * from the `@types/eslint` package.
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

import * as ESTree from "estree";
import type {
	RuleVisitor,
	TextSourceCode,
	Language,
	SourceRange,
	TraversalStep,
	LanguageOptions as GenericLanguageOptions,
	RuleDefinition,
	RuleContext as CoreRuleContext,
	DeprecatedInfo,
} from "@eslint/core";
import { JSONSchema4 } from "json-schema";
import { LegacyESLint } from "./use-at-your-own-risk.js";

export namespace AST {
	type TokenType =
		| "Boolean"
		| "Null"
		| "Identifier"
		| "Keyword"
		| "Punctuator"
		| "JSXIdentifier"
		| "JSXText"
		| "Numeric"
		| "String"
		| "RegularExpression";

	interface Token {
		type: TokenType;
		value: string;
		range: Range;
		loc: SourceLocation;
	}

	interface SourceLocation {
		start: ESTree.Position;
		end: ESTree.Position;
	}

	type Range = [number, number];

	interface Program extends ESTree.Program {
		comments: ESTree.Comment[];
		tokens: Token[];
		loc: SourceLocation;
		range: Range;
	}
}

export namespace Scope {
	interface ScopeManager {
		scopes: Scope[];
		globalScope: Scope | null;

		acquire(node: ESTree.Node, inner?: boolean): Scope | null;

		getDeclaredVariables(node: ESTree.Node): Variable[];
	}

	interface Scope {
		type:
			| "block"
			| "catch"
			| "class"
			| "for"
			| "function"
			| "function-expression-name"
			| "global"
			| "module"
			| "switch"
			| "with"
			| "TDZ";
		isStrict: boolean;
		upper: Scope | null;
		childScopes: Scope[];
		variableScope: Scope;
		block: ESTree.Node;
		variables: Variable[];
		set: Map<string, Variable>;
		references: Reference[];
		through: Reference[];
		functionExpressionScope: boolean;
	}

	interface Variable {
		name: string;
		scope: Scope;
		identifiers: ESTree.Identifier[];
		references: Reference[];
		defs: Definition[];
	}

	interface Reference {
		identifier: ESTree.Identifier;
		from: Scope;
		resolved: Variable | null;
		writeExpr: ESTree.Node | null;
		init: boolean;

		isWrite(): boolean;

		isRead(): boolean;

		isWriteOnly(): boolean;

		isReadOnly(): boolean;

		isReadWrite(): boolean;
	}

	type DefinitionType =
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
		| { type: "ImplicitGlobalVariable"; node: ESTree.Program; parent: null }
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
		| { type: "TDZ"; node: any; parent: null }
		| {
				type: "Variable";
				node: ESTree.VariableDeclarator;
				parent: ESTree.VariableDeclaration;
		  };

	type Definition = DefinitionType & { name: ESTree.Identifier };
}

// #region SourceCode

export class SourceCode
	implements
		TextSourceCode<{
			LangOptions: Linter.LanguageOptions;
			RootNode: AST.Program;
			SyntaxElementWithLoc: AST.Token | ESTree.Node;
			ConfigNode: ESTree.Comment;
		}>
{
	text: string;
	ast: AST.Program;
	lines: string[];
	hasBOM: boolean;
	parserServices: SourceCode.ParserServices;
	scopeManager: Scope.ScopeManager;
	visitorKeys: SourceCode.VisitorKeys;

	constructor(text: string, ast: AST.Program);
	constructor(config: SourceCode.Config);

	static splitLines(text: string): string[];

	getLoc(syntaxElement: AST.Token | ESTree.Node): ESTree.SourceLocation;
	getRange(syntaxElement: AST.Token | ESTree.Node): SourceRange;

	getText(
		node?: ESTree.Node,
		beforeCount?: number,
		afterCount?: number,
	): string;

	getLines(): string[];

	getAllComments(): ESTree.Comment[];

	getAncestors(node: ESTree.Node): ESTree.Node[];

	getDeclaredVariables(node: ESTree.Node): Scope.Variable[];

	getJSDocComment(node: ESTree.Node): ESTree.Comment | null;

	getNodeByRangeIndex(index: number): ESTree.Node | null;

	isSpaceBetweenTokens(first: AST.Token, second: AST.Token): boolean;

	getLocFromIndex(index: number): ESTree.Position;

	getIndexFromLoc(location: ESTree.Position): number;

	// Inherited methods from TokenStore
	// ---------------------------------

	getTokenByRangeStart(
		offset: number,
		options?: { includeComments: false },
	): AST.Token | null;
	getTokenByRangeStart(
		offset: number,
		options: { includeComments: boolean },
	): AST.Token | ESTree.Comment | null;

	getFirstToken: SourceCode.UnaryNodeCursorWithSkipOptions;

	getFirstTokens: SourceCode.UnaryNodeCursorWithCountOptions;

	getLastToken: SourceCode.UnaryNodeCursorWithSkipOptions;

	getLastTokens: SourceCode.UnaryNodeCursorWithCountOptions;

	getTokenBefore: SourceCode.UnaryCursorWithSkipOptions;

	getTokensBefore: SourceCode.UnaryCursorWithCountOptions;

	getTokenAfter: SourceCode.UnaryCursorWithSkipOptions;

	getTokensAfter: SourceCode.UnaryCursorWithCountOptions;

	getFirstTokenBetween: SourceCode.BinaryCursorWithSkipOptions;

	getFirstTokensBetween: SourceCode.BinaryCursorWithCountOptions;

	getLastTokenBetween: SourceCode.BinaryCursorWithSkipOptions;

	getLastTokensBetween: SourceCode.BinaryCursorWithCountOptions;

	getTokensBetween: SourceCode.BinaryCursorWithCountOptions;

	getTokens: ((
		node: ESTree.Node,
		beforeCount?: number,
		afterCount?: number,
	) => AST.Token[]) &
		SourceCode.UnaryNodeCursorWithCountOptions;

	commentsExistBetween(
		left: ESTree.Node | AST.Token | ESTree.Comment,
		right: ESTree.Node | AST.Token | ESTree.Comment,
	): boolean;

	getCommentsBefore(nodeOrToken: ESTree.Node | AST.Token): ESTree.Comment[];

	getCommentsAfter(nodeOrToken: ESTree.Node | AST.Token): ESTree.Comment[];

	getCommentsInside(node: ESTree.Node): ESTree.Comment[];

	getScope(node: ESTree.Node): Scope.Scope;

	isSpaceBetween(
		first: ESTree.Node | AST.Token,
		second: ESTree.Node | AST.Token,
	): boolean;

	isGlobalReference(node: ESTree.Identifier): boolean;

	markVariableAsUsed(name: string, refNode?: ESTree.Node): boolean;

	traverse(): Iterable<TraversalStep>;
}

export namespace SourceCode {
	interface Config {
		text: string;
		ast: AST.Program;
		parserServices?: ParserServices | undefined;
		scopeManager?: Scope.ScopeManager | undefined;
		visitorKeys?: VisitorKeys | undefined;
	}

	type ParserServices = any;

	interface VisitorKeys {
		[nodeType: string]: string[];
	}

	interface UnaryNodeCursorWithSkipOptions {
		<T extends AST.Token>(
			node: ESTree.Node,
			options:
				| ((token: AST.Token) => token is T)
				| {
						filter: (token: AST.Token) => token is T;
						includeComments?: false | undefined;
						skip?: number | undefined;
				  },
		): T | null;
		<T extends AST.Token | ESTree.Comment>(
			node: ESTree.Node,
			options: {
				filter: (
					tokenOrComment: AST.Token | ESTree.Comment,
				) => tokenOrComment is T;
				includeComments: boolean;
				skip?: number | undefined;
			},
		): T | null;
		(
			node: ESTree.Node,
			options?:
				| {
						filter?: ((token: AST.Token) => boolean) | undefined;
						includeComments?: false | undefined;
						skip?: number | undefined;
				  }
				| ((token: AST.Token) => boolean)
				| number,
		): AST.Token | null;
		(
			node: ESTree.Node,
			options: {
				filter?:
					| ((token: AST.Token | ESTree.Comment) => boolean)
					| undefined;
				includeComments: boolean;
				skip?: number | undefined;
			},
		): AST.Token | ESTree.Comment | null;
	}

	interface UnaryNodeCursorWithCountOptions {
		<T extends AST.Token>(
			node: ESTree.Node,
			options:
				| ((token: AST.Token) => token is T)
				| {
						filter: (token: AST.Token) => token is T;
						includeComments?: false | undefined;
						count?: number | undefined;
				  },
		): T[];
		<T extends AST.Token | ESTree.Comment>(
			node: ESTree.Node,
			options: {
				filter: (
					tokenOrComment: AST.Token | ESTree.Comment,
				) => tokenOrComment is T;
				includeComments: boolean;
				count?: number | undefined;
			},
		): T[];
		(
			node: ESTree.Node,
			options?:
				| {
						filter?: ((token: AST.Token) => boolean) | undefined;
						includeComments?: false | undefined;
						count?: number | undefined;
				  }
				| ((token: AST.Token) => boolean)
				| number,
		): AST.Token[];
		(
			node: ESTree.Node,
			options: {
				filter?:
					| ((token: AST.Token | ESTree.Comment) => boolean)
					| undefined;
				includeComments: boolean;
				count?: number | undefined;
			},
		): Array<AST.Token | ESTree.Comment>;
	}

	interface UnaryCursorWithSkipOptions {
		<T extends AST.Token>(
			node: ESTree.Node | AST.Token | ESTree.Comment,
			options:
				| ((token: AST.Token) => token is T)
				| {
						filter: (token: AST.Token) => token is T;
						includeComments?: false | undefined;
						skip?: number | undefined;
				  },
		): T | null;
		<T extends AST.Token | ESTree.Comment>(
			node: ESTree.Node | AST.Token | ESTree.Comment,
			options: {
				filter: (
					tokenOrComment: AST.Token | ESTree.Comment,
				) => tokenOrComment is T;
				includeComments: boolean;
				skip?: number | undefined;
			},
		): T | null;
		(
			node: ESTree.Node | AST.Token | ESTree.Comment,
			options?:
				| {
						filter?: ((token: AST.Token) => boolean) | undefined;
						includeComments?: false | undefined;
						skip?: number | undefined;
				  }
				| ((token: AST.Token) => boolean)
				| number,
		): AST.Token | null;
		(
			node: ESTree.Node | AST.Token | ESTree.Comment,
			options: {
				filter?:
					| ((token: AST.Token | ESTree.Comment) => boolean)
					| undefined;
				includeComments: boolean;
				skip?: number | undefined;
			},
		): AST.Token | ESTree.Comment | null;
	}

	interface UnaryCursorWithCountOptions {
		<T extends AST.Token>(
			node: ESTree.Node | AST.Token | ESTree.Comment,
			options:
				| ((token: AST.Token) => token is T)
				| {
						filter: (token: AST.Token) => token is T;
						includeComments?: false | undefined;
						count?: number | undefined;
				  },
		): T[];
		<T extends AST.Token | ESTree.Comment>(
			node: ESTree.Node | AST.Token | ESTree.Comment,
			options: {
				filter: (
					tokenOrComment: AST.Token | ESTree.Comment,
				) => tokenOrComment is T;
				includeComments: boolean;
				count?: number | undefined;
			},
		): T[];
		(
			node: ESTree.Node | AST.Token | ESTree.Comment,
			options?:
				| {
						filter?: ((token: AST.Token) => boolean) | undefined;
						includeComments?: false | undefined;
						count?: number | undefined;
				  }
				| ((token: AST.Token) => boolean)
				| number,
		): AST.Token[];
		(
			node: ESTree.Node | AST.Token | ESTree.Comment,
			options: {
				filter?:
					| ((token: AST.Token | ESTree.Comment) => boolean)
					| undefined;
				includeComments: boolean;
				count?: number | undefined;
			},
		): Array<AST.Token | ESTree.Comment>;
	}

	interface BinaryCursorWithSkipOptions {
		<T extends AST.Token>(
			left: ESTree.Node | AST.Token | ESTree.Comment,
			right: ESTree.Node | AST.Token | ESTree.Comment,
			options:
				| ((token: AST.Token) => token is T)
				| {
						filter: (token: AST.Token) => token is T;
						includeComments?: false | undefined;
						skip?: number | undefined;
				  },
		): T | null;
		<T extends AST.Token | ESTree.Comment>(
			left: ESTree.Node | AST.Token | ESTree.Comment,
			right: ESTree.Node | AST.Token | ESTree.Comment,
			options: {
				filter: (
					tokenOrComment: AST.Token | ESTree.Comment,
				) => tokenOrComment is T;
				includeComments: boolean;
				skip?: number | undefined;
			},
		): T | null;
		(
			left: ESTree.Node | AST.Token | ESTree.Comment,
			right: ESTree.Node | AST.Token | ESTree.Comment,
			options?:
				| {
						filter?: ((token: AST.Token) => boolean) | undefined;
						includeComments?: false | undefined;
						skip?: number | undefined;
				  }
				| ((token: AST.Token) => boolean)
				| number,
		): AST.Token | null;
		(
			left: ESTree.Node | AST.Token | ESTree.Comment,
			right: ESTree.Node | AST.Token | ESTree.Comment,
			options: {
				filter?:
					| ((token: AST.Token | ESTree.Comment) => boolean)
					| undefined;
				includeComments: boolean;
				skip?: number | undefined;
			},
		): AST.Token | ESTree.Comment | null;
	}

	interface BinaryCursorWithCountOptions {
		<T extends AST.Token>(
			left: ESTree.Node | AST.Token | ESTree.Comment,
			right: ESTree.Node | AST.Token | ESTree.Comment,
			options:
				| ((token: AST.Token) => token is T)
				| {
						filter: (token: AST.Token) => token is T;
						includeComments?: false | undefined;
						count?: number | undefined;
				  },
		): T[];
		<T extends AST.Token | ESTree.Comment>(
			left: ESTree.Node | AST.Token | ESTree.Comment,
			right: ESTree.Node | AST.Token | ESTree.Comment,
			options: {
				filter: (
					tokenOrComment: AST.Token | ESTree.Comment,
				) => tokenOrComment is T;
				includeComments: boolean;
				count?: number | undefined;
			},
		): T[];
		(
			left: ESTree.Node | AST.Token | ESTree.Comment,
			right: ESTree.Node | AST.Token | ESTree.Comment,
			options?:
				| {
						filter?: ((token: AST.Token) => boolean) | undefined;
						includeComments?: false | undefined;
						count?: number | undefined;
				  }
				| ((token: AST.Token) => boolean)
				| number,
		): AST.Token[];
		(
			left: ESTree.Node | AST.Token | ESTree.Comment,
			right: ESTree.Node | AST.Token | ESTree.Comment,
			options: {
				filter?:
					| ((token: AST.Token | ESTree.Comment) => boolean)
					| undefined;
				includeComments: boolean;
				count?: number | undefined;
			},
		): Array<AST.Token | ESTree.Comment>;
	}
}

// #endregion

export type JSSyntaxElement = {
	type: string;
	loc?: ESTree.SourceLocation | null | undefined;
};

export namespace Rule {
	interface RuleModule
		extends RuleDefinition<{
			LangOptions: Linter.LanguageOptions;
			Code: SourceCode;
			RuleOptions: any[];
			Visitor: NodeListener;
			Node: JSSyntaxElement;
			MessageIds: string;
			ExtRuleDocs: {};
		}> {
		create(context: RuleContext): NodeListener;
	}

	type NodeTypes = ESTree.Node["type"];
	interface NodeListener extends RuleVisitor {
		ArrayExpression?:
			| ((node: ESTree.ArrayExpression & NodeParentExtension) => void)
			| undefined;
		"ArrayExpression:exit"?:
			| ((node: ESTree.ArrayExpression & NodeParentExtension) => void)
			| undefined;
		ArrayPattern?:
			| ((node: ESTree.ArrayPattern & NodeParentExtension) => void)
			| undefined;
		"ArrayPattern:exit"?:
			| ((node: ESTree.ArrayPattern & NodeParentExtension) => void)
			| undefined;
		ArrowFunctionExpression?:
			| ((
					node: ESTree.ArrowFunctionExpression & NodeParentExtension,
			  ) => void)
			| undefined;
		"ArrowFunctionExpression:exit"?:
			| ((
					node: ESTree.ArrowFunctionExpression & NodeParentExtension,
			  ) => void)
			| undefined;
		AssignmentExpression?:
			| ((
					node: ESTree.AssignmentExpression & NodeParentExtension,
			  ) => void)
			| undefined;
		"AssignmentExpression:exit"?:
			| ((
					node: ESTree.AssignmentExpression & NodeParentExtension,
			  ) => void)
			| undefined;
		AssignmentPattern?:
			| ((node: ESTree.AssignmentPattern & NodeParentExtension) => void)
			| undefined;
		"AssignmentPattern:exit"?:
			| ((node: ESTree.AssignmentPattern & NodeParentExtension) => void)
			| undefined;
		AwaitExpression?:
			| ((node: ESTree.AwaitExpression & NodeParentExtension) => void)
			| undefined;
		"AwaitExpression:exit"?:
			| ((node: ESTree.AwaitExpression & NodeParentExtension) => void)
			| undefined;
		BinaryExpression?:
			| ((node: ESTree.BinaryExpression & NodeParentExtension) => void)
			| undefined;
		"BinaryExpression:exit"?:
			| ((node: ESTree.BinaryExpression & NodeParentExtension) => void)
			| undefined;
		BlockStatement?:
			| ((node: ESTree.BlockStatement & NodeParentExtension) => void)
			| undefined;
		"BlockStatement:exit"?:
			| ((node: ESTree.BlockStatement & NodeParentExtension) => void)
			| undefined;
		BreakStatement?:
			| ((node: ESTree.BreakStatement & NodeParentExtension) => void)
			| undefined;
		"BreakStatement:exit"?:
			| ((node: ESTree.BreakStatement & NodeParentExtension) => void)
			| undefined;
		CallExpression?:
			| ((node: ESTree.CallExpression & NodeParentExtension) => void)
			| undefined;
		"CallExpression:exit"?:
			| ((node: ESTree.CallExpression & NodeParentExtension) => void)
			| undefined;
		CatchClause?:
			| ((node: ESTree.CatchClause & NodeParentExtension) => void)
			| undefined;
		"CatchClause:exit"?:
			| ((node: ESTree.CatchClause & NodeParentExtension) => void)
			| undefined;
		ChainExpression?:
			| ((node: ESTree.ChainExpression & NodeParentExtension) => void)
			| undefined;
		"ChainExpression:exit"?:
			| ((node: ESTree.ChainExpression & NodeParentExtension) => void)
			| undefined;
		ClassBody?:
			| ((node: ESTree.ClassBody & NodeParentExtension) => void)
			| undefined;
		"ClassBody:exit"?:
			| ((node: ESTree.ClassBody & NodeParentExtension) => void)
			| undefined;
		ClassDeclaration?:
			| ((node: ESTree.ClassDeclaration & NodeParentExtension) => void)
			| undefined;
		"ClassDeclaration:exit"?:
			| ((node: ESTree.ClassDeclaration & NodeParentExtension) => void)
			| undefined;
		ClassExpression?:
			| ((node: ESTree.ClassExpression & NodeParentExtension) => void)
			| undefined;
		"ClassExpression:exit"?:
			| ((node: ESTree.ClassExpression & NodeParentExtension) => void)
			| undefined;
		ConditionalExpression?:
			| ((
					node: ESTree.ConditionalExpression & NodeParentExtension,
			  ) => void)
			| undefined;
		"ConditionalExpression:exit"?:
			| ((
					node: ESTree.ConditionalExpression & NodeParentExtension,
			  ) => void)
			| undefined;
		ContinueStatement?:
			| ((node: ESTree.ContinueStatement & NodeParentExtension) => void)
			| undefined;
		"ContinueStatement:exit"?:
			| ((node: ESTree.ContinueStatement & NodeParentExtension) => void)
			| undefined;
		DebuggerStatement?:
			| ((node: ESTree.DebuggerStatement & NodeParentExtension) => void)
			| undefined;
		"DebuggerStatement:exit"?:
			| ((node: ESTree.DebuggerStatement & NodeParentExtension) => void)
			| undefined;
		DoWhileStatement?:
			| ((node: ESTree.DoWhileStatement & NodeParentExtension) => void)
			| undefined;
		"DoWhileStatement:exit"?:
			| ((node: ESTree.DoWhileStatement & NodeParentExtension) => void)
			| undefined;
		EmptyStatement?:
			| ((node: ESTree.EmptyStatement & NodeParentExtension) => void)
			| undefined;
		"EmptyStatement:exit"?:
			| ((node: ESTree.EmptyStatement & NodeParentExtension) => void)
			| undefined;
		ExportAllDeclaration?:
			| ((
					node: ESTree.ExportAllDeclaration & NodeParentExtension,
			  ) => void)
			| undefined;
		"ExportAllDeclaration:exit"?:
			| ((
					node: ESTree.ExportAllDeclaration & NodeParentExtension,
			  ) => void)
			| undefined;
		ExportDefaultDeclaration?:
			| ((
					node: ESTree.ExportDefaultDeclaration & NodeParentExtension,
			  ) => void)
			| undefined;
		"ExportDefaultDeclaration:exit"?:
			| ((
					node: ESTree.ExportDefaultDeclaration & NodeParentExtension,
			  ) => void)
			| undefined;
		ExportNamedDeclaration?:
			| ((
					node: ESTree.ExportNamedDeclaration & NodeParentExtension,
			  ) => void)
			| undefined;
		"ExportNamedDeclaration:exit"?:
			| ((
					node: ESTree.ExportNamedDeclaration & NodeParentExtension,
			  ) => void)
			| undefined;
		ExportSpecifier?:
			| ((node: ESTree.ExportSpecifier & NodeParentExtension) => void)
			| undefined;
		"ExportSpecifier:exit"?:
			| ((node: ESTree.ExportSpecifier & NodeParentExtension) => void)
			| undefined;
		ExpressionStatement?:
			| ((node: ESTree.ExpressionStatement & NodeParentExtension) => void)
			| undefined;
		"ExpressionStatement:exit"?:
			| ((node: ESTree.ExpressionStatement & NodeParentExtension) => void)
			| undefined;
		ForInStatement?:
			| ((node: ESTree.ForInStatement & NodeParentExtension) => void)
			| undefined;
		"ForInStatement:exit"?:
			| ((node: ESTree.ForInStatement & NodeParentExtension) => void)
			| undefined;
		ForOfStatement?:
			| ((node: ESTree.ForOfStatement & NodeParentExtension) => void)
			| undefined;
		"ForOfStatement:exit"?:
			| ((node: ESTree.ForOfStatement & NodeParentExtension) => void)
			| undefined;
		ForStatement?:
			| ((node: ESTree.ForStatement & NodeParentExtension) => void)
			| undefined;
		"ForStatement:exit"?:
			| ((node: ESTree.ForStatement & NodeParentExtension) => void)
			| undefined;
		FunctionDeclaration?:
			| ((node: ESTree.FunctionDeclaration & NodeParentExtension) => void)
			| undefined;
		"FunctionDeclaration:exit"?:
			| ((node: ESTree.FunctionDeclaration & NodeParentExtension) => void)
			| undefined;
		FunctionExpression?:
			| ((node: ESTree.FunctionExpression & NodeParentExtension) => void)
			| undefined;
		"FunctionExpression:exit"?:
			| ((node: ESTree.FunctionExpression & NodeParentExtension) => void)
			| undefined;
		Identifier?:
			| ((node: ESTree.Identifier & NodeParentExtension) => void)
			| undefined;
		"Identifier:exit"?:
			| ((node: ESTree.Identifier & NodeParentExtension) => void)
			| undefined;
		IfStatement?:
			| ((node: ESTree.IfStatement & NodeParentExtension) => void)
			| undefined;
		"IfStatement:exit"?:
			| ((node: ESTree.IfStatement & NodeParentExtension) => void)
			| undefined;
		ImportDeclaration?:
			| ((node: ESTree.ImportDeclaration & NodeParentExtension) => void)
			| undefined;
		"ImportDeclaration:exit"?:
			| ((node: ESTree.ImportDeclaration & NodeParentExtension) => void)
			| undefined;
		ImportDefaultSpecifier?:
			| ((
					node: ESTree.ImportDefaultSpecifier & NodeParentExtension,
			  ) => void)
			| undefined;
		"ImportDefaultSpecifier:exit"?:
			| ((
					node: ESTree.ImportDefaultSpecifier & NodeParentExtension,
			  ) => void)
			| undefined;
		ImportExpression?:
			| ((node: ESTree.ImportExpression & NodeParentExtension) => void)
			| undefined;
		"ImportExpression:exit"?:
			| ((node: ESTree.ImportExpression & NodeParentExtension) => void)
			| undefined;
		ImportNamespaceSpecifier?:
			| ((
					node: ESTree.ImportNamespaceSpecifier & NodeParentExtension,
			  ) => void)
			| undefined;
		"ImportNamespaceSpecifier:exit"?:
			| ((
					node: ESTree.ImportNamespaceSpecifier & NodeParentExtension,
			  ) => void)
			| undefined;
		ImportSpecifier?:
			| ((node: ESTree.ImportSpecifier & NodeParentExtension) => void)
			| undefined;
		"ImportSpecifier:exit"?:
			| ((node: ESTree.ImportSpecifier & NodeParentExtension) => void)
			| undefined;
		LabeledStatement?:
			| ((node: ESTree.LabeledStatement & NodeParentExtension) => void)
			| undefined;
		"LabeledStatement:exit"?:
			| ((node: ESTree.LabeledStatement & NodeParentExtension) => void)
			| undefined;
		Literal?:
			| ((node: ESTree.Literal & NodeParentExtension) => void)
			| undefined;
		"Literal:exit"?:
			| ((node: ESTree.Literal & NodeParentExtension) => void)
			| undefined;
		LogicalExpression?:
			| ((node: ESTree.LogicalExpression & NodeParentExtension) => void)
			| undefined;
		"LogicalExpression:exit"?:
			| ((node: ESTree.LogicalExpression & NodeParentExtension) => void)
			| undefined;
		MemberExpression?:
			| ((node: ESTree.MemberExpression & NodeParentExtension) => void)
			| undefined;
		"MemberExpression:exit"?:
			| ((node: ESTree.MemberExpression & NodeParentExtension) => void)
			| undefined;
		MetaProperty?:
			| ((node: ESTree.MetaProperty & NodeParentExtension) => void)
			| undefined;
		"MetaProperty:exit"?:
			| ((node: ESTree.MetaProperty & NodeParentExtension) => void)
			| undefined;
		MethodDefinition?:
			| ((node: ESTree.MethodDefinition & NodeParentExtension) => void)
			| undefined;
		"MethodDefinition:exit"?:
			| ((node: ESTree.MethodDefinition & NodeParentExtension) => void)
			| undefined;
		NewExpression?:
			| ((node: ESTree.NewExpression & NodeParentExtension) => void)
			| undefined;
		"NewExpression:exit"?:
			| ((node: ESTree.NewExpression & NodeParentExtension) => void)
			| undefined;
		ObjectExpression?:
			| ((node: ESTree.ObjectExpression & NodeParentExtension) => void)
			| undefined;
		"ObjectExpression:exit"?:
			| ((node: ESTree.ObjectExpression & NodeParentExtension) => void)
			| undefined;
		ObjectPattern?:
			| ((node: ESTree.ObjectPattern & NodeParentExtension) => void)
			| undefined;
		"ObjectPattern:exit"?:
			| ((node: ESTree.ObjectPattern & NodeParentExtension) => void)
			| undefined;
		PrivateIdentifier?:
			| ((node: ESTree.PrivateIdentifier & NodeParentExtension) => void)
			| undefined;
		"PrivateIdentifier:exit"?:
			| ((node: ESTree.PrivateIdentifier & NodeParentExtension) => void)
			| undefined;
		Program?: ((node: ESTree.Program) => void) | undefined;
		"Program:exit"?: ((node: ESTree.Program) => void) | undefined;
		Property?:
			| ((node: ESTree.Property & NodeParentExtension) => void)
			| undefined;
		"Property:exit"?:
			| ((node: ESTree.Property & NodeParentExtension) => void)
			| undefined;
		PropertyDefinition?:
			| ((node: ESTree.PropertyDefinition & NodeParentExtension) => void)
			| undefined;
		"PropertyDefinition:exit"?:
			| ((node: ESTree.PropertyDefinition & NodeParentExtension) => void)
			| undefined;
		RestElement?:
			| ((node: ESTree.RestElement & NodeParentExtension) => void)
			| undefined;
		"RestElement:exit"?:
			| ((node: ESTree.RestElement & NodeParentExtension) => void)
			| undefined;
		ReturnStatement?:
			| ((node: ESTree.ReturnStatement & NodeParentExtension) => void)
			| undefined;
		"ReturnStatement:exit"?:
			| ((node: ESTree.ReturnStatement & NodeParentExtension) => void)
			| undefined;
		SequenceExpression?:
			| ((node: ESTree.SequenceExpression & NodeParentExtension) => void)
			| undefined;
		"SequenceExpression:exit"?:
			| ((node: ESTree.SequenceExpression & NodeParentExtension) => void)
			| undefined;
		SpreadElement?:
			| ((node: ESTree.SpreadElement & NodeParentExtension) => void)
			| undefined;
		"SpreadElement:exit"?:
			| ((node: ESTree.SpreadElement & NodeParentExtension) => void)
			| undefined;
		StaticBlock?:
			| ((node: ESTree.StaticBlock & NodeParentExtension) => void)
			| undefined;
		"StaticBlock:exit"?:
			| ((node: ESTree.StaticBlock & NodeParentExtension) => void)
			| undefined;
		Super?:
			| ((node: ESTree.Super & NodeParentExtension) => void)
			| undefined;
		"Super:exit"?:
			| ((node: ESTree.Super & NodeParentExtension) => void)
			| undefined;
		SwitchCase?:
			| ((node: ESTree.SwitchCase & NodeParentExtension) => void)
			| undefined;
		"SwitchCase:exit"?:
			| ((node: ESTree.SwitchCase & NodeParentExtension) => void)
			| undefined;
		SwitchStatement?:
			| ((node: ESTree.SwitchStatement & NodeParentExtension) => void)
			| undefined;
		"SwitchStatement:exit"?:
			| ((node: ESTree.SwitchStatement & NodeParentExtension) => void)
			| undefined;
		TaggedTemplateExpression?:
			| ((
					node: ESTree.TaggedTemplateExpression & NodeParentExtension,
			  ) => void)
			| undefined;
		"TaggedTemplateExpression:exit"?:
			| ((
					node: ESTree.TaggedTemplateExpression & NodeParentExtension,
			  ) => void)
			| undefined;
		TemplateElement?:
			| ((node: ESTree.TemplateElement & NodeParentExtension) => void)
			| undefined;
		"TemplateElement:exit"?:
			| ((node: ESTree.TemplateElement & NodeParentExtension) => void)
			| undefined;
		TemplateLiteral?:
			| ((node: ESTree.TemplateLiteral & NodeParentExtension) => void)
			| undefined;
		"TemplateLiteral:exit"?:
			| ((node: ESTree.TemplateLiteral & NodeParentExtension) => void)
			| undefined;
		ThisExpression?:
			| ((node: ESTree.ThisExpression & NodeParentExtension) => void)
			| undefined;
		"ThisExpression:exit"?:
			| ((node: ESTree.ThisExpression & NodeParentExtension) => void)
			| undefined;
		ThrowStatement?:
			| ((node: ESTree.ThrowStatement & NodeParentExtension) => void)
			| undefined;
		"ThrowStatement:exit"?:
			| ((node: ESTree.ThrowStatement & NodeParentExtension) => void)
			| undefined;
		TryStatement?:
			| ((node: ESTree.TryStatement & NodeParentExtension) => void)
			| undefined;
		"TryStatement:exit"?:
			| ((node: ESTree.TryStatement & NodeParentExtension) => void)
			| undefined;
		UnaryExpression?:
			| ((node: ESTree.UnaryExpression & NodeParentExtension) => void)
			| undefined;
		"UnaryExpression:exit"?:
			| ((node: ESTree.UnaryExpression & NodeParentExtension) => void)
			| undefined;
		UpdateExpression?:
			| ((node: ESTree.UpdateExpression & NodeParentExtension) => void)
			| undefined;
		"UpdateExpression:exit"?:
			| ((node: ESTree.UpdateExpression & NodeParentExtension) => void)
			| undefined;
		VariableDeclaration?:
			| ((node: ESTree.VariableDeclaration & NodeParentExtension) => void)
			| undefined;
		"VariableDeclaration:exit"?:
			| ((node: ESTree.VariableDeclaration & NodeParentExtension) => void)
			| undefined;
		VariableDeclarator?:
			| ((node: ESTree.VariableDeclarator & NodeParentExtension) => void)
			| undefined;
		"VariableDeclarator:exit"?:
			| ((node: ESTree.VariableDeclarator & NodeParentExtension) => void)
			| undefined;
		WhileStatement?:
			| ((node: ESTree.WhileStatement & NodeParentExtension) => void)
			| undefined;
		"WhileStatement:exit"?:
			| ((node: ESTree.WhileStatement & NodeParentExtension) => void)
			| undefined;
		WithStatement?:
			| ((node: ESTree.WithStatement & NodeParentExtension) => void)
			| undefined;
		"WithStatement:exit"?:
			| ((node: ESTree.WithStatement & NodeParentExtension) => void)
			| undefined;
		YieldExpression?:
			| ((node: ESTree.YieldExpression & NodeParentExtension) => void)
			| undefined;
		"YieldExpression:exit"?:
			| ((node: ESTree.YieldExpression & NodeParentExtension) => void)
			| undefined;
	}

	interface NodeParentExtension {
		parent: Node;
	}
	type Node = ESTree.Node & NodeParentExtension;

	interface RuleListener extends NodeListener {
		onCodePathStart?(codePath: CodePath, node: Node): void;

		onCodePathEnd?(codePath: CodePath, node: Node): void;

		onCodePathSegmentStart?(segment: CodePathSegment, node: Node): void;

		onCodePathSegmentEnd?(segment: CodePathSegment, node: Node): void;

		onCodePathSegmentLoop?(
			fromSegment: CodePathSegment,
			toSegment: CodePathSegment,
			node: Node,
		): void;

		[key: string]:
			| ((codePath: CodePath, node: Node) => void)
			| ((segment: CodePathSegment, node: Node) => void)
			| ((
					fromSegment: CodePathSegment,
					toSegment: CodePathSegment,
					node: Node,
			  ) => void)
			| ((node: Node) => void)
			| NodeListener[keyof NodeListener]
			| undefined;
	}

	type CodePathOrigin =
		| "program"
		| "function"
		| "class-field-initializer"
		| "class-static-block";

	interface CodePath {
		id: string;
		origin: CodePathOrigin;
		initialSegment: CodePathSegment;
		finalSegments: CodePathSegment[];
		returnedSegments: CodePathSegment[];
		thrownSegments: CodePathSegment[];
		upper: CodePath | null;
		childCodePaths: CodePath[];
	}

	interface CodePathSegment {
		id: string;
		nextSegments: CodePathSegment[];
		prevSegments: CodePathSegment[];
		reachable: boolean;
	}

	interface RuleMetaData {
		/** Properties often used for documentation generation and tooling. */
		docs?:
			| {
					/** Provides a short description of the rule. Commonly used when generating lists of rules. */
					description?: string | undefined;
					/** Historically used by some plugins that divide rules into categories in their documentation. */
					category?: string | undefined;
					/** Historically used by some plugins to indicate a rule belongs in their `recommended` configuration. */
					recommended?: boolean | undefined;
					/** Specifies the URL at which the full documentation can be accessed. Code editors often use this to provide a helpful link on highlighted rule violations. */
					url?: string | undefined;
			  }
			| undefined;
		/** Violation and suggestion messages. */
		messages?: { [messageId: string]: string } | undefined;
		/**
		 * Specifies if the `--fix` option on the command line automatically fixes problems reported by the rule.
		 * Mandatory for fixable rules.
		 */
		fixable?: "code" | "whitespace" | undefined;
		/**
		 * Specifies the [options](https://eslint.org/docs/latest/extend/custom-rules#options-schemas)
		 * so ESLint can prevent invalid [rule configurations](https://eslint.org/docs/latest/use/configure/rules#configuring-rules).
		 * Mandatory for rules with options.
		 */
		schema?: JSONSchema4 | JSONSchema4[] | false | undefined;

		/** Any default options to be recursively merged on top of any user-provided options. */
		defaultOptions?: unknown[];

		/** Indicates whether the rule has been deprecated or provides additional metadata about the deprecation. Omit if not deprecated. */
		deprecated?: boolean | DeprecatedInfo | undefined;
		/**
		 * @deprecated Use deprecated.replacedBy instead.
		 * The name of the rule(s) this rule was replaced by, if it was deprecated.
		 */
		replacedBy?: readonly string[];

		/**
		 * Indicates the type of rule:
		 * - `"problem"` means the rule is identifying code that either will cause an error or may cause a confusing behavior. Developers should consider this a high priority to resolve.
		 * - `"suggestion"` means the rule is identifying something that could be done in a better way but no errors will occur if the code isn't changed.
		 * - `"layout"` means the rule cares primarily about whitespace, semicolons, commas, and parentheses,
		 *   all the parts of the program that determine how the code looks rather than how it executes.
		 *   These rules work on parts of the code that aren't specified in the AST.
		 */
		type?: "problem" | "suggestion" | "layout" | undefined;
		/**
		 * Specifies whether the rule can return suggestions (defaults to `false` if omitted).
		 * Mandatory for rules that provide suggestions.
		 */
		hasSuggestions?: boolean | undefined;
	}

	interface RuleContext
		extends CoreRuleContext<{
			LangOptions: Linter.LanguageOptions;
			Code: SourceCode;
			RuleOptions: any[];
			Node: JSSyntaxElement;
			MessageIds: string;
		}> {
		/*
		 * Need to extend the `RuleContext` interface to include the
		 * deprecated methods that have not yet been removed.
		 * TODO: Remove in v10.0.0.
		 */

		/** @deprecated Use `sourceCode.getAncestors()` instead */
		getAncestors(): ESTree.Node[];

		/** @deprecated Use `sourceCode.getDeclaredVariables()` instead */
		getDeclaredVariables(node: ESTree.Node): Scope.Variable[];

		/** @deprecated Use `sourceCode.getScope()` instead */
		getScope(): Scope.Scope;

		/** @deprecated Use `sourceCode.markVariableAsUsed()` instead */
		markVariableAsUsed(name: string): boolean;
	}

	type ReportFixer = (
		fixer: RuleFixer,
	) => null | Fix | IterableIterator<Fix> | Fix[];

	interface ReportDescriptorOptionsBase {
		data?: { [key: string]: string };

		fix?: null | ReportFixer;
	}

	interface SuggestionReportOptions {
		data?: { [key: string]: string };

		fix: ReportFixer;
	}

	type SuggestionDescriptorMessage = { desc: string } | { messageId: string };
	type SuggestionReportDescriptor = SuggestionDescriptorMessage &
		SuggestionReportOptions;

	interface ReportDescriptorOptions extends ReportDescriptorOptionsBase {
		suggest?: SuggestionReportDescriptor[] | null | undefined;
	}

	type ReportDescriptor = ReportDescriptorMessage &
		ReportDescriptorLocation &
		ReportDescriptorOptions;
	type ReportDescriptorMessage = { message: string } | { messageId: string };
	type ReportDescriptorLocation =
		| { node: ESTree.Node }
		| { loc: AST.SourceLocation | { line: number; column: number } };

	interface RuleFixer {
		insertTextAfter(
			nodeOrToken: ESTree.Node | AST.Token,
			text: string,
		): Fix;

		insertTextAfterRange(range: AST.Range, text: string): Fix;

		insertTextBefore(
			nodeOrToken: ESTree.Node | AST.Token,
			text: string,
		): Fix;

		insertTextBeforeRange(range: AST.Range, text: string): Fix;

		remove(nodeOrToken: ESTree.Node | AST.Token): Fix;

		removeRange(range: AST.Range): Fix;

		replaceText(nodeOrToken: ESTree.Node | AST.Token, text: string): Fix;

		replaceTextRange(range: AST.Range, text: string): Fix;
	}

	interface Fix {
		range: AST.Range;
		text: string;
	}
}

export type JSRuleDefinitionTypeOptions = {
	RuleOptions: unknown[];
	MessageIds: string;
	ExtRuleDocs: Record<string, unknown>;
};

export type JSRuleDefinition<
	Options extends Partial<JSRuleDefinitionTypeOptions> = {},
> = RuleDefinition<
	// Language specific type options (non-configurable)
	{
		LangOptions: Linter.LanguageOptions;
		Code: SourceCode;
		Visitor: Rule.NodeListener;
		Node: JSSyntaxElement;
	} & Required<
		// Rule specific type options (custom)
		Options &
			// Rule specific type options (defaults)
			Omit<JSRuleDefinitionTypeOptions, keyof Options>
	>
>;

// #region Linter

export class Linter {
	static readonly version: string;

	version: string;

	constructor(options?: {
		cwd?: string | undefined;
		configType?: "flat" | "eslintrc";
	});

	verify(
		code: SourceCode | string,
		config: Linter.LegacyConfig | Linter.Config | Linter.Config[],
		filename?: string,
	): Linter.LintMessage[];
	verify(
		code: SourceCode | string,
		config: Linter.LegacyConfig | Linter.Config | Linter.Config[],
		options: Linter.LintOptions,
	): Linter.LintMessage[];

	verifyAndFix(
		code: string,
		config: Linter.LegacyConfig | Linter.Config | Linter.Config[],
		filename?: string,
	): Linter.FixReport;
	verifyAndFix(
		code: string,
		config: Linter.LegacyConfig | Linter.Config | Linter.Config[],
		options: Linter.FixOptions,
	): Linter.FixReport;

	getSourceCode(): SourceCode;

	defineRule(name: string, rule: Rule.RuleModule): void;

	defineRules(rules: { [name: string]: Rule.RuleModule }): void;

	getRules(): Map<string, Rule.RuleModule>;

	defineParser(name: string, parser: Linter.Parser): void;

	getTimes(): Linter.Stats["times"];

	getFixPassCount(): Linter.Stats["fixPasses"];
}

export namespace Linter {
	/**
	 * The numeric severity level for a rule.
	 *
	 * - `0` means off.
	 * - `1` means warn.
	 * - `2` means error.
	 *
	 * @see [Rule Severities](https://eslint.org/docs/latest/use/configure/rules#rule-severities)
	 */
	type Severity = 0 | 1 | 2;

	/**
	 * The human readable severity level for a rule.
	 *
	 * @see [Rule Severities](https://eslint.org/docs/latest/use/configure/rules#rule-severities)
	 */
	type StringSeverity = "off" | "warn" | "error";

	/**
	 * The numeric or human readable severity level for a rule.
	 *
	 * @see [Rule Severities](https://eslint.org/docs/latest/use/configure/rules#rule-severities)
	 */
	type RuleSeverity = Severity | StringSeverity;

	/**
	 * An array containing the rule severity level, followed by the rule options.
	 *
	 * @see [Rules](https://eslint.org/docs/latest/use/configure/rules)
	 */
	type RuleSeverityAndOptions<Options extends any[] = any[]> = [
		RuleSeverity,
		...Partial<Options>,
	];

	/**
	 * The severity level for the rule or an array containing the rule severity level, followed by the rule options.
	 *
	 * @see [Rules](https://eslint.org/docs/latest/use/configure/rules)
	 */
	type RuleEntry<Options extends any[] = any[]> =
		| RuleSeverity
		| RuleSeverityAndOptions<Options>;

	/**
	 * The rules config object is a key/value map of rule names and their severity and options.
	 */
	interface RulesRecord {
		[rule: string]: RuleEntry;
	}

	/**
	 * A configuration object that may have a `rules` block.
	 */
	interface HasRules<Rules extends RulesRecord = RulesRecord> {
		rules?: Partial<Rules> | undefined;
	}

	/**
	 * The ECMAScript version of the code being linted.
	 */
	type EcmaVersion =
		| 3
		| 5
		| 6
		| 7
		| 8
		| 9
		| 10
		| 11
		| 12
		| 13
		| 14
		| 15
		| 16
		| 17
		| 2015
		| 2016
		| 2017
		| 2018
		| 2019
		| 2020
		| 2021
		| 2022
		| 2023
		| 2024
		| 2025
		| 2026
		| "latest";

	/**
	 * The type of JavaScript source code.
	 */
	type SourceType = "script" | "module" | "commonjs";

	/**
	 * ESLint legacy configuration.
	 *
	 * @see [ESLint Legacy Configuration](https://eslint.org/docs/latest/use/configure/)
	 */
	interface BaseConfig<
		Rules extends RulesRecord = RulesRecord,
		OverrideRules extends RulesRecord = Rules,
	> extends HasRules<Rules> {
		$schema?: string | undefined;

		/**
		 * An environment provides predefined global variables.
		 *
		 * @see [Environments](https://eslint.org/docs/latest/use/configure/language-options-deprecated#specifying-environments)
		 */
		env?: { [name: string]: boolean } | undefined;

		/**
		 * Extending configuration files.
		 *
		 * @see [Extends](https://eslint.org/docs/latest/use/configure/configuration-files-deprecated#extending-configuration-files)
		 */
		extends?: string | string[] | undefined;

		/**
		 * Specifying globals.
		 *
		 * @see [Globals](https://eslint.org/docs/latest/use/configure/language-options-deprecated#specifying-globals)
		 */
		globals?: Linter.Globals | undefined;

		/**
		 * Disable processing of inline comments.
		 *
		 * @see [Disabling Inline Comments](https://eslint.org/docs/latest/use/configure/rules-deprecated#disabling-inline-comments)
		 */
		noInlineConfig?: boolean | undefined;

		/**
		 * Overrides can be used to use a differing configuration for matching sub-directories and files.
		 *
		 * @see [How do overrides work](https://eslint.org/docs/latest/use/configure/configuration-files-deprecated#how-do-overrides-work)
		 */
		overrides?: Array<ConfigOverride<OverrideRules>> | undefined;

		/**
		 * Parser.
		 *
		 * @see [Working with Custom Parsers](https://eslint.org/docs/latest/extend/custom-parsers)
		 * @see [Specifying Parser](https://eslint.org/docs/latest/use/configure/parser-deprecated)
		 */
		parser?: string | undefined;

		/**
		 * Parser options.
		 *
		 * @see [Working with Custom Parsers](https://eslint.org/docs/latest/extend/custom-parsers)
		 * @see [Specifying Parser Options](https://eslint.org/docs/latest/use/configure/language-options-deprecated#specifying-parser-options)
		 */
		parserOptions?: ParserOptions | undefined;

		/**
		 * Which third-party plugins define additional rules, environments, configs, etc. for ESLint to use.
		 *
		 * @see [Configuring Plugins](https://eslint.org/docs/latest/use/configure/plugins-deprecated#configure-plugins)
		 */
		plugins?: string[] | undefined;

		/**
		 * Specifying processor.
		 *
		 * @see [processor](https://eslint.org/docs/latest/use/configure/plugins-deprecated#specify-a-processor)
		 */
		processor?: string | undefined;

		/**
		 * Report unused eslint-disable comments as warning.
		 *
		 * @see [Report unused eslint-disable comments](https://eslint.org/docs/latest/use/configure/rules-deprecated#report-unused-eslint-disable-comments)
		 */
		reportUnusedDisableDirectives?: boolean | undefined;

		/**
		 * Settings.
		 *
		 * @see [Settings](https://eslint.org/docs/latest/use/configure/configuration-files-deprecated#adding-shared-settings)
		 */
		settings?: { [name: string]: any } | undefined;
	}

	/**
	 * The overwrites that apply more differing configuration to specific files or directories.
	 */
	interface ConfigOverride<Rules extends RulesRecord = RulesRecord>
		extends BaseConfig<Rules> {
		/**
		 * The glob patterns for excluded files.
		 */
		excludedFiles?: string | string[] | undefined;

		/**
		 * The glob patterns for target files.
		 */
		files: string | string[];
	}

	/**
	 * ESLint legacy configuration.
	 *
	 * @see [ESLint Legacy Configuration](https://eslint.org/docs/latest/use/configure/)
	 */
	// https://github.com/eslint/eslint/blob/v8.57.0/conf/config-schema.js
	interface LegacyConfig<
		Rules extends RulesRecord = RulesRecord,
		OverrideRules extends RulesRecord = Rules,
	> extends BaseConfig<Rules, OverrideRules> {
		/**
		 * Tell ESLint to ignore specific files and directories.
		 *
		 * @see [Ignore Patterns](https://eslint.org/docs/latest/use/configure/ignore-deprecated#ignorepatterns-in-config-files)
		 */
		ignorePatterns?: string | string[] | undefined;

		/**
		 * @see [Using Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files-deprecated#using-configuration-files)
		 */
		root?: boolean | undefined;
	}

	/**
	 * Parser options.
	 *
	 * @see [Specifying Parser Options](https://eslint.org/docs/latest/use/configure/language-options#specifying-parser-options)
	 */
	interface ParserOptions {
		/**
		 * Allow the use of reserved words as identifiers (if `ecmaVersion` is 3).
		 *
		 * @default false
		 */
		allowReserved?: boolean | undefined;

		/**
		 * Accepts any valid ECMAScript version number or `'latest'`:
		 *
		 * - A version: es3, es5, es6, es7, es8, es9, es10, es11, es12, es13, es14, ..., or
		 * - A year: es2015, es2016, es2017, es2018, es2019, es2020, es2021, es2022, es2023, ..., or
		 * - `'latest'`
		 *
		 * When it's a version or a year, the value must be a number - so do not include the `es` prefix.
		 *
		 * Specifies the version of ECMAScript syntax you want to use. This is used by the parser to determine how to perform scope analysis, and it affects the default
		 *
		 * @default 5
		 */
		ecmaVersion?: EcmaVersion | undefined;

		/**
		 * The type of JavaScript source code. Possible values are "script" for
		 * traditional script files, "module" for ECMAScript modules (ESM), and
		 * "commonjs" for CommonJS files.
		 *
		 * @default 'script'
		 *
		 * @see https://eslint.org/docs/latest/use/configure/language-options-deprecated#specifying-parser-options
		 */
		sourceType?: SourceType | undefined;

		/**
		 * An object indicating which additional language features you'd like to use.
		 *
		 * @see https://eslint.org/docs/latest/use/configure/language-options-deprecated#specifying-parser-options
		 */
		ecmaFeatures?:
			| {
					globalReturn?: boolean | undefined;
					impliedStrict?: boolean | undefined;
					jsx?: boolean | undefined;
					experimentalObjectRestSpread?: boolean | undefined;
					[key: string]: any;
			  }
			| undefined;
		[key: string]: any;
	}

	interface LintOptions {
		filename?: string | undefined;
		preprocess?: ((code: string) => string[]) | undefined;
		postprocess?:
			| ((problemLists: LintMessage[][]) => LintMessage[])
			| undefined;
		filterCodeBlock?:
			| ((filename: string, text: string) => boolean)
			| undefined;
		disableFixes?: boolean | undefined;
		allowInlineConfig?: boolean | undefined;
		reportUnusedDisableDirectives?: boolean | undefined;
	}

	interface LintSuggestion {
		/** A short description. */
		desc: string;

		/** Fix result info. */
		fix: Rule.Fix;

		/** Id referencing a message for the description. */
		messageId?: string | undefined;
	}

	interface LintMessage {
		/** The 1-based column number. */
		column: number;

		/** The 1-based line number. */
		line: number;

		/** The 1-based column number of the end location. */
		endColumn?: number | undefined;

		/** The 1-based line number of the end location. */
		endLine?: number | undefined;

		/** The ID of the rule which makes this message. */
		ruleId: string | null;

		/** The reported message. */
		message: string;

		/** The ID of the message in the rule's meta. */
		messageId?: string | undefined;

		/**
		 * Type of node.
		 * @deprecated `nodeType` is deprecated and will be removed in the next major version.
		 */
		nodeType?: string | undefined;

		/** If `true` then this is a fatal error. */
		fatal?: true | undefined;

		/** The severity of this message. */
		severity: Exclude<Severity, 0>;

		/** Information for autofix. */
		fix?: Rule.Fix | undefined;

		/** Information for suggestions. */
		suggestions?: LintSuggestion[] | undefined;
	}

	interface LintSuppression {
		kind: string;
		justification: string;
	}

	interface SuppressedLintMessage extends LintMessage {
		/** The suppression info. */
		suppressions: LintSuppression[];
	}

	interface FixOptions extends LintOptions {
		fix?: boolean | undefined;
	}

	interface FixReport {
		fixed: boolean;
		output: string;
		messages: LintMessage[];
	}

	// Temporarily loosen type for just flat config files (see https://github.com/DefinitelyTyped/DefinitelyTyped/pull/68232)
	type NonESTreeParser = ESLint.ObjectMetaProperties &
		(
			| {
					parse(text: string, options?: any): unknown;
			  }
			| {
					parseForESLint(
						text: string,
						options?: any,
					): Omit<ESLintParseResult, "ast" | "scopeManager"> & {
						ast: unknown;
						scopeManager?: unknown;
					};
			  }
		);

	type ESTreeParser = ESLint.ObjectMetaProperties &
		(
			| { parse(text: string, options?: any): AST.Program }
			| { parseForESLint(text: string, options?: any): ESLintParseResult }
		);

	type Parser = NonESTreeParser | ESTreeParser;

	interface ESLintParseResult {
		/** The AST object. */
		ast: AST.Program;

		/** The services that the parser provides. */
		services?: SourceCode.ParserServices | undefined;

		/** The scope manager of the AST. */
		scopeManager?: Scope.ScopeManager | undefined;

		/** The visitor keys of the AST. */
		visitorKeys?: SourceCode.VisitorKeys | undefined;
	}

	interface ProcessorFile {
		text: string;
		filename: string;
	}

	// https://eslint.org/docs/latest/extend/plugins#processors-in-plugins
	interface Processor<
		T extends string | ProcessorFile = string | ProcessorFile,
	> extends ESLint.ObjectMetaProperties {
		/** If `true` then it means the processor supports autofix. */
		supportsAutofix?: boolean | undefined;

		/** The function to extract code blocks. */
		preprocess?(text: string, filename: string): T[];

		/** The function to merge messages. */
		postprocess?(
			messages: LintMessage[][],
			filename: string,
		): LintMessage[];
	}

	interface Config<Rules extends RulesRecord = RulesRecord> {
		/**
		 * An string to identify the configuration object. Used in error messages and
		 * inspection tools.
		 */
		name?: string;

		/**
		 * An array of glob patterns indicating the files that the configuration
		 * object should apply to. If not specified, the configuration object applies
		 * to all files
		 */
		files?: Array<string | string[]>;

		/**
		 * An array of glob patterns indicating the files that the configuration
		 * object should not apply to. If not specified, the configuration object
		 * applies to all files matched by files
		 */
		ignores?: string[];

		/**
		 * The name of the language used for linting. This is used to determine the
		 * parser and other language-specific settings.
		 * @since 9.7.0
		 */
		language?: string;

		/**
		 * An object containing settings related to how JavaScript is configured for
		 * linting.
		 */
		languageOptions?: LanguageOptions;

		/**
		 * An object containing settings related to the linting process
		 */
		linterOptions?: LinterOptions;

		/**
		 * Either an object containing preprocess() and postprocess() methods or a
		 * string indicating the name of a processor inside of a plugin
		 * (i.e., "pluginName/processorName").
		 */
		processor?: string | Processor;

		/**
		 * An object containing a name-value mapping of plugin names to plugin objects.
		 * When files is specified, these plugins are only available to the matching files.
		 */
		plugins?: Record<string, ESLint.Plugin>;

		/**
		 * An object containing the configured rules. When files or ignores are specified,
		 * these rule configurations are only available to the matching files.
		 */
		rules?: Partial<Rules>;

		/**
		 * An object containing name-value pairs of information that should be
		 * available to all rules.
		 */
		settings?: Record<string, unknown>;
	}

	/** @deprecated  Use `Config` instead of `FlatConfig` */
	type FlatConfig<Rules extends RulesRecord = RulesRecord> = Config<Rules>;

	type GlobalConf =
		| boolean
		| "off"
		| "readable"
		| "readonly"
		| "writable"
		| "writeable";

	interface Globals {
		[name: string]: GlobalConf;
	}

	interface LanguageOptions extends GenericLanguageOptions {
		/**
		 * The version of ECMAScript to support. May be any year (i.e., 2022) or
		 * version (i.e., 5). Set to "latest" for the most recent supported version.
		 * @default "latest"
		 */
		ecmaVersion?: EcmaVersion | undefined;

		/**
		 * The type of JavaScript source code. Possible values are "script" for
		 * traditional script files, "module" for ECMAScript modules (ESM), and
		 * "commonjs" for CommonJS files. (default: "module" for .js and .mjs
		 * files; "commonjs" for .cjs files)
		 */
		sourceType?: SourceType | undefined;

		/**
		 * An object specifying additional objects that should be added to the
		 * global scope during linting.
		 */
		globals?: Globals | undefined;

		/**
		 * An object containing a parse() or parseForESLint() method.
		 * If not configured, the default ESLint parser (Espree) will be used.
		 */
		parser?: Parser | undefined;

		/**
		 * An object specifying additional options that are passed directly to the
		 * parser() method on the parser. The available options are parser-dependent
		 */
		parserOptions?: Linter.ParserOptions | undefined;
	}

	interface LinterOptions {
		/**
		 * A boolean value indicating if inline configuration is allowed.
		 */
		noInlineConfig?: boolean;

		/**
		 * A severity value indicating if and how unused disable directives should be
		 * tracked and reported.
		 */
		reportUnusedDisableDirectives?: Severity | StringSeverity | boolean;

		/**
		 * A severity value indicating if and how unused inline configs should be
		 * tracked and reported.
		 */
		reportUnusedInlineConfigs?: Severity | StringSeverity;
	}

	/**
	 * Performance statistics.
	 */
	interface Stats {
		/**
		 * The number of times ESLint has applied at least one fix after linting.
		 */
		fixPasses: number;

		/**
		 * The times spent on (parsing, fixing, linting) a file, where the linting refers to the timing information for each rule.
		 */
		times: { passes: TimePass[] };
	}

	interface TimePass {
		/**
		 * The parse object containing all parse time information.
		 */
		parse: { total: number };

		/**
		 * The rules object containing all lint time information for each rule.
		 */
		rules?: Record<string, { total: number }>;

		/**
		 * The fix object containing all fix time information.
		 */
		fix: { total: number };

		/**
		 * The total time that is spent on (parsing, fixing, linting) a file.
		 */
		total: number;
	}
}

// #endregion

// #region ESLint

export class ESLint {
	static configType: "flat";

	static readonly version: string;

	/**
	 * The default configuration that ESLint uses internally. This is provided for tooling that wants to calculate configurations using the same defaults as ESLint.
	 * Keep in mind that the default configuration may change from version to version, so you shouldn't rely on any particular keys or values to be present.
	 */
	static readonly defaultConfig: Linter.Config[];

	static outputFixes(results: ESLint.LintResult[]): Promise<void>;

	static getErrorResults(results: ESLint.LintResult[]): ESLint.LintResult[];

	constructor(options?: ESLint.Options);

	lintFiles(patterns: string | string[]): Promise<ESLint.LintResult[]>;

	lintText(
		code: string,
		options?: {
			filePath?: string | undefined;
			warnIgnored?: boolean | undefined;
		},
	): Promise<ESLint.LintResult[]>;

	getRulesMetaForResults(
		results: ESLint.LintResult[],
	): ESLint.LintResultData["rulesMeta"];

	hasFlag(flag: string): boolean;

	calculateConfigForFile(filePath: string): Promise<any>;

	findConfigFile(): Promise<string | undefined>;

	isPathIgnored(filePath: string): Promise<boolean>;

	loadFormatter(nameOrPath?: string): Promise<ESLint.LoadedFormatter>;
}

export namespace ESLint {
	type ConfigData<Rules extends Linter.RulesRecord = Linter.RulesRecord> =
		Omit<Linter.LegacyConfig<Rules>, "$schema">;

	interface Environment {
		/** The definition of global variables. */
		globals?: Linter.Globals | undefined;

		/** The parser options that will be enabled under this environment. */
		parserOptions?: Linter.ParserOptions | undefined;
	}

	interface ObjectMetaProperties {
		/** @deprecated Use `meta.name` instead. */
		name?: string | undefined;

		/** @deprecated Use `meta.version` instead. */
		version?: string | undefined;

		meta?: {
			name?: string | undefined;
			version?: string | undefined;
		};
	}

	interface Plugin extends ObjectMetaProperties {
		meta?: ObjectMetaProperties["meta"] & {
			namespace?: string | undefined;
		};
		configs?:
			| Record<
					string,
					Linter.LegacyConfig | Linter.Config | Linter.Config[]
			  >
			| undefined;
		environments?: Record<string, Environment> | undefined;
		languages?: Record<string, Language> | undefined;
		processors?: Record<string, Linter.Processor> | undefined;
		rules?: Record<string, RuleDefinition> | undefined;
	}

	type FixType = "directive" | "problem" | "suggestion" | "layout";

	type CacheStrategy = "content" | "metadata";

	interface Options {
		// File enumeration
		cwd?: string | undefined;
		errorOnUnmatchedPattern?: boolean | undefined;
		globInputPaths?: boolean | undefined;
		ignore?: boolean | undefined;
		ignorePatterns?: string[] | null | undefined;
		passOnNoPatterns?: boolean | undefined;
		warnIgnored?: boolean | undefined;

		// Linting
		allowInlineConfig?: boolean | undefined;
		baseConfig?: Linter.Config | Linter.Config[] | null | undefined;
		overrideConfig?: Linter.Config | Linter.Config[] | null | undefined;
		overrideConfigFile?: string | true | null | undefined;
		plugins?: Record<string, Plugin> | null | undefined;
		ruleFilter?:
			| ((arg: {
					ruleId: string;
					severity: Exclude<Linter.Severity, 0>;
			  }) => boolean)
			| undefined;
		stats?: boolean | undefined;

		// Autofix
		fix?: boolean | ((message: Linter.LintMessage) => boolean) | undefined;
		fixTypes?: FixType[] | undefined;

		// Cache-related
		cache?: boolean | undefined;
		cacheLocation?: string | undefined;
		cacheStrategy?: CacheStrategy | undefined;

		// Other Options
		flags?: string[] | undefined;
	}

	interface LegacyOptions {
		// File enumeration
		cwd?: string | undefined;
		errorOnUnmatchedPattern?: boolean | undefined;
		extensions?: string[] | undefined;
		globInputPaths?: boolean | undefined;
		ignore?: boolean | undefined;
		ignorePath?: string | undefined;

		// Linting
		allowInlineConfig?: boolean | undefined;
		baseConfig?: Linter.LegacyConfig | undefined;
		overrideConfig?: Linter.LegacyConfig | undefined;
		overrideConfigFile?: string | undefined;
		plugins?: Record<string, Plugin> | undefined;
		reportUnusedDisableDirectives?: Linter.StringSeverity | undefined;
		resolvePluginsRelativeTo?: string | undefined;
		rulePaths?: string[] | undefined;
		useEslintrc?: boolean | undefined;

		// Autofix
		fix?: boolean | ((message: Linter.LintMessage) => boolean) | undefined;
		fixTypes?: FixType[] | undefined;

		// Cache-related
		cache?: boolean | undefined;
		cacheLocation?: string | undefined;
		cacheStrategy?: CacheStrategy | undefined;

		// Other Options
		flags?: string[] | undefined;
	}

	/** A linting result. */
	interface LintResult {
		/** The path to the file that was linted. */
		filePath: string;

		/** All of the messages for the result. */
		messages: Linter.LintMessage[];

		/** All of the suppressed messages for the result. */
		suppressedMessages: Linter.SuppressedLintMessage[];

		/** Number of errors for the result. */
		errorCount: number;

		/** Number of fatal errors for the result. */
		fatalErrorCount: number;

		/** Number of warnings for the result. */
		warningCount: number;

		/** Number of fixable errors for the result. */
		fixableErrorCount: number;

		/** Number of fixable warnings for the result. */
		fixableWarningCount: number;

		/** The source code of the file that was linted, with as many fixes applied as possible. */
		output?: string | undefined;

		/** The source code of the file that was linted. */
		source?: string | undefined;

		/** The performance statistics collected with the `stats` flag. */
		stats?: Linter.Stats | undefined;

		/** The list of used deprecated rules. */
		usedDeprecatedRules: DeprecatedRuleUse[];
	}

	/**
	 * Information provided when the maximum warning threshold is exceeded.
	 */
	interface MaxWarningsExceeded {
		/**
		 * Number of warnings to trigger nonzero exit code.
		 */
		maxWarnings: number;

		/**
		 * Number of warnings found while linting.
		 */
		foundWarnings: number;
	}

	interface LintResultData {
		cwd: string;
		maxWarningsExceeded?: MaxWarningsExceeded | undefined;
		rulesMeta: {
			[ruleId: string]: Rule.RuleMetaData;
		};
	}

	/**
	 * Information about deprecated rules.
	 */
	interface DeprecatedRuleUse {
		/**
		 * The rule ID.
		 */
		ruleId: string;

		/**
		 * The rule IDs that replace this deprecated rule.
		 */
		replacedBy: string[];

		/**
		 * The raw deprecated info provided by the rule.
		 * Unset if the rule's `meta.deprecated` property is a boolean.
		 */
		info?: DeprecatedInfo;
	}

	/**
	 * Metadata about results for formatters.
	 */
	interface ResultsMeta {
		/**
		 * Present if the maxWarnings threshold was exceeded.
		 */
		maxWarningsExceeded?: MaxWarningsExceeded | undefined;
	}

	/** The type of an object resolved by {@link ESLint.loadFormatter}. */
	interface LoadedFormatter {
		/**
		 * Used to call the underlying formatter.
		 * @param results An array of lint results to format.
		 * @param resultsMeta An object with an optional `maxWarningsExceeded` property that will be
		 * passed to the underlying formatter function along with other properties set by ESLint.
		 * This argument can be omitted if `maxWarningsExceeded` is not needed.
		 * @return The formatter output.
		 */
		format(
			results: LintResult[],
			resultsMeta?: ResultsMeta,
		): string | Promise<string>;
	}

	// The documented type name is `LoadedFormatter`, but `Formatter` has been historically more used.
	type Formatter = LoadedFormatter;

	/**
	 * The expected signature of a custom formatter.
	 * @param results An array of lint results to format.
	 * @param context Additional information for the formatter.
	 * @return The formatter output.
	 */
	type FormatterFunction = (
		results: LintResult[],
		context: LintResultData,
	) => string | Promise<string>;

	// Docs reference the types by those name
	type EditInfo = Rule.Fix;
}

// #endregion

export function loadESLint(options: {
	useFlatConfig: true;
}): Promise<typeof ESLint>;
export function loadESLint(options: {
	useFlatConfig: false;
}): Promise<typeof LegacyESLint>;
export function loadESLint(options?: {
	useFlatConfig?: boolean | undefined;
}): Promise<typeof ESLint | typeof LegacyESLint>;

// #region RuleTester

export class RuleTester {
	static describe: ((...args: any) => any) | null;
	static it: ((...args: any) => any) | null;
	static itOnly: ((...args: any) => any) | null;

	constructor(config?: Linter.Config);

	run(
		name: string,
		rule: RuleDefinition,
		tests: {
			valid: Array<string | RuleTester.ValidTestCase>;
			invalid: RuleTester.InvalidTestCase[];
		},
	): void;

	static only(
		item: string | RuleTester.ValidTestCase | RuleTester.InvalidTestCase,
	): RuleTester.ValidTestCase | RuleTester.InvalidTestCase;
}

export namespace RuleTester {
	interface ValidTestCase {
		name?: string;
		code: string;
		options?: any;
		filename?: string | undefined;
		only?: boolean;
		languageOptions?: Linter.LanguageOptions | undefined;
		settings?: { [name: string]: any } | undefined;
	}

	interface SuggestionOutput {
		messageId?: string;
		desc?: string;
		data?: Record<string, unknown> | undefined;
		output: string;
	}

	interface InvalidTestCase extends ValidTestCase {
		errors: number | Array<TestCaseError | string>;
		output?: string | null | undefined;
	}

	interface TestCaseError {
		message?: string | RegExp;
		messageId?: string;
		/**
		 * @deprecated `type` is deprecated and will be removed in the next major version.
		 */
		type?: string | undefined;
		data?: any;
		line?: number | undefined;
		column?: number | undefined;
		endLine?: number | undefined;
		endColumn?: number | undefined;
		suggestions?: SuggestionOutput[] | undefined;
	}
}

// #endregion
