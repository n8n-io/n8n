import { WeaviateClient } from '../v2/index.js';
export declare const PIZZA_CLASS_NAME = "Pizza";
export declare const SOUP_CLASS_NAME = "Soup";
export declare function createTestFoodSchema(client: WeaviateClient): Promise<[{
    class?: string | undefined;
    vectorConfig?: {
        [key: string]: {
            vectorizer?: {
                [key: string]: unknown;
            } | undefined;
            vectorIndexType?: string | undefined;
            vectorIndexConfig?: {
                [key: string]: unknown;
            } | undefined;
        };
    } | undefined;
    vectorIndexType?: string | undefined;
    vectorIndexConfig?: {
        [key: string]: unknown;
    } | undefined;
    shardingConfig?: {
        [key: string]: unknown;
    } | undefined;
    replicationConfig?: {
        factor?: number | undefined;
        asyncEnabled?: boolean | undefined;
        deletionStrategy?: "NoAutomatedResolution" | "DeleteOnConflict" | "TimeBasedResolution" | undefined;
    } | undefined;
    invertedIndexConfig?: {
        cleanupIntervalSeconds?: number | undefined;
        bm25?: {
            k1?: number | undefined;
            b?: number | undefined;
        } | undefined;
        stopwords?: {
            preset?: string | undefined;
            additions?: string[] | undefined;
            removals?: string[] | undefined;
        } | undefined;
        indexTimestamps?: boolean | undefined;
        indexNullState?: boolean | undefined;
        indexPropertyLength?: boolean | undefined;
        usingBlockMaxWAND?: boolean | undefined;
    } | undefined;
    multiTenancyConfig?: {
        enabled?: boolean | undefined;
        autoTenantCreation?: boolean | undefined;
        autoTenantActivation?: boolean | undefined;
    } | undefined;
    vectorizer?: string | undefined;
    moduleConfig?: {
        [key: string]: unknown;
    } | undefined;
    description?: string | undefined;
    properties?: {
        dataType?: string[] | undefined;
        description?: string | undefined;
        moduleConfig?: {
            [key: string]: unknown;
        } | undefined;
        name?: string | undefined;
        indexInverted?: boolean | undefined;
        indexFilterable?: boolean | undefined;
        indexSearchable?: boolean | undefined;
        indexRangeFilters?: boolean | undefined;
        tokenization?: "word" | "lowercase" | "whitespace" | "field" | "trigram" | "gse" | "kagome_kr" | "kagome_ja" | "gse_ch" | undefined;
        nestedProperties?: {
            dataType?: string[] | undefined;
            description?: string | undefined;
            name?: string | undefined;
            indexFilterable?: boolean | undefined;
            indexSearchable?: boolean | undefined;
            indexRangeFilters?: boolean | undefined;
            tokenization?: "word" | "lowercase" | "whitespace" | "field" | "trigram" | "gse" | "kagome_kr" | "kagome_ja" | "gse_ch" | undefined;
            nestedProperties?: any[] | undefined;
        }[] | undefined;
    }[] | undefined;
}, {
    class?: string | undefined;
    vectorConfig?: {
        [key: string]: {
            vectorizer?: {
                [key: string]: unknown;
            } | undefined;
            vectorIndexType?: string | undefined;
            vectorIndexConfig?: {
                [key: string]: unknown;
            } | undefined;
        };
    } | undefined;
    vectorIndexType?: string | undefined;
    vectorIndexConfig?: {
        [key: string]: unknown;
    } | undefined;
    shardingConfig?: {
        [key: string]: unknown;
    } | undefined;
    replicationConfig?: {
        factor?: number | undefined;
        asyncEnabled?: boolean | undefined;
        deletionStrategy?: "NoAutomatedResolution" | "DeleteOnConflict" | "TimeBasedResolution" | undefined;
    } | undefined;
    invertedIndexConfig?: {
        cleanupIntervalSeconds?: number | undefined;
        bm25?: {
            k1?: number | undefined;
            b?: number | undefined;
        } | undefined;
        stopwords?: {
            preset?: string | undefined;
            additions?: string[] | undefined;
            removals?: string[] | undefined;
        } | undefined;
        indexTimestamps?: boolean | undefined;
        indexNullState?: boolean | undefined;
        indexPropertyLength?: boolean | undefined;
        usingBlockMaxWAND?: boolean | undefined;
    } | undefined;
    multiTenancyConfig?: {
        enabled?: boolean | undefined;
        autoTenantCreation?: boolean | undefined;
        autoTenantActivation?: boolean | undefined;
    } | undefined;
    vectorizer?: string | undefined;
    moduleConfig?: {
        [key: string]: unknown;
    } | undefined;
    description?: string | undefined;
    properties?: {
        dataType?: string[] | undefined;
        description?: string | undefined;
        moduleConfig?: {
            [key: string]: unknown;
        } | undefined;
        name?: string | undefined;
        indexInverted?: boolean | undefined;
        indexFilterable?: boolean | undefined;
        indexSearchable?: boolean | undefined;
        indexRangeFilters?: boolean | undefined;
        tokenization?: "word" | "lowercase" | "whitespace" | "field" | "trigram" | "gse" | "kagome_kr" | "kagome_ja" | "gse_ch" | undefined;
        nestedProperties?: {
            dataType?: string[] | undefined;
            description?: string | undefined;
            name?: string | undefined;
            indexFilterable?: boolean | undefined;
            indexSearchable?: boolean | undefined;
            indexRangeFilters?: boolean | undefined;
            tokenization?: "word" | "lowercase" | "whitespace" | "field" | "trigram" | "gse" | "kagome_kr" | "kagome_ja" | "gse_ch" | undefined;
            nestedProperties?: any[] | undefined;
        }[] | undefined;
    }[] | undefined;
}]>;
export declare function createTestFoodData(client: WeaviateClient): Promise<({
    class?: string | undefined;
    vectorWeights?: {
        [key: string]: unknown;
    } | undefined;
    properties?: {
        [key: string]: unknown;
    } | undefined;
    id?: string | undefined;
    creationTimeUnix?: number | undefined;
    lastUpdateTimeUnix?: number | undefined;
    vector?: number[] | undefined;
    vectors?: {
        [key: string]: {
            [key: string]: unknown;
        };
    } | undefined;
    tenant?: string | undefined;
    additional?: {
        [key: string]: {
            [key: string]: unknown;
        };
    } | undefined;
} & {
    deprecations?: {
        id?: string | undefined;
        status?: string | undefined;
        apiType?: string | undefined;
        msg?: string | undefined;
        mitigation?: string | undefined;
        sinceVersion?: string | undefined;
        plannedRemovalVersion?: string | undefined;
        removedIn?: string | undefined;
        removedTime?: string | undefined;
        sinceTime?: string | undefined;
        locations?: string[] | undefined;
    }[] | undefined;
} & {
    result?: {
        status?: "SUCCESS" | "FAILED" | undefined;
        errors?: {
            error?: {
                message?: string | undefined;
            }[] | undefined;
        } | undefined;
    } | undefined;
})[]>;
export declare function createTestFoodSchemaAndData(client: WeaviateClient): Promise<({
    class?: string | undefined;
    vectorWeights?: {
        [key: string]: unknown;
    } | undefined;
    properties?: {
        [key: string]: unknown;
    } | undefined;
    id?: string | undefined;
    creationTimeUnix?: number | undefined;
    lastUpdateTimeUnix?: number | undefined;
    vector?: number[] | undefined;
    vectors?: {
        [key: string]: {
            [key: string]: unknown;
        };
    } | undefined;
    tenant?: string | undefined;
    additional?: {
        [key: string]: {
            [key: string]: unknown;
        };
    } | undefined;
} & {
    deprecations?: {
        id?: string | undefined;
        status?: string | undefined;
        apiType?: string | undefined;
        msg?: string | undefined;
        mitigation?: string | undefined;
        sinceVersion?: string | undefined;
        plannedRemovalVersion?: string | undefined;
        removedIn?: string | undefined;
        removedTime?: string | undefined;
        sinceTime?: string | undefined;
        locations?: string[] | undefined;
    }[] | undefined;
} & {
    result?: {
        status?: "SUCCESS" | "FAILED" | undefined;
        errors?: {
            error?: {
                message?: string | undefined;
            }[] | undefined;
        } | undefined;
    } | undefined;
})[]>;
export declare function cleanupTestFood(client: WeaviateClient): Promise<[void, void]>;
