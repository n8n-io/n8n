import { Properties, WeaviateNonGenericObject } from '../types/index.js';
import { ReferenceManager } from './classes.js';
export type CrossReference<TProperties extends Properties> = ReferenceManager<TProperties>;
export type CrossReferenceDefault = {
    objects: WeaviateNonGenericObject[];
};
export type CrossReferences<TProperties extends Properties[]> = ReferenceManager<UnionOf<TProperties>>;
export type UnionOf<T> = T extends (infer U)[] ? U : never;
export type Beacon = {
    beacon: string;
};
