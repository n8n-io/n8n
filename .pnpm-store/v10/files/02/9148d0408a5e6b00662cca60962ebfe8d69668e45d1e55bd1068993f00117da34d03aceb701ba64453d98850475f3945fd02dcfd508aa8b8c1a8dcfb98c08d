import { MultiTargetVectorJoin, Vectors } from '../index.js';
import { Bm25OperatorOptions, Bm25OperatorOr, ListOfVectors, MultiVectorType, NearVectorInputType, PrimitiveVectorType, SingleVectorType, TargetVectorInputType } from './types.js';
export declare class NearVectorInputGuards {
    static is1D(input: NearVectorInputType): input is SingleVectorType;
    static is2D(input: NearVectorInputType): input is MultiVectorType;
    static isObject(input: NearVectorInputType): input is Record<string, PrimitiveVectorType | ListOfVectors<SingleVectorType> | ListOfVectors<MultiVectorType>>;
    static isListOf1D(input: PrimitiveVectorType | ListOfVectors<SingleVectorType> | ListOfVectors<MultiVectorType>): input is ListOfVectors<SingleVectorType>;
    static isListOf2D(input: PrimitiveVectorType | ListOfVectors<SingleVectorType> | ListOfVectors<MultiVectorType>): input is ListOfVectors<MultiVectorType>;
}
export declare class ArrayInputGuards {
    static is1DArray<U, T extends U[]>(input: U | T): input is T;
    static is2DArray<U, T extends U[]>(input: U | T): input is T;
}
export declare class TargetVectorInputGuards {
    static isSingle(input: TargetVectorInputType<Vectors>): input is string;
    static isMulti(input: TargetVectorInputType<Vectors>): input is string[];
    static isMultiJoin(input: TargetVectorInputType<Vectors>): input is MultiTargetVectorJoin<Vectors>;
}
export declare class Bm25Operator {
    static and(): Bm25OperatorOptions;
    static or(opts: Omit<Bm25OperatorOr, 'operator'>): Bm25OperatorOptions;
}
