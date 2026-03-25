import { Attribute } from '@ts-graphviz/common';
import { AttributeKey } from '@ts-graphviz/common';
import { Attributes } from '@ts-graphviz/common';
import { AttributesEntities } from '@ts-graphviz/common';
import { AttributesGroupModel } from '@ts-graphviz/common';
import { AttributesObject } from '@ts-graphviz/common';
import { ForwardRefNode } from '@ts-graphviz/common';
import { NodeAttributeKey } from '@ts-graphviz/common';
import { NodeAttributesObject } from '@ts-graphviz/common';
import { NodeModel } from '@ts-graphviz/common';
import { Port } from '@ts-graphviz/common';

/**
 * Base class for DOT objects with attributes.
 * @group Models
 */
declare abstract class AttributesBase<T extends AttributeKey> extends DotObject_2 implements Attributes<T> {
    #private;
    constructor(attributes?: AttributesObject<T>);
    get values(): ReadonlyArray<[T, Attribute<T>]>;
    get size(): number;
    get<K extends T>(key: K): Attribute<K> | undefined;
    set<K extends T>(key: K, value: Attribute<K>): void;
    delete(key: T): void;
    apply(attributes: AttributesObject<T> | AttributesEntities<T>): void;
    clear(): void;
}

/**
 * A set of attribute values for any object.
 * @group Models
 */
declare class AttributesGroup<T extends AttributeKey = AttributeKey> extends AttributesBase<T> implements AttributesGroupModel<T> {
    comment?: string;
}

/**
 * Base class for DOT objects.
 * @group Models
 */
declare abstract class DotObject {
}

/**
 * Base class for DOT objects.
 * @group Models
 */
declare abstract class DotObject_2 {
}

/**
 * DOT object class representing a node.
 * @group Models
 */
export declare class Node extends DotObject implements NodeModel {
    readonly id: string;
    get $$type(): 'Node';
    comment?: string;
    readonly attributes: AttributesGroup<NodeAttributeKey>;
    constructor(id: string, attributes?: NodeAttributesObject);
    port(port: string | Partial<Port>): ForwardRefNode;
}

export { }
