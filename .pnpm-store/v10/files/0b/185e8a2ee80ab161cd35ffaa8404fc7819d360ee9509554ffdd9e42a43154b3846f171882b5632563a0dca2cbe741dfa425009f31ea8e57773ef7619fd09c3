import { AttributesGroupModel } from '@ts-graphviz/common';
import { EdgeAttributeKey } from '@ts-graphviz/common';
import { EdgeAttributesObject } from '@ts-graphviz/common';
import { EdgeModel } from '@ts-graphviz/common';
import { EdgeTargetTuple } from '@ts-graphviz/common';

/**
 * Base class for DOT objects.
 * @group Models
 */
declare abstract class DotObject {
}

/**
 * DOT object class representing a edge.
 * @group Models
 */
export declare class Edge extends DotObject implements EdgeModel {
    readonly targets: EdgeTargetTuple;
    get $$type(): 'Edge';
    comment?: string;
    readonly attributes: AttributesGroupModel<EdgeAttributeKey>;
    constructor(targets: EdgeTargetTuple, attributes?: EdgeAttributesObject);
}

export { }
