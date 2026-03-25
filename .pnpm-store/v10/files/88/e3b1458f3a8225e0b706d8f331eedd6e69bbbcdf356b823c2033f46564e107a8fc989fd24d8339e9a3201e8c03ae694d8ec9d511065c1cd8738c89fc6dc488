export function transformResult<DeltaA extends delta.DeltaBuilder | null, DeltaB extends delta.DeltaBuilder | null>(a: DeltaA, b: DeltaB): TransformResult<DeltaA | null, DeltaB | null>;
export const transformResultEmpty: TransformResult<null, null>;
export type TransformResult<DeltaA extends delta.Delta | null, DeltaB extends delta.Delta | null> = {
    a: DeltaA | null;
    b: DeltaB | null;
};
export type DeltaTransformer<DeltaA extends delta.DeltaAny, DeltaB extends delta.DeltaAny> = (t: {
    a: DeltaA | null;
    b: DeltaB | null;
}) => ({
    a: DeltaA | null;
    b: DeltaB | null;
});
export type Transform<DeltaA extends delta.Delta, DeltaB extends delta.Delta> = {
    applyA: (da: DeltaA) => TransformResult<DeltaA, DeltaB>;
    applyB: (db: DeltaB) => TransformResult<DeltaA, DeltaB>;
};
import * as delta from './delta.js';
//# sourceMappingURL=t3.test.d.ts.map