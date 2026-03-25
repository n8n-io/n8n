import { BatchReference } from '../../openapi/types.js';
import { BatchObject as BatchObjectGRPC } from '../../proto/v1/batch.js';
import { NonReferenceInputs, ReferenceInputs, Vectors } from '../index.js';
export type BatchObjectsReturn<T> = {
    allResponses: (string | ErrorObject<T>)[];
    elapsedSeconds: number;
    errors: Record<number, ErrorObject<T>>;
    hasErrors: boolean;
    uuids: Record<number, string>;
};
export type ErrorObject<T> = {
    code?: number;
    message: string;
    object: BatchObject<T>;
    originalUuid?: string;
};
export type BatchObject<T> = {
    collection: string;
    properties?: NonReferenceInputs<T>;
    references?: ReferenceInputs<T>;
    id?: string;
    vectors?: number[] | Vectors;
    tenant?: string;
};
export type BatchObjects<T> = {
    batch: BatchObject<T>[];
    mapped: BatchObjectGRPC[];
};
export type ErrorReference = {
    message: string;
    reference: BatchReference;
};
export type BatchReferencesReturn = {
    elapsedSeconds: number;
    errors: Record<number, ErrorReference>;
    hasErrors: boolean;
};
