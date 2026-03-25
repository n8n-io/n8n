export type Operator =
  | '+'
  | '-'
  | '/'
  | '%'
  | '*'
  | '**'
  | '&'
  | '|'
  | '>>'
  | '>>>'
  | '<<'
  | '^'
  | '=='
  | '==='
  | '!='
  | '!=='
  | 'in'
  | 'instanceof'
  | '>'
  | '<'
  | '>='
  | '<=';

export default function binaryOperation(
  operator: Operator,
  left: any,
  right: any,
): any {
  switch (operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '/':
      return left / right;
    case '%':
      return left % right;
    case '*':
      return left * right;
    case '**':
      return left ** right;
    case '&':
      return left & right;
    case '|':
      return left | right;
    case '>>':
      return left >> right;
    case '>>>':
      return left >>> right;
    case '<<':
      return left << right;
    case '^':
      return left ^ right;
    case '==':
      return left == right;
    case '===':
      return left === right;
    case '!=':
      return left != right;
    case '!==':
      return left !== right;
    case 'in':
      return left in right;
    case 'instanceof':
      return left instanceof right;
    case '>':
      return left > right;
    case '<':
      return left < right;
    case '>=':
      return left >= right;
    case '<=':
      return left <= right;
  }
}
