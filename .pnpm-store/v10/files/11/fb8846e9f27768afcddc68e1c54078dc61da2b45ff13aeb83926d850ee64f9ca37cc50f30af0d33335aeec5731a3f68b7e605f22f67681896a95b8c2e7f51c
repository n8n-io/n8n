import { NodePath } from 'ast-types/lib/node-path';
import Documentation, { ParamTag, ParamType, Tag, SlotDescriptor } from '../Documentation';
export interface TypedParamTag extends ParamTag {
    type: ParamType;
}
/**
 * Extract slots information form the render function of an object-style VueJs component
 * @param documentation
 * @param path
 */
export default function slotHandler(documentation: Documentation, path: NodePath): Promise<void>;
type SlotComment = Pick<SlotDescriptor, 'bindings'>;
export declare function getSlotComment(path: NodePath, descriptor: SlotDescriptor): SlotComment | undefined;
export declare function parseSlotDocBlock(str: string, descriptor: SlotDescriptor): {
    bindings: (ParamTag | Tag)[];
} | undefined;
export {};
