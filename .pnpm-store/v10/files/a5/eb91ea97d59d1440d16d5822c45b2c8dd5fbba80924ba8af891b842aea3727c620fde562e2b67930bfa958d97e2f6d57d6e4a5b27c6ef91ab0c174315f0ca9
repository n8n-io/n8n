import {parse} from '@babel/parser';
import {recursive as walk} from 'babel-walk';
import * as t from '@babel/types';
import detect from './globals';

const parseOptions = {
  allowReturnOutsideFunction: true,
  allowImportExportEverywhere: true,
};

/**
 * Mimic `with` as far as possible but at compile time
 *
 * @param obj The object part of a with expression
 * @param src The body of the with expression
 * @param exclude A list of variable names to explicitly exclude
 */
export default function addWith(
  obj: string,
  src: string,
  exclude: string[] = [],
) {
  // tslint:disable-next-line: no-parameter-reassignment
  obj = obj + '';
  // tslint:disable-next-line: no-parameter-reassignment
  src = src + '';

  let ast;
  try {
    ast = parse(src, parseOptions);
  } catch (e) {
    throw Object.assign(
      new Error('Error parsing body of the with expression'),
      {
        component: 'src',
        babylonError: e,
      },
    );
  }
  let objAst;
  try {
    objAst = parse(obj, parseOptions);
  } catch (e) {
    throw Object.assign(
      new Error('Error parsing object part of the with expression'),
      {
        component: 'obj',
        babylonError: e,
      },
    );
  }
  const excludeSet = new Set([
    'undefined',
    'this',
    ...exclude,
    ...detect(objAst).map((g) => g.name),
  ]);

  const vars = new Set(
    detect(ast)
      .map((global) => global.name)
      .filter((v) => !excludeSet.has(v)),
  );

  if (vars.size === 0) return src;

  let declareLocal = '';
  let local = 'locals_for_with';
  let result = 'result_of_with';
  if (t.isValidIdentifier(obj)) {
    local = obj;
  } else {
    while (vars.has(local) || excludeSet.has(local)) {
      local += '_';
    }
    declareLocal = `var ${local} = (${obj});`;
  }
  while (vars.has(result) || excludeSet.has(result)) {
    result += '_';
  }

  const args = [
    'this',
    ...Array.from(vars).map(
      (v) =>
        `${JSON.stringify(v)} in ${local} ?
        ${local}.${v} :
        typeof ${v} !== 'undefined' ? ${v} : undefined`,
    ),
  ];

  const unwrapped = unwrapReturns(ast, src, result);

  return `;
    ${declareLocal}
    ${unwrapped.before}
    (function (${Array.from(vars).join(', ')}) {
      ${unwrapped.body}
    }.call(${args.join(', ')}));
    ${unwrapped.after};`;
}

interface UnwrapReturnsState {
  hasReturn: boolean;
  source(node: t.Node): string;
  replace(node: t.Node, str: string): void;
}
const unwrapReturnsVisitors = walk<UnwrapReturnsState>({
  Function(_node, _state, _c) {
    // returns in these functions are not applicable
  },

  ReturnStatement(node, state) {
    state.hasReturn = true;
    let value = '';
    if (node.argument) {
      value = `value: (${state.source(node.argument)})`;
    }
    state.replace(node, `return {${value}};`);
  },
});

/**
 * Take a self calling function, and unwrap it such that return inside the function
 * results in return outside the function
 *
 * @param src    Some JavaScript code representing a self-calling function
 * @param result A temporary variable to store the result in
 */
function unwrapReturns(ast: t.Node, src: string, result: string) {
  const charArray = src.split('');

  const state: UnwrapReturnsState = {
    hasReturn: false,
    source(node) {
      return src.slice(node.start!, node.end!);
    },
    replace(node, str) {
      charArray.fill('', node.start!, node.end!);
      charArray[node.start!] = str;
    },
  };

  unwrapReturnsVisitors(ast, state);

  return {
    before: state.hasReturn ? `var ${result} = ` : '',
    body: charArray.join(''),
    after: state.hasReturn ? `;if (${result}) return ${result}.value` : '',
  };
}

module.exports = addWith;
module.exports.default = addWith;
