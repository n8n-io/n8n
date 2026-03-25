import * as bt from '@babel/types';
import { NodePath } from 'ast-types/lib/node-path';
import Documentation, { PropDescriptor } from '../Documentation';
import type { ParseOptions } from '../types';
export declare function getRawValueParsedFromFunctionsBlockStatementNode(blockStatementNode: bt.BlockStatement): string | null;
/**
 * Extract props information form an object-style VueJs component
 * @param documentation
 * @param path
 */
export default function propHandler(documentation: Documentation, path: NodePath, ast: bt.File, opt: ParseOptions): Promise<void>;
export declare function describePropsFromValue(documentation: Documentation, propsValuePath: NodePath<bt.ObjectExpression, any> | NodePath<bt.ArrayExpression, any>, ast: bt.File, opt: ParseOptions, modelPropertyName?: string | null): Promise<void>;
/**
 * Deal with the description of the type
 * @param propPropertiesPath
 * @param propDescriptor
 * @returns the unaltered type member of the prop object
 */
export declare function describeType(propPropertiesPath: NodePath<bt.ObjectProperty | bt.ObjectMethod>[], propDescriptor: PropDescriptor): string | undefined;
export declare function getTypeFromTypePath(typePath: NodePath<bt.TSAsExpression | bt.Identifier | bt.ObjectProperty>): {
    name: string;
    func?: boolean;
};
export declare function getValuesFromTypeAnnotation(type: bt.TSType): string[] | undefined;
export declare function describeRequired(propPropertiesPath: NodePath<bt.ObjectProperty | bt.ObjectMethod>[], propDescriptor: PropDescriptor): void;
export declare function describeDefault(propPropertiesPath: NodePath<bt.ObjectProperty | bt.ObjectMethod>[], propDescriptor: PropDescriptor, propType: string): void;
export declare function extractValuesFromTags(propDescriptor: PropDescriptor): void;
