import require$$0$1 from '@typescript-eslint/types';
import require$$0 from '@eslint-community/eslint-utils';

var astUtils = {};

var eslintUtils = {};

var astUtilities = {};

var hasRequiredAstUtilities;

function requireAstUtilities () {
	if (hasRequiredAstUtilities) return astUtilities;
	hasRequiredAstUtilities = 1;
	var __createBinding = (astUtilities && astUtilities.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    var desc = Object.getOwnPropertyDescriptor(m, k);
	    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
	      desc = { enumerable: true, get: function() { return m[k]; } };
	    }
	    Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __setModuleDefault = (astUtilities && astUtilities.__setModuleDefault) || (Object.create ? (function(o, v) {
	    Object.defineProperty(o, "default", { enumerable: true, value: v });
	}) : function(o, v) {
	    o["default"] = v;
	});
	var __importStar = (astUtilities && astUtilities.__importStar) || (function () {
	    var ownKeys = function(o) {
	        ownKeys = Object.getOwnPropertyNames || function (o) {
	            var ar = [];
	            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
	            return ar;
	        };
	        return ownKeys(o);
	    };
	    return function (mod) {
	        if (mod && mod.__esModule) return mod;
	        var result = {};
	        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
	        __setModuleDefault(result, mod);
	        return result;
	    };
	})();
	Object.defineProperty(astUtilities, "__esModule", { value: true });
	astUtilities.isParenthesized = astUtilities.hasSideEffect = astUtilities.getStringIfConstant = astUtilities.getStaticValue = astUtilities.getPropertyName = astUtilities.getFunctionNameWithKind = astUtilities.getFunctionHeadLocation = void 0;
	const eslintUtils = __importStar(require$$0);
	/**
	 * Get the proper location of a given function node to report.
	 *
	 * @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#getfunctionheadlocation}
	 */
	astUtilities.getFunctionHeadLocation = eslintUtils.getFunctionHeadLocation;
	/**
	 * Get the name and kind of a given function node.
	 *
	 * @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#getfunctionnamewithkind}
	 */
	astUtilities.getFunctionNameWithKind = eslintUtils.getFunctionNameWithKind;
	/**
	 * Get the property name of a given property node.
	 * If the node is a computed property, this tries to compute the property name by the getStringIfConstant function.
	 *
	 * @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#getpropertyname}
	 * @returns The property name of the node. If the property name is not constant then it returns `null`.
	 */
	astUtilities.getPropertyName = eslintUtils.getPropertyName;
	/**
	 * Get the value of a given node if it can decide the value statically.
	 * If the 2nd parameter `initialScope` was given, this function tries to resolve identifier references which are in the
	 * given node as much as possible. In the resolving way, it does on the assumption that built-in global objects have
	 * not been modified.
	 * For example, it considers `Symbol.iterator`, `Symbol.for('k')`, ` String.raw``hello`` `, and `Object.freeze({a: 1}).a` as static, but `Symbol('k')` is not static.
	 *
	 * @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#getstaticvalue}
	 * @returns The `{ value: any }` shaped object. The `value` property is the static value. If it couldn't compute the
	 * static value of the node, it returns `null`.
	 */
	astUtilities.getStaticValue = eslintUtils.getStaticValue;
	/**
	 * Get the string value of a given node.
	 * This function is a tiny wrapper of the getStaticValue function.
	 *
	 * @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#getstringifconstant}
	 */
	astUtilities.getStringIfConstant = eslintUtils.getStringIfConstant;
	/**
	 * Check whether a given node has any side effect or not.
	 * The side effect means that it may modify a certain variable or object member. This function considers the node which
	 * contains the following types as the node which has side effects:
	 * - `AssignmentExpression`
	 * - `AwaitExpression`
	 * - `CallExpression`
	 * - `ImportExpression`
	 * - `NewExpression`
	 * - `UnaryExpression([operator = "delete"])`
	 * - `UpdateExpression`
	 * - `YieldExpression`
	 * - When `options.considerGetters` is `true`:
	 *   - `MemberExpression`
	 * - When `options.considerImplicitTypeConversion` is `true`:
	 *   - `BinaryExpression([operator = "==" | "!=" | "<" | "<=" | ">" | ">=" | "<<" | ">>" | ">>>" | "+" | "-" | "*" | "/" | "%" | "|" | "^" | "&" | "in"])`
	 *   - `MemberExpression([computed = true])`
	 *   - `MethodDefinition([computed = true])`
	 *   - `Property([computed = true])`
	 *   - `UnaryExpression([operator = "-" | "+" | "!" | "~"])`
	 *
	 * @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#hassideeffect}
	 */
	astUtilities.hasSideEffect = eslintUtils.hasSideEffect;
	astUtilities.isParenthesized = eslintUtils.isParenthesized;
	return astUtilities;
}

var PatternMatcher = {};

var hasRequiredPatternMatcher;

function requirePatternMatcher () {
	if (hasRequiredPatternMatcher) return PatternMatcher;
	hasRequiredPatternMatcher = 1;
	var __createBinding = (PatternMatcher && PatternMatcher.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    var desc = Object.getOwnPropertyDescriptor(m, k);
	    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
	      desc = { enumerable: true, get: function() { return m[k]; } };
	    }
	    Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __setModuleDefault = (PatternMatcher && PatternMatcher.__setModuleDefault) || (Object.create ? (function(o, v) {
	    Object.defineProperty(o, "default", { enumerable: true, value: v });
	}) : function(o, v) {
	    o["default"] = v;
	});
	var __importStar = (PatternMatcher && PatternMatcher.__importStar) || (function () {
	    var ownKeys = function(o) {
	        ownKeys = Object.getOwnPropertyNames || function (o) {
	            var ar = [];
	            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
	            return ar;
	        };
	        return ownKeys(o);
	    };
	    return function (mod) {
	        if (mod && mod.__esModule) return mod;
	        var result = {};
	        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
	        __setModuleDefault(result, mod);
	        return result;
	    };
	})();
	Object.defineProperty(PatternMatcher, "__esModule", { value: true });
	PatternMatcher.PatternMatcher = void 0;
	const eslintUtils = __importStar(require$$0);
	/**
	 * The class to find a pattern in strings as handling escape sequences.
	 * It ignores the found pattern if it's escaped with `\`.
	 *
	 * @see {@link https://eslint-community.github.io/eslint-utils/api/ast-utils.html#patternmatcher-class}
	 */
	PatternMatcher.PatternMatcher = eslintUtils.PatternMatcher;
	return PatternMatcher;
}

var predicates$1 = {};

var hasRequiredPredicates$1;

function requirePredicates$1 () {
	if (hasRequiredPredicates$1) return predicates$1;
	hasRequiredPredicates$1 = 1;
	var __createBinding = (predicates$1 && predicates$1.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    var desc = Object.getOwnPropertyDescriptor(m, k);
	    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
	      desc = { enumerable: true, get: function() { return m[k]; } };
	    }
	    Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __setModuleDefault = (predicates$1 && predicates$1.__setModuleDefault) || (Object.create ? (function(o, v) {
	    Object.defineProperty(o, "default", { enumerable: true, value: v });
	}) : function(o, v) {
	    o["default"] = v;
	});
	var __importStar = (predicates$1 && predicates$1.__importStar) || (function () {
	    var ownKeys = function(o) {
	        ownKeys = Object.getOwnPropertyNames || function (o) {
	            var ar = [];
	            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
	            return ar;
	        };
	        return ownKeys(o);
	    };
	    return function (mod) {
	        if (mod && mod.__esModule) return mod;
	        var result = {};
	        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
	        __setModuleDefault(result, mod);
	        return result;
	    };
	})();
	Object.defineProperty(predicates$1, "__esModule", { value: true });
	predicates$1.isNotSemicolonToken = predicates$1.isSemicolonToken = predicates$1.isNotOpeningParenToken = predicates$1.isOpeningParenToken = predicates$1.isNotOpeningBracketToken = predicates$1.isOpeningBracketToken = predicates$1.isNotOpeningBraceToken = predicates$1.isOpeningBraceToken = predicates$1.isNotCommentToken = predicates$1.isCommentToken = predicates$1.isNotCommaToken = predicates$1.isCommaToken = predicates$1.isNotColonToken = predicates$1.isColonToken = predicates$1.isNotClosingParenToken = predicates$1.isClosingParenToken = predicates$1.isNotClosingBracketToken = predicates$1.isClosingBracketToken = predicates$1.isNotClosingBraceToken = predicates$1.isClosingBraceToken = predicates$1.isNotArrowToken = predicates$1.isArrowToken = void 0;
	const eslintUtils = __importStar(require$$0);
	predicates$1.isArrowToken = eslintUtils.isArrowToken;
	predicates$1.isNotArrowToken = eslintUtils.isNotArrowToken;
	predicates$1.isClosingBraceToken = eslintUtils.isClosingBraceToken;
	predicates$1.isNotClosingBraceToken = eslintUtils.isNotClosingBraceToken;
	predicates$1.isClosingBracketToken = eslintUtils.isClosingBracketToken;
	predicates$1.isNotClosingBracketToken = eslintUtils.isNotClosingBracketToken;
	predicates$1.isClosingParenToken = eslintUtils.isClosingParenToken;
	predicates$1.isNotClosingParenToken = eslintUtils.isNotClosingParenToken;
	predicates$1.isColonToken = eslintUtils.isColonToken;
	predicates$1.isNotColonToken = eslintUtils.isNotColonToken;
	predicates$1.isCommaToken = eslintUtils.isCommaToken;
	predicates$1.isNotCommaToken = eslintUtils.isNotCommaToken;
	predicates$1.isCommentToken = eslintUtils.isCommentToken;
	predicates$1.isNotCommentToken = eslintUtils.isNotCommentToken;
	predicates$1.isOpeningBraceToken = eslintUtils.isOpeningBraceToken;
	predicates$1.isNotOpeningBraceToken = eslintUtils.isNotOpeningBraceToken;
	predicates$1.isOpeningBracketToken = eslintUtils.isOpeningBracketToken;
	predicates$1.isNotOpeningBracketToken = eslintUtils.isNotOpeningBracketToken;
	predicates$1.isOpeningParenToken = eslintUtils.isOpeningParenToken;
	predicates$1.isNotOpeningParenToken = eslintUtils.isNotOpeningParenToken;
	predicates$1.isSemicolonToken = eslintUtils.isSemicolonToken;
	predicates$1.isNotSemicolonToken = eslintUtils.isNotSemicolonToken;
	return predicates$1;
}

var ReferenceTracker = {};

var hasRequiredReferenceTracker;

function requireReferenceTracker () {
	if (hasRequiredReferenceTracker) return ReferenceTracker;
	hasRequiredReferenceTracker = 1;
	var __createBinding = (ReferenceTracker && ReferenceTracker.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    var desc = Object.getOwnPropertyDescriptor(m, k);
	    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
	      desc = { enumerable: true, get: function() { return m[k]; } };
	    }
	    Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __setModuleDefault = (ReferenceTracker && ReferenceTracker.__setModuleDefault) || (Object.create ? (function(o, v) {
	    Object.defineProperty(o, "default", { enumerable: true, value: v });
	}) : function(o, v) {
	    o["default"] = v;
	});
	var __importStar = (ReferenceTracker && ReferenceTracker.__importStar) || (function () {
	    var ownKeys = function(o) {
	        ownKeys = Object.getOwnPropertyNames || function (o) {
	            var ar = [];
	            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
	            return ar;
	        };
	        return ownKeys(o);
	    };
	    return function (mod) {
	        if (mod && mod.__esModule) return mod;
	        var result = {};
	        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
	        __setModuleDefault(result, mod);
	        return result;
	    };
	})();
	Object.defineProperty(ReferenceTracker, "__esModule", { value: true });
	ReferenceTracker.ReferenceTracker = void 0;
	/* eslint-disable @typescript-eslint/no-namespace */
	const eslintUtils = __importStar(require$$0);
	eslintUtils.ReferenceTracker.READ;
	eslintUtils.ReferenceTracker.CALL;
	eslintUtils.ReferenceTracker.CONSTRUCT;
	eslintUtils.ReferenceTracker.ESM;
	/**
	 * The tracker for references. This provides reference tracking for global variables, CommonJS modules, and ES modules.
	 *
	 * @see {@link https://eslint-community.github.io/eslint-utils/api/scope-utils.html#referencetracker-class}
	 */
	ReferenceTracker.ReferenceTracker = eslintUtils.ReferenceTracker;
	return ReferenceTracker;
}

var scopeAnalysis = {};

var hasRequiredScopeAnalysis;

function requireScopeAnalysis () {
	if (hasRequiredScopeAnalysis) return scopeAnalysis;
	hasRequiredScopeAnalysis = 1;
	var __createBinding = (scopeAnalysis && scopeAnalysis.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    var desc = Object.getOwnPropertyDescriptor(m, k);
	    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
	      desc = { enumerable: true, get: function() { return m[k]; } };
	    }
	    Object.defineProperty(o, k2, desc);
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __setModuleDefault = (scopeAnalysis && scopeAnalysis.__setModuleDefault) || (Object.create ? (function(o, v) {
	    Object.defineProperty(o, "default", { enumerable: true, value: v });
	}) : function(o, v) {
	    o["default"] = v;
	});
	var __importStar = (scopeAnalysis && scopeAnalysis.__importStar) || (function () {
	    var ownKeys = function(o) {
	        ownKeys = Object.getOwnPropertyNames || function (o) {
	            var ar = [];
	            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
	            return ar;
	        };
	        return ownKeys(o);
	    };
	    return function (mod) {
	        if (mod && mod.__esModule) return mod;
	        var result = {};
	        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
	        __setModuleDefault(result, mod);
	        return result;
	    };
	})();
	Object.defineProperty(scopeAnalysis, "__esModule", { value: true });
	scopeAnalysis.getInnermostScope = scopeAnalysis.findVariable = void 0;
	const eslintUtils = __importStar(require$$0);
	/**
	 * Get the variable of a given name.
	 *
	 * @see {@link https://eslint-community.github.io/eslint-utils/api/scope-utils.html#findvariable}
	 */
	scopeAnalysis.findVariable = eslintUtils.findVariable;
	/**
	 * Get the innermost scope which contains a given node.
	 *
	 * @see {@link https://eslint-community.github.io/eslint-utils/api/scope-utils.html#getinnermostscope}
	 * @returns The innermost scope which contains the given node.
	 * If such scope doesn't exist then it returns the 1st argument `initialScope`.
	 */
	scopeAnalysis.getInnermostScope = eslintUtils.getInnermostScope;
	return scopeAnalysis;
}

var hasRequiredEslintUtils;

function requireEslintUtils () {
	if (hasRequiredEslintUtils) return eslintUtils;
	hasRequiredEslintUtils = 1;
	(function (exports) {
		var __createBinding = (eslintUtils && eslintUtils.__createBinding) || (Object.create ? (function(o, m, k, k2) {
		    if (k2 === undefined) k2 = k;
		    var desc = Object.getOwnPropertyDescriptor(m, k);
		    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
		      desc = { enumerable: true, get: function() { return m[k]; } };
		    }
		    Object.defineProperty(o, k2, desc);
		}) : (function(o, m, k, k2) {
		    if (k2 === undefined) k2 = k;
		    o[k2] = m[k];
		}));
		var __exportStar = (eslintUtils && eslintUtils.__exportStar) || function(m, exports) {
		    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
		};
		Object.defineProperty(exports, "__esModule", { value: true });
		__exportStar(requireAstUtilities(), exports);
		__exportStar(requirePatternMatcher(), exports);
		__exportStar(requirePredicates$1(), exports);
		__exportStar(requireReferenceTracker(), exports);
		__exportStar(requireScopeAnalysis(), exports); 
	} (eslintUtils));
	return eslintUtils;
}

var helpers = {};

var hasRequiredHelpers;

function requireHelpers () {
	if (hasRequiredHelpers) return helpers;
	hasRequiredHelpers = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.isNotTokenOfTypeWithConditions = exports.isTokenOfTypeWithConditions = exports.isNodeOfTypeWithConditions = exports.isNodeOfTypes = exports.isNodeOfType = void 0;
		const isNodeOfType = (nodeType) => (node) => node?.type === nodeType;
		exports.isNodeOfType = isNodeOfType;
		const isNodeOfTypes = (nodeTypes) => (node) => !!node && nodeTypes.includes(node.type);
		exports.isNodeOfTypes = isNodeOfTypes;
		const isNodeOfTypeWithConditions = (nodeType, conditions) => {
		    const entries = Object.entries(conditions);
		    return (node) => node?.type === nodeType &&
		        entries.every(([key, value]) => node[key] === value);
		};
		exports.isNodeOfTypeWithConditions = isNodeOfTypeWithConditions;
		const isTokenOfTypeWithConditions = (tokenType, conditions) => {
		    const entries = Object.entries(conditions);
		    return (token) => token?.type === tokenType &&
		        entries.every(([key, value]) => token[key] === value);
		};
		exports.isTokenOfTypeWithConditions = isTokenOfTypeWithConditions;
		const isNotTokenOfTypeWithConditions = (tokenType, conditions) => (token) => !(0, exports.isTokenOfTypeWithConditions)(tokenType, conditions)(token);
		exports.isNotTokenOfTypeWithConditions = isNotTokenOfTypeWithConditions; 
	} (helpers));
	return helpers;
}

var misc = {};

var hasRequiredMisc;

function requireMisc () {
	if (hasRequiredMisc) return misc;
	hasRequiredMisc = 1;
	Object.defineProperty(misc, "__esModule", { value: true });
	misc.LINEBREAK_MATCHER = void 0;
	misc.isTokenOnSameLine = isTokenOnSameLine;
	misc.LINEBREAK_MATCHER = /\r\n|[\r\n\u2028\u2029]/;
	/**
	 * Determines whether two adjacent tokens are on the same line
	 */
	function isTokenOnSameLine(left, right) {
	    return left.loc.end.line === right.loc.start.line;
	}
	return misc;
}

var predicates = {};

var tsEstree = {};

var hasRequiredTsEstree;

function requireTsEstree () {
	if (hasRequiredTsEstree) return tsEstree;
	hasRequiredTsEstree = 1;
	(function (exports) {
		// for convenience's sake - export the types directly from here so consumers
		// don't need to reference/install both packages in their code
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.TSESTree = exports.AST_TOKEN_TYPES = exports.AST_NODE_TYPES = void 0;
		var types_1 = require$$0$1;
		Object.defineProperty(exports, "AST_NODE_TYPES", { enumerable: true, get: function () { return types_1.AST_NODE_TYPES; } });
		Object.defineProperty(exports, "AST_TOKEN_TYPES", { enumerable: true, get: function () { return types_1.AST_TOKEN_TYPES; } });
		Object.defineProperty(exports, "TSESTree", { enumerable: true, get: function () { return types_1.TSESTree; } }); 
	} (tsEstree));
	return tsEstree;
}

var hasRequiredPredicates;

function requirePredicates () {
	if (hasRequiredPredicates) return predicates;
	hasRequiredPredicates = 1;
	Object.defineProperty(predicates, "__esModule", { value: true });
	predicates.isLoop = predicates.isImportKeyword = predicates.isTypeKeyword = predicates.isAwaitKeyword = predicates.isAwaitExpression = predicates.isIdentifier = predicates.isConstructor = predicates.isClassOrTypeElement = predicates.isTSConstructorType = predicates.isTSFunctionType = predicates.isFunctionOrFunctionType = predicates.isFunctionType = predicates.isFunction = predicates.isVariableDeclarator = predicates.isTypeAssertion = predicates.isLogicalOrOperator = predicates.isOptionalCallExpression = predicates.isNotNonNullAssertionPunctuator = predicates.isNonNullAssertionPunctuator = predicates.isNotOptionalChainPunctuator = predicates.isOptionalChainPunctuator = void 0;
	predicates.isSetter = isSetter;
	const ts_estree_1 = requireTsEstree();
	const helpers_1 = requireHelpers();
	predicates.isOptionalChainPunctuator = (0, helpers_1.isTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Punctuator, { value: '?.' });
	predicates.isNotOptionalChainPunctuator = (0, helpers_1.isNotTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Punctuator, { value: '?.' });
	predicates.isNonNullAssertionPunctuator = (0, helpers_1.isTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Punctuator, { value: '!' });
	predicates.isNotNonNullAssertionPunctuator = (0, helpers_1.isNotTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Punctuator, { value: '!' });
	/**
	 * Returns true if and only if the node represents: foo?.() or foo.bar?.()
	 */
	predicates.isOptionalCallExpression = (0, helpers_1.isNodeOfTypeWithConditions)(ts_estree_1.AST_NODE_TYPES.CallExpression, 
	// this flag means the call expression itself is option
	// i.e. it is foo.bar?.() and not foo?.bar()
	{ optional: true });
	/**
	 * Returns true if and only if the node represents logical OR
	 */
	predicates.isLogicalOrOperator = (0, helpers_1.isNodeOfTypeWithConditions)(ts_estree_1.AST_NODE_TYPES.LogicalExpression, { operator: '||' });
	/**
	 * Checks if a node is a type assertion:
	 * ```
	 * x as foo
	 * <foo>x
	 * ```
	 */
	predicates.isTypeAssertion = (0, helpers_1.isNodeOfTypes)([
	    ts_estree_1.AST_NODE_TYPES.TSAsExpression,
	    ts_estree_1.AST_NODE_TYPES.TSTypeAssertion,
	]);
	predicates.isVariableDeclarator = (0, helpers_1.isNodeOfType)(ts_estree_1.AST_NODE_TYPES.VariableDeclarator);
	const functionTypes = [
	    ts_estree_1.AST_NODE_TYPES.ArrowFunctionExpression,
	    ts_estree_1.AST_NODE_TYPES.FunctionDeclaration,
	    ts_estree_1.AST_NODE_TYPES.FunctionExpression,
	];
	predicates.isFunction = (0, helpers_1.isNodeOfTypes)(functionTypes);
	const functionTypeTypes = [
	    ts_estree_1.AST_NODE_TYPES.TSCallSignatureDeclaration,
	    ts_estree_1.AST_NODE_TYPES.TSConstructorType,
	    ts_estree_1.AST_NODE_TYPES.TSConstructSignatureDeclaration,
	    ts_estree_1.AST_NODE_TYPES.TSDeclareFunction,
	    ts_estree_1.AST_NODE_TYPES.TSEmptyBodyFunctionExpression,
	    ts_estree_1.AST_NODE_TYPES.TSFunctionType,
	    ts_estree_1.AST_NODE_TYPES.TSMethodSignature,
	];
	predicates.isFunctionType = (0, helpers_1.isNodeOfTypes)(functionTypeTypes);
	predicates.isFunctionOrFunctionType = (0, helpers_1.isNodeOfTypes)([
	    ...functionTypes,
	    ...functionTypeTypes,
	]);
	predicates.isTSFunctionType = (0, helpers_1.isNodeOfType)(ts_estree_1.AST_NODE_TYPES.TSFunctionType);
	predicates.isTSConstructorType = (0, helpers_1.isNodeOfType)(ts_estree_1.AST_NODE_TYPES.TSConstructorType);
	predicates.isClassOrTypeElement = (0, helpers_1.isNodeOfTypes)([
	    // ClassElement
	    ts_estree_1.AST_NODE_TYPES.PropertyDefinition,
	    ts_estree_1.AST_NODE_TYPES.FunctionExpression,
	    ts_estree_1.AST_NODE_TYPES.MethodDefinition,
	    ts_estree_1.AST_NODE_TYPES.TSAbstractPropertyDefinition,
	    ts_estree_1.AST_NODE_TYPES.TSAbstractMethodDefinition,
	    ts_estree_1.AST_NODE_TYPES.TSEmptyBodyFunctionExpression,
	    ts_estree_1.AST_NODE_TYPES.TSIndexSignature,
	    // TypeElement
	    ts_estree_1.AST_NODE_TYPES.TSCallSignatureDeclaration,
	    ts_estree_1.AST_NODE_TYPES.TSConstructSignatureDeclaration,
	    // AST_NODE_TYPES.TSIndexSignature,
	    ts_estree_1.AST_NODE_TYPES.TSMethodSignature,
	    ts_estree_1.AST_NODE_TYPES.TSPropertySignature,
	]);
	/**
	 * Checks if a node is a constructor method.
	 */
	predicates.isConstructor = (0, helpers_1.isNodeOfTypeWithConditions)(ts_estree_1.AST_NODE_TYPES.MethodDefinition, { kind: 'constructor' });
	/**
	 * Checks if a node is a setter method.
	 */
	function isSetter(node) {
	    return (!!node &&
	        (node.type === ts_estree_1.AST_NODE_TYPES.MethodDefinition ||
	            node.type === ts_estree_1.AST_NODE_TYPES.Property) &&
	        node.kind === 'set');
	}
	predicates.isIdentifier = (0, helpers_1.isNodeOfType)(ts_estree_1.AST_NODE_TYPES.Identifier);
	/**
	 * Checks if a node represents an `await …` expression.
	 */
	predicates.isAwaitExpression = (0, helpers_1.isNodeOfType)(ts_estree_1.AST_NODE_TYPES.AwaitExpression);
	/**
	 * Checks if a possible token is the `await` keyword.
	 */
	predicates.isAwaitKeyword = (0, helpers_1.isTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Identifier, { value: 'await' });
	/**
	 * Checks if a possible token is the `type` keyword.
	 */
	predicates.isTypeKeyword = (0, helpers_1.isTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Identifier, { value: 'type' });
	/**
	 * Checks if a possible token is the `import` keyword.
	 */
	predicates.isImportKeyword = (0, helpers_1.isTokenOfTypeWithConditions)(ts_estree_1.AST_TOKEN_TYPES.Keyword, { value: 'import' });
	predicates.isLoop = (0, helpers_1.isNodeOfTypes)([
	    ts_estree_1.AST_NODE_TYPES.DoWhileStatement,
	    ts_estree_1.AST_NODE_TYPES.ForStatement,
	    ts_estree_1.AST_NODE_TYPES.ForInStatement,
	    ts_estree_1.AST_NODE_TYPES.ForOfStatement,
	    ts_estree_1.AST_NODE_TYPES.WhileStatement,
	]);
	return predicates;
}

var hasRequiredAstUtils;

function requireAstUtils () {
	if (hasRequiredAstUtils) return astUtils;
	hasRequiredAstUtils = 1;
	(function (exports) {
		var __createBinding = (astUtils && astUtils.__createBinding) || (Object.create ? (function(o, m, k, k2) {
		    if (k2 === undefined) k2 = k;
		    var desc = Object.getOwnPropertyDescriptor(m, k);
		    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
		      desc = { enumerable: true, get: function() { return m[k]; } };
		    }
		    Object.defineProperty(o, k2, desc);
		}) : (function(o, m, k, k2) {
		    if (k2 === undefined) k2 = k;
		    o[k2] = m[k];
		}));
		var __exportStar = (astUtils && astUtils.__exportStar) || function(m, exports) {
		    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
		};
		Object.defineProperty(exports, "__esModule", { value: true });
		__exportStar(requireEslintUtils(), exports);
		__exportStar(requireHelpers(), exports);
		__exportStar(requireMisc(), exports);
		__exportStar(requirePredicates(), exports); 
	} (astUtils));
	return astUtils;
}

var astUtilsExports = requireAstUtils();

function escapeStringRegexp(string) {
	if (typeof string !== 'string') {
		throw new TypeError('Expected a string');
	}

	// Escape characters with special meaning either inside or outside character sets.
	// Use a simple backslash escape when it’s always valid, and a `\xnn` escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
	return string
		.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
		.replace(/-/g, '\\x2d');
}

export { astUtilsExports as a, escapeStringRegexp as e };
