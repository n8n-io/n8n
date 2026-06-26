import { getMetadataArgsStorage } from '../../globals';
import { TreeMetadataArgs } from '../../metadata-args/TreeMetadataArgs';
import { TreeType } from '../../metadata/types/TreeTypes';
import { ClosureTreeOptions } from '../../metadata/types/ClosureTreeOptions';

/**
 * Marks entity to work like a tree.
 * Tree pattern that will be used for the tree entity should be specified.
 * @TreeParent decorator must be used in tree entities.
 * TreeRepository can be used to manipulate with tree entities.
 */
export function Tree(type: TreeType, options?: ClosureTreeOptions): ClassDecorator {
	return function (target: Function) {
		getMetadataArgsStorage().trees.push({
			target: target,
			type: type,
			options: type === 'closure-table' ? options : undefined,
		} as TreeMetadataArgs);
	};
}
