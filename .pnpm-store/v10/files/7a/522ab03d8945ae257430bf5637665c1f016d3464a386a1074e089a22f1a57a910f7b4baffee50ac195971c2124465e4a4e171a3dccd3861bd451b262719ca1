import { Attribute } from '@ts-graphviz/common';
import { AttributeKey } from '@ts-graphviz/common';
import { Attributes } from '@ts-graphviz/common';
import { AttributesEntities } from '@ts-graphviz/common';
import { AttributesGroupModel } from '@ts-graphviz/common';
import { AttributesObject } from '@ts-graphviz/common';

/**
 * Base class for DOT objects with attributes.
 * @group Models
 */
declare abstract class AttributesBase<T extends AttributeKey> extends DotObject implements Attributes<T> {
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
export declare class AttributesGroup<T extends AttributeKey = AttributeKey> extends AttributesBase<T> implements AttributesGroupModel<T> {
    comment?: string;
}

/**
 * Base class for DOT objects.
 * @group Models
 */
declare abstract class DotObject {
}

export { }
