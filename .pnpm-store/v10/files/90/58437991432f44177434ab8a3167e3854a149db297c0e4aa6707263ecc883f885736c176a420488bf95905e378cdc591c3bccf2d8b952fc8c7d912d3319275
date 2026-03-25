import * as bt from '@babel/types';
import { NodePath } from 'ast-types/lib/node-path';
import Map from 'ts-map';
import { ImportedVariableSet } from './resolveRequired';
/**
 * Given an AST, this function tries to find the exported component definitions.
 *
 * If a definition is part of the following statements, it is considered to be
 * exported:
 *
 * modules.exports = Definition;
 * exports.foo = Definition;
 * export default Definition;
 * export var Definition = ...;
 */
export default function resolveExportedComponent(ast: bt.File): [Map<string, NodePath>, ImportedVariableSet];
