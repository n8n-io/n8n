import type { DocBlockTag } from '../nodes/DocBlockTag';
import { type TSDocTagDefinition } from '../configuration/TSDocTagDefinition';
/**
 * Represents a set of modifier tags that were extracted from a doc comment.
 *
 * @remarks
 * TSDoc modifier tags are block tags that do not have any associated rich text content.
 * Instead, their presence or absence acts as an on/off switch, indicating some aspect
 * of the underlying API item.  For example, the `@internal` modifier indicates that a
 * signature is internal (i.e. not part of the public API contract).
 */
export declare class ModifierTagSet {
    private readonly _nodes;
    private readonly _nodesByName;
    /**
     * The original block tag nodes that defined the modifiers in this set, excluding duplicates.
     */
    get nodes(): ReadonlyArray<DocBlockTag>;
    /**
     * Returns true if the set contains a DocBlockTag with the specified tag name.
     * Note that synonyms are not considered.  The comparison is case-insensitive.
     * @param modifierTagName - The name of the tag, including the `@` prefix  For example, `@internal`
     */
    hasTagName(modifierTagName: string): boolean;
    /**
     * Returns true if the set contains a DocBlockTag matching the specified tag definition.
     * Note that synonyms are not considered.  The comparison is case-insensitive.
     * The TSDocTagDefinition must be a modifier tag.
     * @param tagName - The name of the tag, including the `@` prefix  For example, `@internal`
     */
    hasTag(modifierTagDefinition: TSDocTagDefinition): boolean;
    /**
     * Returns a DocBlockTag matching the specified tag definition, or undefined if no such
     * tag was added to the set.  If there were multiple instances, returned object will be
     * the first one to be added.
     */
    tryGetTag(modifierTagDefinition: TSDocTagDefinition): DocBlockTag | undefined;
    /**
     * Adds a new modifier tag to the set.  If a tag already exists with the same name,
     * then no change is made, and the return value is false.
     */
    addTag(blockTag: DocBlockTag): boolean;
}
//# sourceMappingURL=ModifierTagSet.d.ts.map