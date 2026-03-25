import {parseExpression, ParserOptions} from '@babel/parser';
import * as b from '@babel/types';
import binaryOperation from './binaryOperation';

export {ParserOptions as BabylonOptions};

export interface ExpressionToConstantOptions {
  constants?: any;
}

export interface Options extends ExpressionToConstantOptions {
  babylon?: ParserOptions;
}
export function expressionToConstant(
  expression: b.Expression,
  options: ExpressionToConstantOptions = {},
): {constant: true; result: any} | {constant: false; result?: void} {
  let constant = true;
  function toConstant(expression: b.Expression): any {
    if (!constant) return;
    if (b.isArrayExpression(expression)) {
      const result = [];
      for (let i = 0; constant && i < expression.elements.length; i++) {
        const element = expression.elements[i];
        if (b.isSpreadElement(element)) {
          const spread = toConstant(element.argument);
          if (!(isSpreadable(spread) && constant)) {
            constant = false;
          } else {
            result.push(...spread);
          }
        } else if (b.isExpression(element)) {
          result.push(toConstant(element));
        } else {
          constant = false;
        }
      }
      return result;
    }
    if (b.isBinaryExpression(expression)) {
      const left = toConstant(expression.left);
      const right = toConstant(expression.right);
      return constant && binaryOperation(expression.operator, left, right);
    }
    if (b.isBooleanLiteral(expression)) {
      return expression.value;
    }
    if (b.isCallExpression(expression)) {
      const args = [];
      for (let i = 0; constant && i < expression.arguments.length; i++) {
        const arg = expression.arguments[i];
        if (b.isSpreadElement(arg)) {
          const spread = toConstant(arg.argument);
          if (!(isSpreadable(spread) && constant)) {
            constant = false;
          } else {
            args.push(...spread);
          }
        } else if (b.isExpression(arg)) {
          args.push(toConstant(arg));
        } else {
          constant = false;
        }
      }
      if (!constant) return;
      if (b.isMemberExpression(expression.callee)) {
        const object = toConstant(expression.callee.object);
        if (!object || !constant) {
          constant = false;
          return;
        }
        const member = expression.callee.computed
          ? toConstant(expression.callee.property)
          : b.isIdentifier(expression.callee.property)
          ? expression.callee.property.name
          : undefined;
        if (member === undefined && !expression.callee.computed) {
          constant = false;
        }
        if (!constant) return;
        if (canCallMethod(object, '' + member)) {
          return object[member].apply(object, args);
        }
      } else {
        if (!b.isExpression(expression.callee)) {
          constant = false;
          return;
        }
        const callee = toConstant(expression.callee);
        if (!constant) return;
        return callee.apply(null, args);
      }
    }
    if (b.isConditionalExpression(expression)) {
      const test = toConstant(expression.test);
      return test
        ? toConstant(expression.consequent)
        : toConstant(expression.alternate);
    }
    if (b.isIdentifier(expression)) {
      if (
        options.constants &&
        {}.hasOwnProperty.call(options.constants, expression.name)
      ) {
        return options.constants[expression.name];
      }
    }
    if (b.isLogicalExpression(expression)) {
      const left = toConstant(expression.left);
      const right = toConstant(expression.right);
      if (constant && expression.operator === '&&') {
        return left && right;
      }
      if (constant && expression.operator === '||') {
        return left || right;
      }
    }
    if (b.isMemberExpression(expression)) {
      const object = toConstant(expression.object);
      if (!object || !constant) {
        constant = false;
        return;
      }
      const member = expression.computed
        ? toConstant(expression.property)
        : b.isIdentifier(expression.property)
        ? expression.property.name
        : undefined;
      if (member === undefined && !expression.computed) {
        constant = false;
      }
      if (!constant) return;
      if ({}.hasOwnProperty.call(object, '' + member) && member[0] !== '_') {
        return object[member];
      }
    }
    if (b.isNullLiteral(expression)) {
      return null;
    }
    if (b.isNumericLiteral(expression)) {
      return expression.value;
    }
    if (b.isObjectExpression(expression)) {
      const result: any = {};
      for (let i = 0; constant && i < expression.properties.length; i++) {
        const property = expression.properties[i];
        if (b.isObjectProperty(property)) {
          if (property.shorthand) {
            constant = false;
            return;
          }
          const key = property.computed
            ? toConstant(property.key)
            : b.isIdentifier(property.key)
            ? property.key.name
            : b.isStringLiteral(property.key)
            ? property.key.value
            : undefined;
          if (!key || key[0] === '_') {
            constant = false;
          }
          if (!constant) return;
          if (b.isExpression(property.value)) {
            const value = toConstant(property.value);
            if (!constant) return;
            result[key] = value;
          } else {
            constant = false;
          }
        } else if (b.isObjectMethod(property)) {
          constant = false;
        } else if (b.isSpreadProperty(property)) {
          const argument = toConstant(property.argument);
          if (!argument) constant = false;
          if (!constant) return;
          Object.assign(result, argument);
        }
      }
      return result;
    }
    if (b.isParenthesizedExpression(expression)) {
      return toConstant(expression.expression);
    }
    if (b.isRegExpLiteral(expression)) {
      return new RegExp(expression.pattern, expression.flags);
    }
    if (b.isSequenceExpression(expression)) {
      for (let i = 0; i < expression.expressions.length - 1 && constant; i++) {
        toConstant(expression.expressions[i]);
      }
      return toConstant(
        expression.expressions[expression.expressions.length - 1],
      );
    }
    if (b.isStringLiteral(expression)) {
      return expression.value;
    }
    // TODO: TaggedTemplateExpression
    if (b.isTemplateLiteral(expression)) {
      let result = '';
      for (let i = 0; i < expression.quasis.length; i++) {
        const quasi = expression.quasis[i];
        result += quasi.value.cooked;
        if (i < expression.expressions.length) {
          result += '' + toConstant(expression.expressions[i]);
        }
      }
      return result;
    }
    if (b.isUnaryExpression(expression)) {
      const argument = toConstant(expression.argument);
      if (!constant) {
        return;
      }
      switch (expression.operator) {
        case '-':
          return -argument;
        case '+':
          return +argument;
        case '!':
          return !argument;
        case '~':
          return ~argument;
        case 'typeof':
          return typeof argument;
        case 'void':
          return void argument;
      }
    }
    constant = false;
  }
  const result = toConstant(expression);
  return constant ? {constant: true, result} : {constant: false};
}
function isSpreadable(value: any): boolean {
  return (
    typeof value === 'string' ||
    Array.isArray(value) ||
    (typeof Set !== 'undefined' && value instanceof Set) ||
    (typeof Map !== 'undefined' && value instanceof Map)
  );
}
function shallowEqual(a: any, b: any) {
  if (a === b) return true;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (let key in a) {
      if (a[key] !== b[key]) {
        return false;
      }
    }
    for (let key in b) {
      if (a[key] !== b[key]) {
        return false;
      }
    }
    return true;
  }
  return false;
}
function canCallMethod(object: any, member: string): boolean {
  switch (typeof object) {
    case 'boolean':
      switch (member) {
        case 'toString':
          return true;
        default:
          return false;
      }
    case 'number':
      switch (member) {
        case 'toExponential':
        case 'toFixed':
        case 'toPrecision':
        case 'toString':
          return true;
        default:
          return false;
      }
    case 'string':
      switch (member) {
        case 'charAt':
        case 'charCodeAt':
        case 'codePointAt':
        case 'concat':
        case 'endsWith':
        case 'includes':
        case 'indexOf':
        case 'lastIndexOf':
        case 'match':
        case 'normalize':
        case 'padEnd':
        case 'padStart':
        case 'repeat':
        case 'replace':
        case 'search':
        case 'slice':
        case 'split':
        case 'startsWith':
        case 'substr':
        case 'substring':
        case 'toLowerCase':
        case 'toUpperCase':
        case 'trim':
          return true;
        default:
          return false;
      }
    default:
      if (object instanceof RegExp) {
        switch (member) {
          case 'test':
          case 'exec':
            return true;
          default:
            return false;
        }
      }
      return {}.hasOwnProperty.call(object, member) && member[0] !== '_';
  }
}

const EMPTY_OBJECT = {};
let lastSrc = '';
let lastConstants = EMPTY_OBJECT;
let lastOptions = EMPTY_OBJECT;
let lastResult: any = null;
let lastWasConstant = false;
export function isConstant(
  src: string,
  constants: any = EMPTY_OBJECT,
  options: ParserOptions = EMPTY_OBJECT,
) {
  if (
    lastSrc === src &&
    shallowEqual(lastConstants, constants) &&
    shallowEqual(lastOptions, options)
  ) {
    return lastWasConstant;
  }
  lastSrc = src;
  lastConstants = constants;
  let ast: b.Expression | void;
  try {
    ast = parseExpression(src, options);
  } catch (ex) {
    return (lastWasConstant = false);
  }
  const {result, constant} = expressionToConstant(ast, {constants});
  lastResult = result;
  return (lastWasConstant = constant);
}
export function toConstant(
  src: string,
  constants: any = EMPTY_OBJECT,
  options: ParserOptions = EMPTY_OBJECT,
) {
  if (!isConstant(src, constants, options)) {
    throw new Error(JSON.stringify(src) + ' is not constant.');
  }
  return lastResult;
}

export default isConstant;

module.exports = isConstant;
module.exports.default = isConstant;
module.exports.expressionToConstant = expressionToConstant;
module.exports.isConstant = isConstant;
module.exports.toConstant = toConstant;
