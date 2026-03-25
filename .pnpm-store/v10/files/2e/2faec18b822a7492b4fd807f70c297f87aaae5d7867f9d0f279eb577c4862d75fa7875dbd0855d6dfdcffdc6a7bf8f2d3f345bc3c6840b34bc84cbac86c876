import { c as createRule, G as getPrecedence, l as isKeywordToken, H as isDecimalInteger, s as skipChainExpression, z as getStaticPropertyName, i as isSingleLine, I as isMixedLogicalAndCoalesceExpressions, a as canTokensBeAdjacent, J as isTopLevelExpressionStatement } from '../utils.js';
import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var noExtraParens = createRule({
  name: "no-extra-parens",
  meta: {
    type: "layout",
    docs: {
      description: "Disallow unnecessary parentheses"
    },
    fixable: "code",
    schema: {
      anyOf: [
        {
          type: "array",
          items: [
            {
              type: "string",
              enum: ["functions"]
            }
          ],
          minItems: 0,
          maxItems: 1
        },
        {
          type: "array",
          items: [
            {
              type: "string",
              enum: ["all"]
            },
            {
              type: "object",
              properties: {
                conditionalAssign: { type: "boolean" },
                ternaryOperandBinaryExpressions: { type: "boolean" },
                nestedBinaryExpressions: { type: "boolean" },
                returnAssign: { type: "boolean" },
                ignoreJSX: { type: "string", enum: ["none", "all", "single-line", "multi-line"] },
                enforceForArrowConditionals: { type: "boolean" },
                enforceForSequenceExpressions: { type: "boolean" },
                enforceForNewInMemberExpressions: { type: "boolean" },
                enforceForFunctionPrototypeMethods: { type: "boolean" },
                allowParensAfterCommentPattern: { type: "string" },
                nestedConditionalExpressions: { type: "boolean" },
                allowNodesInSpreadElement: {
                  type: "object",
                  properties: {
                    ConditionalExpression: { type: "boolean" },
                    LogicalExpression: { type: "boolean" },
                    AwaitExpression: { type: "boolean" }
                  },
                  additionalProperties: false
                }
              },
              additionalProperties: false
            }
          ],
          minItems: 0,
          maxItems: 2
        }
      ]
    },
    messages: {
      unexpected: "Unnecessary parentheses around expression."
    }
  },
  defaultOptions: ["all"],
  create(context) {
    const sourceCode = context.sourceCode;
    const tokensToIgnore = /* @__PURE__ */ new WeakSet();
    const precedence = getPrecedence;
    const ALL_NODES = context.options[0] !== "functions";
    const EXCEPT_COND_ASSIGN = ALL_NODES && context.options[1] && context.options[1].conditionalAssign === false;
    const EXCEPT_COND_TERNARY = ALL_NODES && context.options[1] && context.options[1].ternaryOperandBinaryExpressions === false;
    const NESTED_BINARY = ALL_NODES && context.options[1] && context.options[1].nestedBinaryExpressions === false;
    const EXCEPT_RETURN_ASSIGN = ALL_NODES && context.options[1] && context.options[1].returnAssign === false;
    const IGNORE_JSX = ALL_NODES && context.options[1] && context.options[1].ignoreJSX;
    const IGNORE_ARROW_CONDITIONALS = ALL_NODES && context.options[1] && context.options[1].enforceForArrowConditionals === false;
    const IGNORE_SEQUENCE_EXPRESSIONS = ALL_NODES && context.options[1] && context.options[1].enforceForSequenceExpressions === false;
    const IGNORE_NEW_IN_MEMBER_EXPR = ALL_NODES && context.options[1] && context.options[1].enforceForNewInMemberExpressions === false;
    const IGNORE_FUNCTION_PROTOTYPE_METHODS = ALL_NODES && context.options[1] && context.options[1].enforceForFunctionPrototypeMethods === false;
    const ALLOW_PARENS_AFTER_COMMENT_PATTERN = ALL_NODES && context.options[1] && context.options[1].allowParensAfterCommentPattern;
    const ALLOW_NESTED_TERNARY = ALL_NODES && context.options[1] && context.options[1].nestedConditionalExpressions === false;
    const ALLOW_NODES_IN_SPREAD = ALL_NODES && context.options[1] && new Set(Object.entries(context.options[1].allowNodesInSpreadElement || {}).filter(([_, value]) => value).map(([key]) => key));
    const PRECEDENCE_OF_ASSIGNMENT_EXPR = precedence({ type: "AssignmentExpression" });
    const PRECEDENCE_OF_UPDATE_EXPR = precedence({ type: "UpdateExpression" });
    let reportsBuffer;
    function pathToAncestor(node, ancestor) {
      const path = [node];
      let currentNode = node;
      while (currentNode !== ancestor) {
        currentNode = currentNode.parent;
        if (currentNode === null || currentNode === void 0)
          throw new Error("Nodes are not in the ancestor-descendant relationship.");
        path.push(currentNode);
      }
      return path;
    }
    function pathToDescendant(node, descendant) {
      return pathToAncestor(descendant, node).reverse();
    }
    function isSafelyEnclosingInExpression(node, child) {
      switch (node.type) {
        case "ArrayExpression":
        case "ArrayPattern":
        case "BlockStatement":
        case "ObjectExpression":
        case "ObjectPattern":
        case "TemplateLiteral":
          return true;
        case "ArrowFunctionExpression":
        case "FunctionExpression":
          return node.params.includes(child);
        case "CallExpression":
        case "NewExpression":
          return node.arguments.includes(child);
        case "MemberExpression":
          return node.computed && node.property === child;
        case "ConditionalExpression":
          return node.consequent === child;
        default:
          return false;
      }
    }
    function startNewReportsBuffering() {
      reportsBuffer = {
        upper: reportsBuffer,
        inExpressionNodes: [],
        reports: []
      };
    }
    function endCurrentReportsBuffering() {
      const { upper, inExpressionNodes, reports } = reportsBuffer ?? {};
      if (upper) {
        upper.inExpressionNodes.push(...inExpressionNodes ?? []);
        upper.reports.push(...reports ?? []);
      } else {
        reports?.forEach(({ finishReport }) => finishReport());
      }
      reportsBuffer = upper;
    }
    function isInCurrentReportsBuffer(node) {
      return reportsBuffer?.reports.some((r) => r.node === node);
    }
    function removeFromCurrentReportsBuffer(node) {
      if (reportsBuffer)
        reportsBuffer.reports = reportsBuffer.reports.filter((r) => r.node !== node);
    }
    function isImmediateFunctionPrototypeMethodCall(node) {
      const callNode = skipChainExpression(node);
      if (callNode.type !== "CallExpression")
        return false;
      const callee = skipChainExpression(callNode.callee);
      return callee.type === "MemberExpression" && callee.object.type === "FunctionExpression" && ["call", "apply"].includes(getStaticPropertyName(callee));
    }
    function ruleApplies(node) {
      if (node.type === "JSXElement" || node.type === "JSXFragment") {
        switch (IGNORE_JSX) {
          // Exclude this JSX element from linting
          case "all":
            return false;
          // Exclude this JSX element if it is multi-line element
          case "multi-line":
            return isSingleLine(node);
          // Exclude this JSX element if it is single-line element
          case "single-line":
            return !isSingleLine(node);
        }
      }
      if (node.type === "SequenceExpression" && IGNORE_SEQUENCE_EXPRESSIONS)
        return false;
      if (isImmediateFunctionPrototypeMethodCall(node) && IGNORE_FUNCTION_PROTOTYPE_METHODS)
        return false;
      return ALL_NODES || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression";
    }
    function isParenthesised(node) {
      return astUtilsExports.isParenthesized(1, node, sourceCode);
    }
    function isParenthesisedTwice(node) {
      return astUtilsExports.isParenthesized(2, node, sourceCode);
    }
    function hasExcessParens(node) {
      return ruleApplies(node) && isParenthesised(node);
    }
    function hasDoubleExcessParens(node) {
      return ruleApplies(node) && isParenthesisedTwice(node);
    }
    function hasExcessParensWithPrecedence(node, precedenceLowerLimit) {
      if (ruleApplies(node) && isParenthesised(node)) {
        if (precedence(node) >= precedenceLowerLimit || isParenthesisedTwice(node)) {
          return true;
        }
      }
      return false;
    }
    function isCondAssignException(node) {
      return EXCEPT_COND_ASSIGN && node.test && node.test.type === "AssignmentExpression";
    }
    function isInReturnStatement(node) {
      for (let currentNode = node; currentNode; currentNode = currentNode.parent) {
        if (currentNode.type === "ReturnStatement" || currentNode.type === "ArrowFunctionExpression" && currentNode.body.type !== "BlockStatement") {
          return true;
        }
      }
      return false;
    }
    function isNewExpressionWithParens(newExpression) {
      const lastToken = sourceCode.getLastToken(newExpression);
      const penultimateToken = sourceCode.getTokenBefore(lastToken);
      return newExpression.arguments.length > 0 || // The expression should end with its own parens, e.g., new new foo() is not a new expression with parens
      astUtilsExports.isOpeningParenToken(penultimateToken) && astUtilsExports.isClosingParenToken(lastToken) && newExpression.callee.range[1] < newExpression.range[1];
    }
    function isMemberExpInNewCallee(node) {
      if (node.type === "MemberExpression") {
        return node.parent.type === "NewExpression" && node.parent.callee === node ? true : "object" in node.parent && node.parent.object === node && isMemberExpInNewCallee(node.parent);
      }
      return false;
    }
    function doesMemberExpressionContainCallExpression(node) {
      let currentNode = node.object;
      let currentNodeType = node.object.type;
      while (currentNodeType === "MemberExpression") {
        if (!("object" in currentNode))
          break;
        currentNode = currentNode.object;
        currentNodeType = currentNode.type;
      }
      return currentNodeType === "CallExpression";
    }
    function containsAssignment(node) {
      if (node.type === "AssignmentExpression")
        return true;
      if (node.type === "ConditionalExpression" && (node.consequent.type === "AssignmentExpression" || node.alternate.type === "AssignmentExpression")) {
        return true;
      }
      if ("left" in node && (node.left && node.left.type === "AssignmentExpression" || node.right && node.right.type === "AssignmentExpression")) {
        return true;
      }
      return false;
    }
    function isReturnAssignException(node) {
      if (!EXCEPT_RETURN_ASSIGN || !isInReturnStatement(node))
        return false;
      if (node.type === "ReturnStatement")
        return node.argument && containsAssignment(node.argument);
      if (node.type === "ArrowFunctionExpression" && node.body.type !== "BlockStatement")
        return containsAssignment(node.body);
      return containsAssignment(node);
    }
    function hasExcessParensNoLineTerminator(token, node) {
      if (astUtilsExports.isTokenOnSameLine(token, node))
        return hasExcessParens(node);
      return hasDoubleExcessParens(node);
    }
    function requiresLeadingSpace(node) {
      const leftParenToken = sourceCode.getTokenBefore(node);
      const tokenBeforeLeftParen = sourceCode.getTokenBefore(leftParenToken, { includeComments: true });
      const tokenAfterLeftParen = sourceCode.getTokenAfter(leftParenToken, { includeComments: true });
      return tokenBeforeLeftParen && tokenBeforeLeftParen.range[1] === leftParenToken.range[0] && leftParenToken.range[1] === tokenAfterLeftParen.range[0] && !canTokensBeAdjacent(tokenBeforeLeftParen, tokenAfterLeftParen);
    }
    function requiresTrailingSpace(node) {
      const nextTwoTokens = sourceCode.getTokensAfter(node, { count: 2 });
      const rightParenToken = nextTwoTokens[0];
      const tokenAfterRightParen = nextTwoTokens[1];
      const tokenBeforeRightParen = sourceCode.getLastToken(node);
      return rightParenToken && tokenAfterRightParen && !sourceCode.isSpaceBetween(rightParenToken, tokenAfterRightParen) && !canTokensBeAdjacent(tokenBeforeRightParen, tokenAfterRightParen);
    }
    function isIIFE(node) {
      const maybeCallNode = skipChainExpression(node);
      return maybeCallNode.type === "CallExpression" && maybeCallNode.callee.type === "FunctionExpression";
    }
    function canBeAssignmentTarget(node) {
      return !!(node && (node.type === "Identifier" || node.type === "MemberExpression"));
    }
    function isAnonymousFunctionAssignmentException({ left, operator, right }) {
      if (left.type === "Identifier" && ["=", "&&=", "||=", "??="].includes(operator)) {
        const rhsType = right.type;
        if (rhsType === "ArrowFunctionExpression")
          return true;
        if ((rhsType === "FunctionExpression" || rhsType === "ClassExpression") && !right.id)
          return true;
      }
      return false;
    }
    function isFixable(node) {
      if (node.type !== "Literal" || typeof node.value !== "string")
        return true;
      if (isParenthesisedTwice(node))
        return true;
      return !isTopLevelExpressionStatement(node.parent);
    }
    function report(node) {
      const leftParenToken = sourceCode.getTokenBefore(node);
      const rightParenToken = sourceCode.getTokenAfter(node);
      if (!isParenthesisedTwice(node)) {
        if (tokensToIgnore.has(sourceCode.getFirstToken(node)))
          return;
        if (isIIFE(node) && !("callee" in node && isParenthesised(node.callee)))
          return;
        if (ALLOW_PARENS_AFTER_COMMENT_PATTERN) {
          const commentsBeforeLeftParenToken = sourceCode.getCommentsBefore(leftParenToken);
          const totalCommentsBeforeLeftParenTokenCount = commentsBeforeLeftParenToken.length;
          const ignorePattern = new RegExp(ALLOW_PARENS_AFTER_COMMENT_PATTERN, "u");
          if (totalCommentsBeforeLeftParenTokenCount > 0 && ignorePattern.test(commentsBeforeLeftParenToken[totalCommentsBeforeLeftParenTokenCount - 1].value)) {
            return;
          }
        }
      }
      function finishReport() {
        context.report({
          node,
          loc: leftParenToken.loc,
          messageId: "unexpected",
          fix: isFixable(node) ? (fixer) => {
            const parenthesizedSource = sourceCode.text.slice(leftParenToken.range[1], rightParenToken.range[0]);
            return fixer.replaceTextRange([
              leftParenToken.range[0],
              rightParenToken.range[1]
            ], (requiresLeadingSpace(node) ? " " : "") + parenthesizedSource + (requiresTrailingSpace(node) ? " " : ""));
          } : null
        });
      }
      if (reportsBuffer) {
        reportsBuffer.reports.push({ node, finishReport });
        return;
      }
      finishReport();
    }
    function checkArgumentWithPrecedence(node) {
      if ("argument" in node && node.argument && hasExcessParensWithPrecedence(node.argument, precedence(node)))
        report(node.argument);
    }
    function checkBinaryLogical(node) {
      const isLeftTypeAssertion = astUtilsExports.isTypeAssertion(node.left);
      const isRightTypeAssertion = astUtilsExports.isTypeAssertion(node.right);
      if (isLeftTypeAssertion && isRightTypeAssertion)
        return;
      const rule = (n) => {
        const prec = precedence(n);
        const leftPrecedence = precedence(n.left);
        const rightPrecedence = precedence(n.right);
        const isExponentiation = n.operator === "**";
        const shouldSkipLeft = NESTED_BINARY && (n.left.type === "BinaryExpression" || n.left.type === "LogicalExpression");
        const shouldSkipRight = NESTED_BINARY && (n.right.type === "BinaryExpression" || n.right.type === "LogicalExpression");
        if (!shouldSkipLeft && hasExcessParens(n.left)) {
          if (!(["AwaitExpression", "UnaryExpression"].includes(n.left.type) && isExponentiation) && !isMixedLogicalAndCoalesceExpressions(n.left, n) && !(n.parent.type === "ReturnStatement" && n.parent.loc.start.line !== n.left.loc.start.line && !isParenthesised(n)) && (leftPrecedence > prec || leftPrecedence === prec && !isExponentiation) || isParenthesisedTwice(n.left)) {
            report(n.left);
          }
        }
        if (!shouldSkipRight && hasExcessParens(n.right)) {
          if (!isMixedLogicalAndCoalesceExpressions(n.right, n) && (rightPrecedence > prec || rightPrecedence === prec && isExponentiation) || isParenthesisedTwice(n.right)) {
            report(n.right);
          }
        }
      };
      if (isLeftTypeAssertion) {
        return rule({
          ...node,
          left: {
            ...node.left,
            type: AST_NODE_TYPES.SequenceExpression
          }
        });
      }
      if (isRightTypeAssertion) {
        return rule({
          ...node,
          right: {
            ...node.right,
            type: AST_NODE_TYPES.SequenceExpression
          }
        });
      }
      return rule(node);
    }
    function checkCallNew(node) {
      const rule = (node2) => {
        const callee = node2.callee;
        if (hasExcessParensWithPrecedence(callee, precedence(node2))) {
          if (hasDoubleExcessParens(callee) || !(isIIFE(node2) || callee.type === "NewExpression" && !isNewExpressionWithParens(callee) && !(node2.type === "NewExpression" && !isNewExpressionWithParens(node2)) || node2.type === "NewExpression" && callee.type === "MemberExpression" && doesMemberExpressionContainCallExpression(callee) || (!("optional" in node2) || !node2.optional) && callee.type === "ChainExpression")) {
            report(node2.callee);
          }
        }
        node2.arguments.filter((arg) => hasExcessParensWithPrecedence(arg, PRECEDENCE_OF_ASSIGNMENT_EXPR)).forEach(report);
      };
      if (astUtilsExports.isTypeAssertion(node.callee)) {
        return rule({
          ...node,
          callee: {
            ...node.callee,
            type: AST_NODE_TYPES.SequenceExpression
          }
        });
      }
      if (node.typeArguments && node.arguments.length === 1 && sourceCode.getTokenAfter(node.callee, astUtilsExports.isOpeningParenToken) !== sourceCode.getTokenBefore(node.arguments[0], astUtilsExports.isOpeningParenToken)) {
        return rule({
          ...node,
          arguments: [
            {
              ...node.arguments[0],
              type: AST_NODE_TYPES.SequenceExpression
            }
          ]
        });
      }
      return rule(node);
    }
    function checkClass(node) {
      if (!node.superClass)
        return;
      const hasExtraParens = precedence(node.superClass) > PRECEDENCE_OF_UPDATE_EXPR ? hasExcessParens(node.superClass) : hasDoubleExcessParens(node.superClass);
      if (hasExtraParens)
        report(node.superClass);
    }
    function checkExpressionOrExportStatement(node) {
      const firstToken = isParenthesised(node) ? sourceCode.getTokenBefore(node) : sourceCode.getFirstToken(node);
      const secondToken = sourceCode.getTokenAfter(firstToken, astUtilsExports.isNotOpeningParenToken);
      const thirdToken = secondToken ? sourceCode.getTokenAfter(secondToken) : null;
      const tokenAfterClosingParens = secondToken ? sourceCode.getTokenAfter(secondToken, astUtilsExports.isNotClosingParenToken) : null;
      if (astUtilsExports.isOpeningParenToken(firstToken) && (astUtilsExports.isOpeningBraceToken(secondToken) || isKeywordToken(secondToken) && (secondToken.value === "function" || secondToken.value === "class" || secondToken.value === "let" && tokenAfterClosingParens && (astUtilsExports.isOpeningBracketToken(tokenAfterClosingParens) || tokenAfterClosingParens.type === "Identifier")) || secondToken && secondToken.type === "Identifier" && secondToken.value === "async" && isKeywordToken(thirdToken) && thirdToken.value === "function")) {
        tokensToIgnore.add(secondToken);
      }
      const hasExtraParens = node.parent.type === "ExportDefaultDeclaration" ? hasExcessParensWithPrecedence(node, PRECEDENCE_OF_ASSIGNMENT_EXPR) : hasExcessParens(node);
      if (hasExtraParens)
        report(node);
    }
    function checkUnaryUpdate(node) {
      if (astUtilsExports.isTypeAssertion(node.argument)) {
        return checkArgumentWithPrecedence({
          ...node,
          argument: {
            ...node.argument,
            type: AST_NODE_TYPES.SequenceExpression
          }
        });
      }
      return checkArgumentWithPrecedence(node);
    }
    return {
      ArrayExpression(node) {
        node.elements.map(
          (element) => astUtilsExports.isTypeAssertion(element) ? { ...element, type: AST_NODE_TYPES.FunctionExpression } : element
        ).filter((e) => !!e && hasExcessParensWithPrecedence(e, PRECEDENCE_OF_ASSIGNMENT_EXPR)).forEach(report);
      },
      ArrayPattern(node) {
        node.elements.filter((e) => !!e && canBeAssignmentTarget(e) && hasExcessParens(e)).forEach(report);
      },
      ArrowFunctionExpression(node) {
        if (astUtilsExports.isTypeAssertion(node.body))
          return;
        if (isReturnAssignException(node))
          return;
        if (node.body.type === "ConditionalExpression" && IGNORE_ARROW_CONDITIONALS) {
          return;
        }
        if (node.body.type === "BlockStatement")
          return;
        const firstBodyToken = sourceCode.getFirstToken(node.body, astUtilsExports.isNotOpeningParenToken);
        const tokenBeforeFirst = sourceCode.getTokenBefore(firstBodyToken);
        if (astUtilsExports.isOpeningParenToken(tokenBeforeFirst) && astUtilsExports.isOpeningBraceToken(firstBodyToken))
          tokensToIgnore.add(firstBodyToken);
        if (hasExcessParensWithPrecedence(node.body, PRECEDENCE_OF_ASSIGNMENT_EXPR))
          report(node.body);
      },
      AssignmentExpression(node) {
        if (canBeAssignmentTarget(node.left) && hasExcessParens(node.left) && (!isAnonymousFunctionAssignmentException(node) || isParenthesisedTwice(node.left))) {
          report(node.left);
        }
        if (!isReturnAssignException(node) && hasExcessParensWithPrecedence(node.right, precedence(node)))
          report(node.right);
      },
      AssignmentPattern(node) {
        const { left, right } = node;
        if (canBeAssignmentTarget(left) && hasExcessParens(left))
          report(left);
        if (right && hasExcessParensWithPrecedence(right, PRECEDENCE_OF_ASSIGNMENT_EXPR))
          report(right);
      },
      AwaitExpression(node) {
        if (astUtilsExports.isTypeAssertion(node.argument)) {
          return checkArgumentWithPrecedence({
            ...node,
            argument: {
              ...node.argument,
              type: AST_NODE_TYPES.SequenceExpression
            }
          });
        }
        return checkArgumentWithPrecedence(node);
      },
      BinaryExpression(node) {
        if (reportsBuffer && node.operator === "in")
          reportsBuffer.inExpressionNodes.push(node);
        checkBinaryLogical(node);
      },
      "CallExpression": checkCallNew,
      ClassDeclaration(node) {
        if (node.superClass?.type === AST_NODE_TYPES.TSAsExpression) {
          return checkClass({
            ...node,
            superClass: {
              ...node.superClass,
              type: AST_NODE_TYPES.SequenceExpression
            }
          });
        }
        return checkClass(node);
      },
      ClassExpression(node) {
        if (node.superClass?.type === AST_NODE_TYPES.TSAsExpression) {
          return checkClass({
            ...node,
            superClass: {
              ...node.superClass,
              type: AST_NODE_TYPES.SequenceExpression
            }
          });
        }
        return checkClass(node);
      },
      ConditionalExpression(node) {
        const rule = (node2) => {
          if (isReturnAssignException(node2))
            return;
          const availableTypes = /* @__PURE__ */ new Set(["BinaryExpression", "LogicalExpression"]);
          if (!(EXCEPT_COND_TERNARY && availableTypes.has(node2.test.type)) && !(ALLOW_NESTED_TERNARY && ["ConditionalExpression"].includes(node2.test.type)) && !isCondAssignException(node2) && hasExcessParensWithPrecedence(node2.test, precedence({ type: "LogicalExpression", operator: "||" }))) {
            report(node2.test);
          }
          if (!(EXCEPT_COND_TERNARY && availableTypes.has(node2.consequent.type)) && !(ALLOW_NESTED_TERNARY && ["ConditionalExpression"].includes(node2.consequent.type)) && hasExcessParensWithPrecedence(node2.consequent, PRECEDENCE_OF_ASSIGNMENT_EXPR)) {
            report(node2.consequent);
          }
          if (!(EXCEPT_COND_TERNARY && availableTypes.has(node2.alternate.type)) && !(ALLOW_NESTED_TERNARY && ["ConditionalExpression"].includes(node2.alternate.type)) && hasExcessParensWithPrecedence(node2.alternate, PRECEDENCE_OF_ASSIGNMENT_EXPR)) {
            report(node2.alternate);
          }
        };
        if (astUtilsExports.isTypeAssertion(node.test)) {
          return rule({
            ...node,
            test: {
              ...node.test,
              type: AST_NODE_TYPES.SequenceExpression
            }
          });
        }
        if (astUtilsExports.isTypeAssertion(node.consequent)) {
          return rule({
            ...node,
            consequent: {
              ...node.consequent,
              type: AST_NODE_TYPES.SequenceExpression
            }
          });
        }
        if (astUtilsExports.isTypeAssertion(node.alternate)) {
          return rule({
            ...node,
            alternate: {
              ...node.alternate,
              type: AST_NODE_TYPES.SequenceExpression
            }
          });
        }
        return rule(node);
      },
      DoWhileStatement(node) {
        if (hasExcessParens(node.test) && !isCondAssignException(node))
          report(node.test);
      },
      ExportDefaultDeclaration(node) {
        checkExpressionOrExportStatement(node.declaration);
      },
      ExpressionStatement(node) {
        checkExpressionOrExportStatement(node.expression);
      },
      ForInStatement(node) {
        if (astUtilsExports.isTypeAssertion(node.right)) {
          return;
        }
        if (node.left.type !== "VariableDeclaration") {
          const firstLeftToken = sourceCode.getFirstToken(node.left, astUtilsExports.isNotOpeningParenToken);
          if (firstLeftToken.value === "let" && astUtilsExports.isOpeningBracketToken(
            sourceCode.getTokenAfter(firstLeftToken, astUtilsExports.isNotClosingParenToken)
          )) {
            tokensToIgnore.add(firstLeftToken);
          }
        }
        if (hasExcessParens(node.left))
          report(node.left);
        if (hasExcessParens(node.right))
          report(node.right);
      },
      ForOfStatement(node) {
        if (node.left.type !== "VariableDeclaration") {
          const firstLeftToken = sourceCode.getFirstToken(node.left, astUtilsExports.isNotOpeningParenToken);
          if (firstLeftToken.value === "let") {
            tokensToIgnore.add(firstLeftToken);
          }
        }
        if (hasExcessParens(node.left))
          report(node.left);
        if (!astUtilsExports.isTypeAssertion(node.right) && hasExcessParensWithPrecedence(node.right, PRECEDENCE_OF_ASSIGNMENT_EXPR))
          report(node.right);
      },
      ForStatement(node) {
        if (node.test && hasExcessParens(node.test) && !isCondAssignException(node) && !astUtilsExports.isTypeAssertion(node.test))
          report(node.test);
        if (node.update && hasExcessParens(node.update) && !astUtilsExports.isTypeAssertion(node.update))
          report(node.update);
        if (node.init && !astUtilsExports.isTypeAssertion(node.init)) {
          if (node.init.type !== "VariableDeclaration") {
            const firstToken = sourceCode.getFirstToken(node.init, astUtilsExports.isNotOpeningParenToken);
            if (firstToken.value === "let" && astUtilsExports.isOpeningBracketToken(
              sourceCode.getTokenAfter(firstToken, astUtilsExports.isNotClosingParenToken)
            )) {
              tokensToIgnore.add(firstToken);
            }
          }
          startNewReportsBuffering();
          if (hasExcessParens(node.init))
            report(node.init);
        }
      },
      "ForStatement > *.init:exit": function(node) {
        if (astUtilsExports.isTypeAssertion(node))
          return;
        if (reportsBuffer?.reports.length) {
          reportsBuffer.inExpressionNodes.forEach((inExpressionNode) => {
            const path = pathToDescendant(node, inExpressionNode);
            let nodeToExclude = null;
            for (let i = 0; i < path.length; i++) {
              const pathNode = path[i];
              if (i < path.length - 1) {
                const nextPathNode = path[i + 1];
                if (isSafelyEnclosingInExpression(pathNode, nextPathNode)) {
                  return;
                }
              }
              if (isParenthesised(pathNode)) {
                if (isInCurrentReportsBuffer(pathNode)) {
                  if (isParenthesisedTwice(pathNode)) {
                    return;
                  }
                  if (!nodeToExclude)
                    nodeToExclude = pathNode;
                } else {
                  return;
                }
              }
            }
            if (nodeToExclude)
              removeFromCurrentReportsBuffer(nodeToExclude);
          });
        }
        endCurrentReportsBuffering();
      },
      IfStatement(node) {
        if (hasExcessParens(node.test) && !isCondAssignException(node))
          report(node.test);
      },
      ImportExpression(node) {
        const { source } = node;
        if (source.type === "SequenceExpression") {
          if (hasDoubleExcessParens(source))
            report(source);
        } else if (hasExcessParens(source)) {
          report(source);
        }
      },
      "LogicalExpression": checkBinaryLogical,
      MemberExpression(node) {
        const rule = (node2) => {
          const shouldAllowWrapOnce = isMemberExpInNewCallee(node2) && doesMemberExpressionContainCallExpression(node2);
          const nodeObjHasExcessParens = shouldAllowWrapOnce ? hasDoubleExcessParens(node2.object) : hasExcessParens(node2.object) && !(isImmediateFunctionPrototypeMethodCall(node2.parent) && "callee" in node2.parent && node2.parent.callee === node2 && IGNORE_FUNCTION_PROTOTYPE_METHODS);
          if (nodeObjHasExcessParens && precedence(node2.object) >= precedence(node2) && (node2.computed || !(isDecimalInteger(node2.object) || node2.object.type === "Literal" && "regex" in node2.object && node2.object.regex))) {
            report(node2.object);
          }
          if (nodeObjHasExcessParens && node2.object.type === "CallExpression") {
            report(node2.object);
          }
          if (nodeObjHasExcessParens && !IGNORE_NEW_IN_MEMBER_EXPR && node2.object.type === "NewExpression" && isNewExpressionWithParens(node2.object)) {
            report(node2.object);
          }
          if (nodeObjHasExcessParens && node2.optional && node2.object.type === "ChainExpression") {
            report(node2.object);
          }
          if (node2.computed && hasExcessParens(node2.property))
            report(node2.property);
        };
        if (astUtilsExports.isTypeAssertion(node.object)) {
          return rule({
            ...node,
            object: {
              ...node.object,
              type: AST_NODE_TYPES.SequenceExpression
            }
          });
        }
        if (astUtilsExports.isTypeAssertion(node.property)) {
          return rule({
            ...node,
            property: {
              ...node.property,
              type: AST_NODE_TYPES.FunctionExpression
            }
          });
        }
        return rule(node);
      },
      MethodDefinition(node) {
        if (!node.computed)
          return;
        if (hasExcessParensWithPrecedence(node.key, PRECEDENCE_OF_ASSIGNMENT_EXPR))
          report(node.key);
      },
      "NewExpression": checkCallNew,
      ObjectExpression(node) {
        node.properties.filter((property) => property.type === "Property" && property.value && hasExcessParensWithPrecedence(property.value, PRECEDENCE_OF_ASSIGNMENT_EXPR)).forEach((property) => report(property.value));
      },
      ObjectPattern(node) {
        node.properties.filter((property) => {
          const value = property.value;
          return value && canBeAssignmentTarget(value) && hasExcessParens(value);
        }).forEach((property) => report(property.value));
      },
      Property(node) {
        if (node.computed) {
          const { key } = node;
          if (key && hasExcessParensWithPrecedence(key, PRECEDENCE_OF_ASSIGNMENT_EXPR))
            report(key);
        }
      },
      PropertyDefinition(node) {
        if (node.computed && hasExcessParensWithPrecedence(node.key, PRECEDENCE_OF_ASSIGNMENT_EXPR))
          report(node.key);
        if (node.value && hasExcessParensWithPrecedence(node.value, PRECEDENCE_OF_ASSIGNMENT_EXPR))
          report(node.value);
      },
      RestElement(node) {
        const argument = node.argument;
        if (canBeAssignmentTarget(argument) && hasExcessParens(argument))
          report(argument);
      },
      ReturnStatement(node) {
        const returnToken = sourceCode.getFirstToken(node);
        if (isReturnAssignException(node))
          return;
        if (node.argument && returnToken && hasExcessParensNoLineTerminator(returnToken, node.argument) && !(node.argument.type === "Literal" && "regex" in node.argument && node.argument.regex)) {
          report(node.argument);
        }
      },
      SequenceExpression(node) {
        const precedenceOfNode = precedence(node);
        node.expressions.filter((e) => hasExcessParensWithPrecedence(e, precedenceOfNode)).forEach(report);
      },
      SpreadElement(node) {
        if (astUtilsExports.isTypeAssertion(node.argument))
          return;
        if (ALLOW_NODES_IN_SPREAD && ALLOW_NODES_IN_SPREAD.has(node.argument.type))
          return;
        if (!hasExcessParensWithPrecedence(node.argument, PRECEDENCE_OF_ASSIGNMENT_EXPR))
          return;
        report(node.argument);
      },
      SwitchCase(node) {
        if (node.test && !astUtilsExports.isTypeAssertion(node.test) && hasExcessParens(node.test))
          report(node.test);
      },
      SwitchStatement(node) {
        if (hasExcessParens(node.discriminant))
          report(node.discriminant);
      },
      TemplateLiteral(node) {
        node.expressions.filter((e) => e && hasExcessParens(e)).forEach(report);
      },
      ThrowStatement(node) {
        if (!node.argument || astUtilsExports.isTypeAssertion(node.argument))
          return;
        const throwToken = sourceCode.getFirstToken(node);
        if (!throwToken)
          return;
        if (hasExcessParensNoLineTerminator(throwToken, node.argument))
          report(node.argument);
      },
      "UnaryExpression": checkUnaryUpdate,
      UpdateExpression(node) {
        if (astUtilsExports.isTypeAssertion(node.argument)) {
          return checkUnaryUpdate(node);
        }
        if (node.prefix) {
          checkArgumentWithPrecedence(node);
        } else {
          const { argument } = node;
          const operatorToken = sourceCode.getLastToken(node);
          if (astUtilsExports.isTokenOnSameLine(argument, operatorToken)) {
            checkArgumentWithPrecedence(node);
          } else {
            if (hasDoubleExcessParens(argument))
              report(argument);
          }
        }
      },
      VariableDeclarator(node) {
        const rule = (node2) => {
          if (node2.init && hasExcessParensWithPrecedence(node2.init, PRECEDENCE_OF_ASSIGNMENT_EXPR) && !(node2.init.type === "Literal" && "regex" in node2.init && node2.init.regex)) {
            report(node2.init);
          }
        };
        if (astUtilsExports.isTypeAssertion(node.init)) {
          return rule({
            ...node,
            type: AST_NODE_TYPES.VariableDeclarator,
            init: {
              ...node.init,
              type: AST_NODE_TYPES.FunctionExpression
            }
          });
        }
        return rule(node);
      },
      WhileStatement(node) {
        if (hasExcessParens(node.test) && !isCondAssignException(node))
          report(node.test);
      },
      WithStatement(node) {
        if (hasExcessParens(node.object))
          report(node.object);
      },
      YieldExpression(node) {
        if (!node.argument || astUtilsExports.isTypeAssertion(node.argument))
          return;
        const yieldToken = sourceCode.getFirstToken(node);
        if (precedence(node.argument) >= precedence(node) && yieldToken && hasExcessParensNoLineTerminator(yieldToken, node.argument) || hasDoubleExcessParens(node.argument)) {
          report(node.argument);
        }
      },
      TSStringKeyword(node) {
        if (hasExcessParens(node)) {
          report({
            ...node,
            type: AST_NODE_TYPES.FunctionExpression
          });
        }
      }
    };
  }
});

export { noExtraParens as default };
