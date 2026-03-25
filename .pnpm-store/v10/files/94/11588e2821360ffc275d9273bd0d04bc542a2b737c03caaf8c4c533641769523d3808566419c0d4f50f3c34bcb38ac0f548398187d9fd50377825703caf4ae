import assertNever from 'assert-never';
import {ancestor as walk} from 'babel-walk';
import * as t from '@babel/types';
import isReferenced from './reference';

const isScope = (node: t.Node) => t.isFunctionParent(node) || t.isProgram(node);
const isBlockScope = (node: t.Node) =>
  t.isBlockStatement(node) || isScope(node);

const declaresArguments = (node: t.Node) =>
  t.isFunction(node) && !t.isArrowFunctionExpression(node);

const declaresThis = declaresArguments;

const LOCALS_SYMBOL = Symbol('locals');

const getLocals = (node: t.Node): Set<string> | undefined =>
  (node as any)[LOCALS_SYMBOL];
const declareLocals = (node: t.Node): Set<string> =>
  ((node as any)[LOCALS_SYMBOL] = (node as any)[LOCALS_SYMBOL] || new Set());

const setLocal = (node: t.Node, name: string) => declareLocals(node).add(name);

// First pass

function declareFunction(node: t.Function) {
  for (const param of node.params) {
    declarePattern(param, node);
  }
  const id = (node as t.FunctionDeclaration).id;
  if (id) {
    setLocal(node, id.name);
  }
}

function declarePattern(node: t.LVal, parent: t.Node) {
  switch (node.type) {
    case 'Identifier':
      setLocal(parent, node.name);
      break;
    case 'ObjectPattern':
      for (const prop of node.properties) {
        switch (prop.type) {
          case 'RestElement':
            declarePattern(prop.argument, parent);
            break;
          case 'ObjectProperty':
            declarePattern(prop.value as t.LVal, parent);
            break;
          default:
            assertNever(prop);
            break;
        }
      }
      break;
    case 'ArrayPattern':
      for (const element of node.elements) {
        if (element) declarePattern(element, parent);
      }
      break;
    case 'RestElement':
      declarePattern(node.argument, parent);
      break;
    case 'AssignmentPattern':
      declarePattern(node.left, parent);
      break;
    // istanbul ignore next
    default:
      throw new Error('Unrecognized pattern type: ' + node.type);
  }
}

function declareModuleSpecifier(
  node:
    | t.ImportSpecifier
    | t.ImportDefaultSpecifier
    | t.ImportNamespaceSpecifier,
  _state: unknown,
  parents: t.Node[],
) {
  for (let i = parents.length - 2; i >= 0; i--) {
    if (isScope(parents[i])) {
      setLocal(parents[i], node.local.name);
      return;
    }
  }
}

const firstPass = walk({
  VariableDeclaration(node, _state, parents) {
    for (let i = parents.length - 2; i >= 0; i--) {
      if (
        node.kind === 'var'
          ? t.isFunctionParent(parents[i])
          : isBlockScope(parents[i])
      ) {
        for (const declaration of node.declarations) {
          declarePattern(declaration.id, parents[i]);
        }
        return;
      }
    }
  },
  FunctionDeclaration(node, _state, parents) {
    if (node.id) {
      for (let i = parents.length - 2; i >= 0; i--) {
        if (isScope(parents[i])) {
          setLocal(parents[i], node.id.name);
          return;
        }
      }
    }
  },
  Function: declareFunction,
  ClassDeclaration(node, _state, parents) {
    for (let i = parents.length - 2; i >= 0; i--) {
      if (isScope(parents[i])) {
        setLocal(parents[i], node.id.name);
        return;
      }
    }
  },
  TryStatement(node) {
    if (node.handler === null) return;
    if (node.handler.param === null) return;
    declarePattern(node.handler.param, node.handler);
  },
  ImportDefaultSpecifier: declareModuleSpecifier,
  ImportSpecifier: declareModuleSpecifier,
  ImportNamespaceSpecifier: declareModuleSpecifier,
});

// Second pass

const secondPass = walk<{
  globals: (t.Identifier | t.ThisExpression)[];
}>({
  Identifier(node, state, parents) {
    const name = node.name;
    if (name === 'undefined') return;

    const lastParent = parents[parents.length - 2];
    if (lastParent) {
      if (!isReferenced(node, lastParent)) return;

      for (const parent of parents) {
        if (name === 'arguments' && declaresArguments(parent)) {
          return;
        }
        if (getLocals(parent)?.has(name)) {
          return;
        }
      }
    }

    state.globals.push(node);
  },

  ThisExpression(node, state, parents) {
    for (const parent of parents) {
      if (declaresThis(parent)) {
        return;
      }
    }

    state.globals.push(node);
  },
});

export default function findGlobals(ast: t.Node) {
  const globals: (t.Identifier | t.ThisExpression)[] = [];

  // istanbul ignore if
  if (!t.isNode(ast)) {
    throw new TypeError('Source must be a Babylon AST');
  }

  firstPass(ast, undefined);
  secondPass(ast, {globals});

  const groupedGlobals = new Map<string, (t.Identifier | t.ThisExpression)[]>();
  for (const node of globals) {
    const name: string = node.type === 'ThisExpression' ? 'this' : node.name;
    const existing = groupedGlobals.get(name);
    if (existing) {
      existing.push(node);
    } else {
      groupedGlobals.set(name, [node]);
    }
  }

  return [...groupedGlobals]
    .map(([name, nodes]) => ({name, nodes}))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}
