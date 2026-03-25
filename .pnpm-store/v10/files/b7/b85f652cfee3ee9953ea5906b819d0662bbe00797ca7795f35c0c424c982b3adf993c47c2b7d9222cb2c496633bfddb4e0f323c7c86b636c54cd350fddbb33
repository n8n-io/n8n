import * as bt from '@babel/types';
import { NodePath } from 'ast-types/lib/node-path';
import Documentation, { DocBlockTags, EventDescriptor, ParamTag, ParamType } from '../Documentation';
export interface TypedParamTag extends ParamTag {
    type: ParamType;
}
/**
 * Extracts events information from a VueJs component
 * wether it's a class based component or an option based one
 *
 * @param documentation
 * @param path
 * @param astPath
 */
export default function eventHandler(documentation: Documentation, path: NodePath, astPath: bt.File): Promise<void>;
/**
 * Extracts events information from an
 * object-style VueJs component `emits` option
 *
 * @param documentation
 * @param path
 */
export declare function eventHandlerEmits(documentation: Documentation, path: NodePath): void;
/**
 * Extracts events information from an
 * object-style VueJs component `methods` option
 *
 * @param documentation
 * @param path
 */
export declare function eventHandlerMethods(documentation: Documentation, path: NodePath): void;
export declare function setEventDescriptor(eventDescriptor: EventDescriptor, jsDoc: DocBlockTags): EventDescriptor;
