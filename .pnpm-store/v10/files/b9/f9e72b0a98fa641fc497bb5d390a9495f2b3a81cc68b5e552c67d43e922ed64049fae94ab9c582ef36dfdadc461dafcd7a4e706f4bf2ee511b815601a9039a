export type FloatVector = number[];
export type Float16Vector = number[] | Uint8Array;
export type BFloat16Vector = number[] | Uint8Array;
export type BinaryVector = number[];
export type SparseVectorArray = (number | undefined)[];
export type SparseVectorDic = {
    [key: string]: number;
};
export type SparseVectorCSR = {
    indices: number[];
    values: number[];
};
export type Int8Vector = number[] | Int8Array;
export type SparseVectorCOO = {
    index: number;
    value: number;
}[];
export type SparseFloatVector = SparseVectorArray | SparseVectorDic | SparseVectorCSR | SparseVectorCOO;
export type VectorTypes = FloatVector | Float16Vector | BinaryVector | BFloat16Vector | SparseFloatVector | Int8Vector;
export type Bool = boolean;
export type Int8 = number;
export type Int16 = number;
export type Int32 = number;
export type Int64 = number;
export type Float = number;
export type Double = number;
export type VarChar = string;
export type JSON = {
    [key: string]: any;
};
export type Geometry = string;
export type Timestamptz = string;
export type Struct = {
    [key: string]: Bool | Int8 | Int16 | Int32 | Int64 | Float | Double | VarChar | JSON | Geometry | Timestamptz | VectorTypes;
};
export type Array = Int8[] | Int16[] | Int32[] | Int64[] | Float[] | Double[] | VarChar[] | Timestamptz[] | Struct[];
