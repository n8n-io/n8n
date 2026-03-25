import { DataType } from './';
export declare const DEFAULT_HIGH_LEVEL_SCHEMA: (dimension: number) => ({
    name: string;
    data_type: DataType;
    is_primary_key: boolean;
    autoID: boolean;
    dim?: undefined;
} | {
    name: string;
    data_type: DataType;
    dim: number;
    is_primary_key?: undefined;
    autoID?: undefined;
})[];
export declare const DEFAULT_HIGH_LEVEL_INDEX_PARAMS: (field_name: string) => {
    field_name: string;
    index_type: string;
    metric_type: string;
    params: {
        efConstruction: number;
        M: number;
    };
};
