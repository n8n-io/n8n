import { MuveraEncodingConfigCreate, UncompressedConfigCreate } from '../index.js';
import { BQConfigCreate, BQConfigUpdate, PQConfigCreate, PQConfigUpdate, RQConfigCreate, RQConfigUpdate, SQConfigCreate, SQConfigUpdate, VectorIndexConfigDynamicCreate, VectorIndexConfigFlatCreate, VectorIndexConfigHNSWCreate } from './types/index.js';
type QuantizerConfig = PQConfigCreate | PQConfigUpdate | BQConfigCreate | BQConfigUpdate | SQConfigCreate | SQConfigUpdate | RQConfigCreate | RQConfigUpdate | Record<string, any>;
export declare class QuantizerGuards {
    static isPQCreate(config?: QuantizerConfig): config is PQConfigCreate;
    static isPQUpdate(config?: QuantizerConfig): config is PQConfigUpdate;
    static isBQCreate(config?: QuantizerConfig): config is BQConfigCreate;
    static isBQUpdate(config?: QuantizerConfig): config is BQConfigUpdate;
    static isSQCreate(config?: QuantizerConfig): config is SQConfigCreate;
    static isSQUpdate(config?: QuantizerConfig): config is SQConfigUpdate;
    static isRQCreate(config?: QuantizerConfig): config is RQConfigCreate;
    static isRQUpdate(config?: QuantizerConfig): config is RQConfigUpdate;
    static isUncompressedCreate(config?: QuantizerConfig): config is UncompressedConfigCreate;
}
type VectorIndexConfigCreate = VectorIndexConfigHNSWCreate | VectorIndexConfigFlatCreate | VectorIndexConfigDynamicCreate | Record<string, any>;
export declare class VectorIndexGuards {
    static isHNSW(config?: VectorIndexConfigCreate): config is VectorIndexConfigHNSWCreate;
    static isFlat(config?: VectorIndexConfigCreate): config is VectorIndexConfigFlatCreate;
    static isDynamic(config?: VectorIndexConfigCreate): config is VectorIndexConfigDynamicCreate;
}
export declare class MultiVectorEncodingGuards {
    static isMuvera(config?: Record<string, any>): config is MuveraEncodingConfigCreate;
}
export declare function parseWithDefault<D>(value: D | undefined, defaultValue: D): D;
export {};
