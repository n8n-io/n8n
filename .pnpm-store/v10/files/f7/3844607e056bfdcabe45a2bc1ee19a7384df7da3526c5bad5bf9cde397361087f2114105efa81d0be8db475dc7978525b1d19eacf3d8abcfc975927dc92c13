import { Attribute } from '@ts-graphviz/common';
import { AttributeKey } from '@ts-graphviz/common';
import { AttributeListKind } from '@ts-graphviz/common';
import { AttributeListModel } from '@ts-graphviz/common';
import { Attributes } from '@ts-graphviz/common';
import { AttributesEntities } from '@ts-graphviz/common';
import { AttributesObject } from '@ts-graphviz/common';

/**
 * A set of attribute values for any object.
 * @group Models
 */
export declare class AttributeList<K extends AttributeListKind, T extends AttributeKey = AttributeKey> extends AttributesBase<T> implements AttributeListModel<K, T> {
    readonly $$kind: K;
    get $$type(): 'AttributeList';
    comment?: string;
    constructor($$kind: K, attributes?: AttributesObject<T>);
}

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
 * Base class for DOT objects.
 * @group Models
 */
declare abstract class DotObject {
}

export { }
