import type { DocNode } from '../nodes/DocNode';
export type DocNodeConstructor = new (...args: any[]) => DocNode;
export interface IDocNodeDefinition {
    docNodeKind: string;
    constructor: DocNodeConstructor;
}
/**
 * Part of the {@link TSDocConfiguration} object.
 *
 * @remarks
 * If you define your own custom subclasses of `DocNode`, they must be registered with the `DocNodeManager`.
 * Use {@link DocNodeManager.registerAllowableChildren} to specify which {@link DocNodeContainer} subclasses
 * are allowed to contain your nodes.
 */
export declare class DocNodeManager {
    private static readonly _nodeKindRegExp;
    private readonly _docNodeDefinitionsByKind;
    private readonly _docNodeDefinitionsByConstructor;
    /**
     * Registers a list of {@link IDocNodeDefinition} objects to be used with the associated
     * {@link TSDocConfiguration} object.
     */
    registerDocNodes(packageName: string, definitions: ReadonlyArray<IDocNodeDefinition>): void;
    /**
     * Reports an error if the specified DocNode kind has not been registered.
     */
    throwIfNotRegisteredKind(docNodeKind: string): void;
    /**
     * For the given parent DocNode kind, registers the specified DocNode kinds as being allowable children of
     * the parent.
     *
     * @remarks
     * To prevent mistakes, `DocNodeContainer` will report an error if you try to add node that was not registered
     * as an allowable child of the container.
     */
    registerAllowableChildren(parentKind: string, childKinds: ReadonlyArray<string>): void;
    /**
     * Returns true if the specified DocNode kind has been registered as an allowable child of the specified
     * parent DocNode kind.
     */
    isAllowedChild(parentKind: string, childKind: string): boolean;
    private _getDefinition;
}
//# sourceMappingURL=DocNodeManager.d.ts.map