import * as t from '@babel/types';

export default function isReferenced(node: t.Node, parent: t.Node) {
  switch (parent.type) {
    // yes: { [NODE]: '' }
    // yes: { NODE }
    // no: { NODE: '' }
    case 'ObjectProperty':
      return parent.value === node || parent.computed;

    // no: break NODE;
    // no: continue NODE;
    case 'BreakStatement':
    case 'ContinueStatement':
      return false;

    // yes: left = NODE;
    // yes: NODE = right;
    case 'AssignmentExpression':
      return true;
  }

  return t.isReferenced(node, parent);
}
