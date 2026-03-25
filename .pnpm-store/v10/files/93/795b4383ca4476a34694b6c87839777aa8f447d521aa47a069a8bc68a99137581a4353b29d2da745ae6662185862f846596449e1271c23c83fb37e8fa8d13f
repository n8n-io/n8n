import { TargetVector } from '../query/types.js';
/** The allowed combination methods for multi-target vector joins */
export type MultiTargetVectorJoinCombination = 'sum' | 'average' | 'minimum' | 'relative-score' | 'manual-weights';
/** Weights for each target vector in a multi-target vector join */
export type MultiTargetVectorWeights<V> = Partial<Record<TargetVector<V>, number | number[]>>;
/** A multi-target vector join used when specifying a vector-based query */
export type MultiTargetVectorJoin<V> = {
    /** The combination method to use for the target vectors */
    combination: MultiTargetVectorJoinCombination;
    /** The target vectors to combine */
    targetVectors: TargetVector<V>[];
    /** The weights to use for each target vector */
    weights?: MultiTargetVectorWeights<V>;
};
declare const _default: <V>() => {
    sum: <T extends TargetVector<V>[]>(targetVectors: T) => MultiTargetVectorJoin<V>;
    average: <T_1 extends TargetVector<V>[]>(targetVectors: T_1) => MultiTargetVectorJoin<V>;
    minimum: <T_2 extends TargetVector<V>[]>(targetVectors: T_2) => MultiTargetVectorJoin<V>;
    relativeScore: <T_3 extends TargetVector<V>[]>(weights: Partial<Record<TargetVector<V>, number | number[]>>) => MultiTargetVectorJoin<V>;
    manualWeights: <T_4 extends TargetVector<V>[]>(weights: Partial<Record<TargetVector<V>, number | number[]>>) => MultiTargetVectorJoin<V>;
};
export default _default;
export interface MultiTargetVector<V> {
    /** Create a multi-target vector join that sums the vector scores over the target vectors */
    sum: <T extends TargetVector<V>[]>(targetVectors: T) => MultiTargetVectorJoin<V>;
    /** Create a multi-target vector join that averages the vector scores over the target vectors */
    average: <T extends TargetVector<V>[]>(targetVectors: T) => MultiTargetVectorJoin<V>;
    /** Create a multi-target vector join that takes the minimum vector score over the target vectors */
    minimum: <T extends TargetVector<V>[]>(targetVectors: T) => MultiTargetVectorJoin<V>;
    /** Create a multi-target vector join that uses relative weights for each target vector */
    relativeScore: <T extends TargetVector<V>[]>(weights: MultiTargetVectorWeights<V>) => MultiTargetVectorJoin<V>;
    /** Create a multi-target vector join that uses manual weights for each target vector */
    manualWeights: <T extends TargetVector<V>[]>(weights: MultiTargetVectorWeights<V>) => MultiTargetVectorJoin<V>;
}
