import { type CallContext, type CallOptions } from "nice-grpc-common";
import { AggregateReply, AggregateRequest } from "./aggregate.js";
import { BatchObjectsReply, BatchObjectsRequest, BatchReferencesReply, BatchReferencesRequest, BatchSendReply, BatchSendRequest, BatchStreamMessage, BatchStreamRequest } from "./batch.js";
import { BatchDeleteReply, BatchDeleteRequest } from "./batch_delete.js";
import { SearchReply, SearchRequest } from "./search_get.js";
import { TenantsGetReply, TenantsGetRequest } from "./tenants.js";
export declare const protobufPackage = "weaviate.v1";
export type WeaviateDefinition = typeof WeaviateDefinition;
export declare const WeaviateDefinition: {
    readonly name: "Weaviate";
    readonly fullName: "weaviate.v1.Weaviate";
    readonly methods: {
        readonly search: {
            readonly name: "Search";
            readonly requestType: {
                encode(message: SearchRequest, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): SearchRequest;
                fromJSON(object: any): SearchRequest;
                toJSON(message: SearchRequest): unknown;
                create(base?: {
                    collection?: string | undefined;
                    tenant?: string | undefined;
                    consistencyLevel?: import("./base.js").ConsistencyLevel | undefined;
                    properties?: {
                        nonRefProperties?: string[] | undefined;
                        refProperties?: {
                            referenceProperty?: string | undefined;
                            properties?: any | undefined;
                            metadata?: {
                                uuid?: boolean | undefined;
                                vector?: boolean | undefined;
                                creationTimeUnix?: boolean | undefined;
                                lastUpdateTimeUnix?: boolean | undefined;
                                distance?: boolean | undefined;
                                certainty?: boolean | undefined;
                                score?: boolean | undefined;
                                explainScore?: boolean | undefined;
                                isConsistent?: boolean | undefined;
                                vectors?: string[] | undefined;
                            } | undefined;
                            targetCollection?: string | undefined;
                        }[] | undefined;
                        objectProperties?: {
                            propName?: string | undefined;
                            primitiveProperties?: string[] | undefined;
                            objectProperties?: any[] | undefined;
                        }[] | undefined;
                        returnAllNonrefProperties?: boolean | undefined;
                    } | undefined;
                    metadata?: {
                        uuid?: boolean | undefined;
                        vector?: boolean | undefined;
                        creationTimeUnix?: boolean | undefined;
                        lastUpdateTimeUnix?: boolean | undefined;
                        distance?: boolean | undefined;
                        certainty?: boolean | undefined;
                        score?: boolean | undefined;
                        explainScore?: boolean | undefined;
                        isConsistent?: boolean | undefined;
                        vectors?: string[] | undefined;
                    } | undefined;
                    groupBy?: {
                        path?: string[] | undefined;
                        numberOfGroups?: number | undefined;
                        objectsPerGroup?: number | undefined;
                    } | undefined;
                    limit?: number | undefined;
                    offset?: number | undefined;
                    autocut?: number | undefined;
                    after?: string | undefined;
                    sortBy?: {
                        ascending?: boolean | undefined;
                        path?: string[] | undefined;
                    }[] | undefined;
                    filters?: {
                        operator?: import("./base.js").Filters_Operator | undefined;
                        on?: string[] | undefined;
                        filters?: any[] | undefined;
                        valueText?: string | undefined;
                        valueInt?: number | undefined;
                        valueBoolean?: boolean | undefined;
                        valueNumber?: number | undefined;
                        valueTextArray?: {
                            values?: string[] | undefined;
                        } | undefined;
                        valueIntArray?: {
                            values?: number[] | undefined;
                        } | undefined;
                        valueBooleanArray?: {
                            values?: boolean[] | undefined;
                        } | undefined;
                        valueNumberArray?: {
                            values?: number[] | undefined;
                        } | undefined;
                        valueGeo?: {
                            latitude?: number | undefined;
                            longitude?: number | undefined;
                            distance?: number | undefined;
                        } | undefined;
                        target?: {
                            property?: string | undefined;
                            singleTarget?: {
                                on?: string | undefined;
                                target?: any | undefined;
                            } | undefined;
                            multiTarget?: {
                                on?: string | undefined;
                                target?: any | undefined;
                                targetCollection?: string | undefined;
                            } | undefined;
                            count?: {
                                on?: string | undefined;
                            } | undefined;
                        } | undefined;
                    } | undefined;
                    hybridSearch?: {
                        query?: string | undefined;
                        properties?: string[] | undefined;
                        vector?: number[] | undefined;
                        alpha?: number | undefined;
                        fusionType?: import("./base_search.js").Hybrid_FusionType | undefined;
                        vectorBytes?: Uint8Array | undefined;
                        targetVectors?: string[] | undefined;
                        nearText?: {
                            query?: string[] | undefined;
                            certainty?: number | undefined;
                            distance?: number | undefined;
                            moveTo?: {
                                force?: number | undefined;
                                concepts?: string[] | undefined;
                                uuids?: string[] | undefined;
                            } | undefined;
                            moveAway?: {
                                force?: number | undefined;
                                concepts?: string[] | undefined;
                                uuids?: string[] | undefined;
                            } | undefined;
                            targetVectors?: string[] | undefined;
                            targets?: {
                                targetVectors?: string[] | undefined;
                                combination?: import("./base_search.js").CombinationMethod | undefined;
                                weightsForTargets?: {
                                    target?: string | undefined;
                                    weight?: number | undefined;
                                }[] | undefined;
                            } | undefined;
                        } | undefined;
                        nearVector?: {
                            vector?: number[] | undefined;
                            certainty?: number | undefined;
                            distance?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            targetVectors?: string[] | undefined;
                            targets?: {
                                targetVectors?: string[] | undefined;
                                combination?: import("./base_search.js").CombinationMethod | undefined;
                                weightsForTargets?: {
                                    target?: string | undefined;
                                    weight?: number | undefined;
                                }[] | undefined;
                            } | undefined;
                            vectorPerTarget?: {
                                [x: string]: Uint8Array | undefined;
                            } | undefined;
                            vectorForTargets?: {
                                name?: string | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                vectors?: {
                                    name?: string | undefined;
                                    index?: number | undefined;
                                    vectorBytes?: Uint8Array | undefined;
                                    type?: import("./base.js").Vectors_VectorType | undefined;
                                }[] | undefined;
                            }[] | undefined;
                            vectors?: {
                                name?: string | undefined;
                                index?: number | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                type?: import("./base.js").Vectors_VectorType | undefined;
                            }[] | undefined;
                        } | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                        bm25SearchOperator?: {
                            operator?: import("./base_search.js").SearchOperatorOptions_Operator | undefined;
                            minimumOrTokensMatch?: number | undefined;
                        } | undefined;
                        vectorDistance?: number | undefined;
                        vectors?: {
                            name?: string | undefined;
                            index?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            type?: import("./base.js").Vectors_VectorType | undefined;
                        }[] | undefined;
                    } | undefined;
                    bm25Search?: {
                        query?: string | undefined;
                        properties?: string[] | undefined;
                        searchOperator?: {
                            operator?: import("./base_search.js").SearchOperatorOptions_Operator | undefined;
                            minimumOrTokensMatch?: number | undefined;
                        } | undefined;
                    } | undefined;
                    nearVector?: {
                        vector?: number[] | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        vectorBytes?: Uint8Array | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                        vectorPerTarget?: {
                            [x: string]: Uint8Array | undefined;
                        } | undefined;
                        vectorForTargets?: {
                            name?: string | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            vectors?: {
                                name?: string | undefined;
                                index?: number | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                type?: import("./base.js").Vectors_VectorType | undefined;
                            }[] | undefined;
                        }[] | undefined;
                        vectors?: {
                            name?: string | undefined;
                            index?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            type?: import("./base.js").Vectors_VectorType | undefined;
                        }[] | undefined;
                    } | undefined;
                    nearObject?: {
                        id?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearText?: {
                        query?: string[] | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        moveTo?: {
                            force?: number | undefined;
                            concepts?: string[] | undefined;
                            uuids?: string[] | undefined;
                        } | undefined;
                        moveAway?: {
                            force?: number | undefined;
                            concepts?: string[] | undefined;
                            uuids?: string[] | undefined;
                        } | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearImage?: {
                        image?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearAudio?: {
                        audio?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearVideo?: {
                        video?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearDepth?: {
                        depth?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearThermal?: {
                        thermal?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearImu?: {
                        imu?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    generative?: {
                        singleResponsePrompt?: string | undefined;
                        groupedResponseTask?: string | undefined;
                        groupedProperties?: string[] | undefined;
                        single?: {
                            prompt?: string | undefined;
                            debug?: boolean | undefined;
                            queries?: {
                                returnMetadata?: boolean | undefined;
                                anthropic?: {
                                    baseUrl?: string | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topK?: number | undefined;
                                    topP?: number | undefined;
                                    stopSequences?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                anyscale?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                } | undefined;
                                aws?: {
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    service?: string | undefined;
                                    region?: string | undefined;
                                    endpoint?: string | undefined;
                                    targetModel?: string | undefined;
                                    targetVariant?: string | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    maxTokens?: number | undefined;
                                } | undefined;
                                cohere?: {
                                    baseUrl?: string | undefined;
                                    frequencyPenalty?: number | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    k?: number | undefined;
                                    p?: number | undefined;
                                    presencePenalty?: number | undefined;
                                    stopSequences?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    temperature?: number | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                dummy?: {} | undefined;
                                mistral?: {
                                    baseUrl?: string | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                } | undefined;
                                ollama?: {
                                    apiEndpoint?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                openai?: {
                                    frequencyPenalty?: number | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    n?: number | undefined;
                                    presencePenalty?: number | undefined;
                                    stop?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                    baseUrl?: string | undefined;
                                    apiVersion?: string | undefined;
                                    resourceName?: string | undefined;
                                    deploymentId?: string | undefined;
                                    isAzure?: boolean | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    reasoningEffort?: import("./generative.js").GenerativeOpenAI_ReasoningEffort | undefined;
                                    verbosity?: import("./generative.js").GenerativeOpenAI_Verbosity | undefined;
                                } | undefined;
                                google?: {
                                    frequencyPenalty?: number | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    presencePenalty?: number | undefined;
                                    temperature?: number | undefined;
                                    topK?: number | undefined;
                                    topP?: number | undefined;
                                    stopSequences?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    apiEndpoint?: string | undefined;
                                    projectId?: string | undefined;
                                    endpointId?: string | undefined;
                                    region?: string | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                databricks?: {
                                    endpoint?: string | undefined;
                                    model?: string | undefined;
                                    frequencyPenalty?: number | undefined;
                                    logProbs?: boolean | undefined;
                                    topLogProbs?: number | undefined;
                                    maxTokens?: number | undefined;
                                    n?: number | undefined;
                                    presencePenalty?: number | undefined;
                                    stop?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                } | undefined;
                                friendliai?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    maxTokens?: number | undefined;
                                    temperature?: number | undefined;
                                    n?: number | undefined;
                                    topP?: number | undefined;
                                } | undefined;
                                nvidia?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                    maxTokens?: number | undefined;
                                } | undefined;
                                xai?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                    maxTokens?: number | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                            }[] | undefined;
                        } | undefined;
                        grouped?: {
                            task?: string | undefined;
                            properties?: {
                                values?: string[] | undefined;
                            } | undefined;
                            queries?: {
                                returnMetadata?: boolean | undefined;
                                anthropic?: {
                                    baseUrl?: string | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topK?: number | undefined;
                                    topP?: number | undefined;
                                    stopSequences?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                anyscale?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                } | undefined;
                                aws?: {
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    service?: string | undefined;
                                    region?: string | undefined;
                                    endpoint?: string | undefined;
                                    targetModel?: string | undefined;
                                    targetVariant?: string | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    maxTokens?: number | undefined;
                                } | undefined;
                                cohere?: {
                                    baseUrl?: string | undefined;
                                    frequencyPenalty?: number | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    k?: number | undefined;
                                    p?: number | undefined;
                                    presencePenalty?: number | undefined;
                                    stopSequences?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    temperature?: number | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                dummy?: {} | undefined;
                                mistral?: {
                                    baseUrl?: string | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                } | undefined;
                                ollama?: {
                                    apiEndpoint?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                openai?: {
                                    frequencyPenalty?: number | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    n?: number | undefined;
                                    presencePenalty?: number | undefined;
                                    stop?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                    baseUrl?: string | undefined;
                                    apiVersion?: string | undefined;
                                    resourceName?: string | undefined;
                                    deploymentId?: string | undefined;
                                    isAzure?: boolean | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    reasoningEffort?: import("./generative.js").GenerativeOpenAI_ReasoningEffort | undefined;
                                    verbosity?: import("./generative.js").GenerativeOpenAI_Verbosity | undefined;
                                } | undefined;
                                google?: {
                                    frequencyPenalty?: number | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    presencePenalty?: number | undefined;
                                    temperature?: number | undefined;
                                    topK?: number | undefined;
                                    topP?: number | undefined;
                                    stopSequences?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    apiEndpoint?: string | undefined;
                                    projectId?: string | undefined;
                                    endpointId?: string | undefined;
                                    region?: string | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                databricks?: {
                                    endpoint?: string | undefined;
                                    model?: string | undefined;
                                    frequencyPenalty?: number | undefined;
                                    logProbs?: boolean | undefined;
                                    topLogProbs?: number | undefined;
                                    maxTokens?: number | undefined;
                                    n?: number | undefined;
                                    presencePenalty?: number | undefined;
                                    stop?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                } | undefined;
                                friendliai?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    maxTokens?: number | undefined;
                                    temperature?: number | undefined;
                                    n?: number | undefined;
                                    topP?: number | undefined;
                                } | undefined;
                                nvidia?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                    maxTokens?: number | undefined;
                                } | undefined;
                                xai?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                    maxTokens?: number | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                            }[] | undefined;
                            debug?: boolean | undefined;
                        } | undefined;
                    } | undefined;
                    rerank?: {
                        property?: string | undefined;
                        query?: string | undefined;
                    } | undefined;
                    uses123Api?: boolean | undefined;
                    uses125Api?: boolean | undefined;
                    uses127Api?: boolean | undefined;
                } | undefined): SearchRequest;
                fromPartial(object: {
                    collection?: string | undefined;
                    tenant?: string | undefined;
                    consistencyLevel?: import("./base.js").ConsistencyLevel | undefined;
                    properties?: {
                        nonRefProperties?: string[] | undefined;
                        refProperties?: {
                            referenceProperty?: string | undefined;
                            properties?: any | undefined;
                            metadata?: {
                                uuid?: boolean | undefined;
                                vector?: boolean | undefined;
                                creationTimeUnix?: boolean | undefined;
                                lastUpdateTimeUnix?: boolean | undefined;
                                distance?: boolean | undefined;
                                certainty?: boolean | undefined;
                                score?: boolean | undefined;
                                explainScore?: boolean | undefined;
                                isConsistent?: boolean | undefined;
                                vectors?: string[] | undefined;
                            } | undefined;
                            targetCollection?: string | undefined;
                        }[] | undefined;
                        objectProperties?: {
                            propName?: string | undefined;
                            primitiveProperties?: string[] | undefined;
                            objectProperties?: any[] | undefined;
                        }[] | undefined;
                        returnAllNonrefProperties?: boolean | undefined;
                    } | undefined;
                    metadata?: {
                        uuid?: boolean | undefined;
                        vector?: boolean | undefined;
                        creationTimeUnix?: boolean | undefined;
                        lastUpdateTimeUnix?: boolean | undefined;
                        distance?: boolean | undefined;
                        certainty?: boolean | undefined;
                        score?: boolean | undefined;
                        explainScore?: boolean | undefined;
                        isConsistent?: boolean | undefined;
                        vectors?: string[] | undefined;
                    } | undefined;
                    groupBy?: {
                        path?: string[] | undefined;
                        numberOfGroups?: number | undefined;
                        objectsPerGroup?: number | undefined;
                    } | undefined;
                    limit?: number | undefined;
                    offset?: number | undefined;
                    autocut?: number | undefined;
                    after?: string | undefined;
                    sortBy?: {
                        ascending?: boolean | undefined;
                        path?: string[] | undefined;
                    }[] | undefined;
                    filters?: {
                        operator?: import("./base.js").Filters_Operator | undefined;
                        on?: string[] | undefined;
                        filters?: any[] | undefined;
                        valueText?: string | undefined;
                        valueInt?: number | undefined;
                        valueBoolean?: boolean | undefined;
                        valueNumber?: number | undefined;
                        valueTextArray?: {
                            values?: string[] | undefined;
                        } | undefined;
                        valueIntArray?: {
                            values?: number[] | undefined;
                        } | undefined;
                        valueBooleanArray?: {
                            values?: boolean[] | undefined;
                        } | undefined;
                        valueNumberArray?: {
                            values?: number[] | undefined;
                        } | undefined;
                        valueGeo?: {
                            latitude?: number | undefined;
                            longitude?: number | undefined;
                            distance?: number | undefined;
                        } | undefined;
                        target?: {
                            property?: string | undefined;
                            singleTarget?: {
                                on?: string | undefined;
                                target?: any | undefined;
                            } | undefined;
                            multiTarget?: {
                                on?: string | undefined;
                                target?: any | undefined;
                                targetCollection?: string | undefined;
                            } | undefined;
                            count?: {
                                on?: string | undefined;
                            } | undefined;
                        } | undefined;
                    } | undefined;
                    hybridSearch?: {
                        query?: string | undefined;
                        properties?: string[] | undefined;
                        vector?: number[] | undefined;
                        alpha?: number | undefined;
                        fusionType?: import("./base_search.js").Hybrid_FusionType | undefined;
                        vectorBytes?: Uint8Array | undefined;
                        targetVectors?: string[] | undefined;
                        nearText?: {
                            query?: string[] | undefined;
                            certainty?: number | undefined;
                            distance?: number | undefined;
                            moveTo?: {
                                force?: number | undefined;
                                concepts?: string[] | undefined;
                                uuids?: string[] | undefined;
                            } | undefined;
                            moveAway?: {
                                force?: number | undefined;
                                concepts?: string[] | undefined;
                                uuids?: string[] | undefined;
                            } | undefined;
                            targetVectors?: string[] | undefined;
                            targets?: {
                                targetVectors?: string[] | undefined;
                                combination?: import("./base_search.js").CombinationMethod | undefined;
                                weightsForTargets?: {
                                    target?: string | undefined;
                                    weight?: number | undefined;
                                }[] | undefined;
                            } | undefined;
                        } | undefined;
                        nearVector?: {
                            vector?: number[] | undefined;
                            certainty?: number | undefined;
                            distance?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            targetVectors?: string[] | undefined;
                            targets?: {
                                targetVectors?: string[] | undefined;
                                combination?: import("./base_search.js").CombinationMethod | undefined;
                                weightsForTargets?: {
                                    target?: string | undefined;
                                    weight?: number | undefined;
                                }[] | undefined;
                            } | undefined;
                            vectorPerTarget?: {
                                [x: string]: Uint8Array | undefined;
                            } | undefined;
                            vectorForTargets?: {
                                name?: string | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                vectors?: {
                                    name?: string | undefined;
                                    index?: number | undefined;
                                    vectorBytes?: Uint8Array | undefined;
                                    type?: import("./base.js").Vectors_VectorType | undefined;
                                }[] | undefined;
                            }[] | undefined;
                            vectors?: {
                                name?: string | undefined;
                                index?: number | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                type?: import("./base.js").Vectors_VectorType | undefined;
                            }[] | undefined;
                        } | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                        bm25SearchOperator?: {
                            operator?: import("./base_search.js").SearchOperatorOptions_Operator | undefined;
                            minimumOrTokensMatch?: number | undefined;
                        } | undefined;
                        vectorDistance?: number | undefined;
                        vectors?: {
                            name?: string | undefined;
                            index?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            type?: import("./base.js").Vectors_VectorType | undefined;
                        }[] | undefined;
                    } | undefined;
                    bm25Search?: {
                        query?: string | undefined;
                        properties?: string[] | undefined;
                        searchOperator?: {
                            operator?: import("./base_search.js").SearchOperatorOptions_Operator | undefined;
                            minimumOrTokensMatch?: number | undefined;
                        } | undefined;
                    } | undefined;
                    nearVector?: {
                        vector?: number[] | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        vectorBytes?: Uint8Array | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                        vectorPerTarget?: {
                            [x: string]: Uint8Array | undefined;
                        } | undefined;
                        vectorForTargets?: {
                            name?: string | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            vectors?: {
                                name?: string | undefined;
                                index?: number | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                type?: import("./base.js").Vectors_VectorType | undefined;
                            }[] | undefined;
                        }[] | undefined;
                        vectors?: {
                            name?: string | undefined;
                            index?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            type?: import("./base.js").Vectors_VectorType | undefined;
                        }[] | undefined;
                    } | undefined;
                    nearObject?: {
                        id?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearText?: {
                        query?: string[] | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        moveTo?: {
                            force?: number | undefined;
                            concepts?: string[] | undefined;
                            uuids?: string[] | undefined;
                        } | undefined;
                        moveAway?: {
                            force?: number | undefined;
                            concepts?: string[] | undefined;
                            uuids?: string[] | undefined;
                        } | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearImage?: {
                        image?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearAudio?: {
                        audio?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearVideo?: {
                        video?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearDepth?: {
                        depth?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearThermal?: {
                        thermal?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearImu?: {
                        imu?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    generative?: {
                        singleResponsePrompt?: string | undefined;
                        groupedResponseTask?: string | undefined;
                        groupedProperties?: string[] | undefined;
                        single?: {
                            prompt?: string | undefined;
                            debug?: boolean | undefined;
                            queries?: {
                                returnMetadata?: boolean | undefined;
                                anthropic?: {
                                    baseUrl?: string | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topK?: number | undefined;
                                    topP?: number | undefined;
                                    stopSequences?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                anyscale?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                } | undefined;
                                aws?: {
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    service?: string | undefined;
                                    region?: string | undefined;
                                    endpoint?: string | undefined;
                                    targetModel?: string | undefined;
                                    targetVariant?: string | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    maxTokens?: number | undefined;
                                } | undefined;
                                cohere?: {
                                    baseUrl?: string | undefined;
                                    frequencyPenalty?: number | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    k?: number | undefined;
                                    p?: number | undefined;
                                    presencePenalty?: number | undefined;
                                    stopSequences?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    temperature?: number | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                dummy?: {} | undefined;
                                mistral?: {
                                    baseUrl?: string | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                } | undefined;
                                ollama?: {
                                    apiEndpoint?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                openai?: {
                                    frequencyPenalty?: number | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    n?: number | undefined;
                                    presencePenalty?: number | undefined;
                                    stop?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                    baseUrl?: string | undefined;
                                    apiVersion?: string | undefined;
                                    resourceName?: string | undefined;
                                    deploymentId?: string | undefined;
                                    isAzure?: boolean | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    reasoningEffort?: import("./generative.js").GenerativeOpenAI_ReasoningEffort | undefined;
                                    verbosity?: import("./generative.js").GenerativeOpenAI_Verbosity | undefined;
                                } | undefined;
                                google?: {
                                    frequencyPenalty?: number | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    presencePenalty?: number | undefined;
                                    temperature?: number | undefined;
                                    topK?: number | undefined;
                                    topP?: number | undefined;
                                    stopSequences?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    apiEndpoint?: string | undefined;
                                    projectId?: string | undefined;
                                    endpointId?: string | undefined;
                                    region?: string | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                databricks?: {
                                    endpoint?: string | undefined;
                                    model?: string | undefined;
                                    frequencyPenalty?: number | undefined;
                                    logProbs?: boolean | undefined;
                                    topLogProbs?: number | undefined;
                                    maxTokens?: number | undefined;
                                    n?: number | undefined;
                                    presencePenalty?: number | undefined;
                                    stop?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                } | undefined;
                                friendliai?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    maxTokens?: number | undefined;
                                    temperature?: number | undefined;
                                    n?: number | undefined;
                                    topP?: number | undefined;
                                } | undefined;
                                nvidia?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                    maxTokens?: number | undefined;
                                } | undefined;
                                xai?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                    maxTokens?: number | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                            }[] | undefined;
                        } | undefined;
                        grouped?: {
                            task?: string | undefined;
                            properties?: {
                                values?: string[] | undefined;
                            } | undefined;
                            queries?: {
                                returnMetadata?: boolean | undefined;
                                anthropic?: {
                                    baseUrl?: string | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topK?: number | undefined;
                                    topP?: number | undefined;
                                    stopSequences?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                anyscale?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                } | undefined;
                                aws?: {
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    service?: string | undefined;
                                    region?: string | undefined;
                                    endpoint?: string | undefined;
                                    targetModel?: string | undefined;
                                    targetVariant?: string | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    maxTokens?: number | undefined;
                                } | undefined;
                                cohere?: {
                                    baseUrl?: string | undefined;
                                    frequencyPenalty?: number | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    k?: number | undefined;
                                    p?: number | undefined;
                                    presencePenalty?: number | undefined;
                                    stopSequences?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    temperature?: number | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                dummy?: {} | undefined;
                                mistral?: {
                                    baseUrl?: string | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                } | undefined;
                                ollama?: {
                                    apiEndpoint?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                openai?: {
                                    frequencyPenalty?: number | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    n?: number | undefined;
                                    presencePenalty?: number | undefined;
                                    stop?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                    baseUrl?: string | undefined;
                                    apiVersion?: string | undefined;
                                    resourceName?: string | undefined;
                                    deploymentId?: string | undefined;
                                    isAzure?: boolean | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    reasoningEffort?: import("./generative.js").GenerativeOpenAI_ReasoningEffort | undefined;
                                    verbosity?: import("./generative.js").GenerativeOpenAI_Verbosity | undefined;
                                } | undefined;
                                google?: {
                                    frequencyPenalty?: number | undefined;
                                    maxTokens?: number | undefined;
                                    model?: string | undefined;
                                    presencePenalty?: number | undefined;
                                    temperature?: number | undefined;
                                    topK?: number | undefined;
                                    topP?: number | undefined;
                                    stopSequences?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    apiEndpoint?: string | undefined;
                                    projectId?: string | undefined;
                                    endpointId?: string | undefined;
                                    region?: string | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                databricks?: {
                                    endpoint?: string | undefined;
                                    model?: string | undefined;
                                    frequencyPenalty?: number | undefined;
                                    logProbs?: boolean | undefined;
                                    topLogProbs?: number | undefined;
                                    maxTokens?: number | undefined;
                                    n?: number | undefined;
                                    presencePenalty?: number | undefined;
                                    stop?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                } | undefined;
                                friendliai?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    maxTokens?: number | undefined;
                                    temperature?: number | undefined;
                                    n?: number | undefined;
                                    topP?: number | undefined;
                                } | undefined;
                                nvidia?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                    maxTokens?: number | undefined;
                                } | undefined;
                                xai?: {
                                    baseUrl?: string | undefined;
                                    model?: string | undefined;
                                    temperature?: number | undefined;
                                    topP?: number | undefined;
                                    maxTokens?: number | undefined;
                                    images?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                    imageProperties?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                            }[] | undefined;
                            debug?: boolean | undefined;
                        } | undefined;
                    } | undefined;
                    rerank?: {
                        property?: string | undefined;
                        query?: string | undefined;
                    } | undefined;
                    uses123Api?: boolean | undefined;
                    uses125Api?: boolean | undefined;
                    uses127Api?: boolean | undefined;
                }): SearchRequest;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: SearchReply, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): SearchReply;
                fromJSON(object: any): SearchReply;
                toJSON(message: SearchReply): unknown;
                create(base?: {
                    took?: number | undefined;
                    results?: {
                        properties?: {
                            refProps?: {
                                properties?: any[] | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            targetCollection?: string | undefined;
                            metadata?: {
                                id?: string | undefined;
                                vector?: number[] | undefined;
                                creationTimeUnix?: number | undefined;
                                creationTimeUnixPresent?: boolean | undefined;
                                lastUpdateTimeUnix?: number | undefined;
                                lastUpdateTimeUnixPresent?: boolean | undefined;
                                distance?: number | undefined;
                                distancePresent?: boolean | undefined;
                                certainty?: number | undefined;
                                certaintyPresent?: boolean | undefined;
                                score?: number | undefined;
                                scorePresent?: boolean | undefined;
                                explainScore?: string | undefined;
                                explainScorePresent?: boolean | undefined;
                                isConsistent?: boolean | undefined;
                                generative?: string | undefined;
                                generativePresent?: boolean | undefined;
                                isConsistentPresent?: boolean | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                idAsBytes?: Uint8Array | undefined;
                                rerankScore?: number | undefined;
                                rerankScorePresent?: boolean | undefined;
                                vectors?: {
                                    name?: string | undefined;
                                    index?: number | undefined;
                                    vectorBytes?: Uint8Array | undefined;
                                    type?: import("./base.js").Vectors_VectorType | undefined;
                                }[] | undefined;
                            } | undefined;
                            nonRefProps?: {
                                fields?: {
                                    [x: string]: {
                                        numberValue?: number | undefined;
                                        boolValue?: boolean | undefined;
                                        objectValue?: any | undefined;
                                        listValue?: {
                                            numberValues?: {
                                                values?: Uint8Array | undefined;
                                            } | undefined;
                                            boolValues?: {
                                                values?: boolean[] | undefined;
                                            } | undefined;
                                            objectValues?: {
                                                values?: any[] | undefined;
                                            } | undefined;
                                            dateValues?: {
                                                values?: string[] | undefined;
                                            } | undefined;
                                            uuidValues?: {
                                                values?: string[] | undefined;
                                            } | undefined;
                                            intValues?: {
                                                values?: Uint8Array | undefined;
                                            } | undefined;
                                            textValues?: {
                                                values?: string[] | undefined;
                                            } | undefined;
                                        } | undefined;
                                        dateValue?: string | undefined;
                                        uuidValue?: string | undefined;
                                        intValue?: number | undefined;
                                        geoValue?: {
                                            longitude?: number | undefined;
                                            latitude?: number | undefined;
                                        } | undefined;
                                        blobValue?: string | undefined;
                                        phoneValue?: {
                                            countryCode?: number | undefined;
                                            defaultCountry?: string | undefined;
                                            input?: string | undefined;
                                            internationalFormatted?: string | undefined;
                                            national?: number | undefined;
                                            nationalFormatted?: string | undefined;
                                            valid?: boolean | undefined;
                                        } | undefined;
                                        nullValue?: import("../google/protobuf/struct.js").NullValue | undefined;
                                        textValue?: string | undefined;
                                    } | undefined;
                                } | undefined;
                            } | undefined;
                            refPropsRequested?: boolean | undefined;
                        } | undefined;
                        metadata?: {
                            id?: string | undefined;
                            vector?: number[] | undefined;
                            creationTimeUnix?: number | undefined;
                            creationTimeUnixPresent?: boolean | undefined;
                            lastUpdateTimeUnix?: number | undefined;
                            lastUpdateTimeUnixPresent?: boolean | undefined;
                            distance?: number | undefined;
                            distancePresent?: boolean | undefined;
                            certainty?: number | undefined;
                            certaintyPresent?: boolean | undefined;
                            score?: number | undefined;
                            scorePresent?: boolean | undefined;
                            explainScore?: string | undefined;
                            explainScorePresent?: boolean | undefined;
                            isConsistent?: boolean | undefined;
                            generative?: string | undefined;
                            generativePresent?: boolean | undefined;
                            isConsistentPresent?: boolean | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            idAsBytes?: Uint8Array | undefined;
                            rerankScore?: number | undefined;
                            rerankScorePresent?: boolean | undefined;
                            vectors?: {
                                name?: string | undefined;
                                index?: number | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                type?: import("./base.js").Vectors_VectorType | undefined;
                            }[] | undefined;
                        } | undefined;
                        generative?: {
                            values?: {
                                result?: string | undefined;
                                debug?: {
                                    fullPrompt?: string | undefined;
                                } | undefined;
                                metadata?: {
                                    anthropic?: {
                                        usage?: {
                                            inputTokens?: number | undefined;
                                            outputTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    anyscale?: {} | undefined;
                                    aws?: {} | undefined;
                                    cohere?: {
                                        apiVersion?: {
                                            version?: string | undefined;
                                            isDeprecated?: boolean | undefined;
                                            isExperimental?: boolean | undefined;
                                        } | undefined;
                                        billedUnits?: {
                                            inputTokens?: number | undefined;
                                            outputTokens?: number | undefined;
                                            searchUnits?: number | undefined;
                                            classifications?: number | undefined;
                                        } | undefined;
                                        tokens?: {
                                            inputTokens?: number | undefined;
                                            outputTokens?: number | undefined;
                                        } | undefined;
                                        warnings?: {
                                            values?: string[] | undefined;
                                        } | undefined;
                                    } | undefined;
                                    dummy?: {} | undefined;
                                    mistral?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    ollama?: {} | undefined;
                                    openai?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    google?: {
                                        metadata?: {
                                            tokenMetadata?: {
                                                inputTokenCount?: {
                                                    totalBillableCharacters?: number | undefined;
                                                    totalTokens?: number | undefined;
                                                } | undefined;
                                                outputTokenCount?: {
                                                    totalBillableCharacters?: number | undefined;
                                                    totalTokens?: number | undefined;
                                                } | undefined;
                                            } | undefined;
                                        } | undefined;
                                        usageMetadata?: {
                                            promptTokenCount?: number | undefined;
                                            candidatesTokenCount?: number | undefined;
                                            totalTokenCount?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    databricks?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    friendliai?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    nvidia?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    xai?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                } | undefined;
                            }[] | undefined;
                        } | undefined;
                    }[] | undefined;
                    generativeGroupedResult?: string | undefined;
                    groupByResults?: {
                        name?: string | undefined;
                        minDistance?: number | undefined;
                        maxDistance?: number | undefined;
                        numberOfObjects?: number | undefined;
                        objects?: {
                            properties?: {
                                refProps?: {
                                    properties?: any[] | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                targetCollection?: string | undefined;
                                metadata?: {
                                    id?: string | undefined;
                                    vector?: number[] | undefined;
                                    creationTimeUnix?: number | undefined;
                                    creationTimeUnixPresent?: boolean | undefined;
                                    lastUpdateTimeUnix?: number | undefined;
                                    lastUpdateTimeUnixPresent?: boolean | undefined;
                                    distance?: number | undefined;
                                    distancePresent?: boolean | undefined;
                                    certainty?: number | undefined;
                                    certaintyPresent?: boolean | undefined;
                                    score?: number | undefined;
                                    scorePresent?: boolean | undefined;
                                    explainScore?: string | undefined;
                                    explainScorePresent?: boolean | undefined;
                                    isConsistent?: boolean | undefined;
                                    generative?: string | undefined;
                                    generativePresent?: boolean | undefined;
                                    isConsistentPresent?: boolean | undefined;
                                    vectorBytes?: Uint8Array | undefined;
                                    idAsBytes?: Uint8Array | undefined;
                                    rerankScore?: number | undefined;
                                    rerankScorePresent?: boolean | undefined;
                                    vectors?: {
                                        name?: string | undefined;
                                        index?: number | undefined;
                                        vectorBytes?: Uint8Array | undefined;
                                        type?: import("./base.js").Vectors_VectorType | undefined;
                                    }[] | undefined;
                                } | undefined;
                                nonRefProps?: {
                                    fields?: {
                                        [x: string]: {
                                            numberValue?: number | undefined;
                                            boolValue?: boolean | undefined;
                                            objectValue?: any | undefined;
                                            listValue?: {
                                                numberValues?: {
                                                    values?: Uint8Array | undefined;
                                                } | undefined;
                                                boolValues?: {
                                                    values?: boolean[] | undefined;
                                                } | undefined;
                                                objectValues?: {
                                                    values?: any[] | undefined;
                                                } | undefined;
                                                dateValues?: {
                                                    values?: string[] | undefined;
                                                } | undefined;
                                                uuidValues?: {
                                                    values?: string[] | undefined;
                                                } | undefined;
                                                intValues?: {
                                                    values?: Uint8Array | undefined;
                                                } | undefined;
                                                textValues?: {
                                                    values?: string[] | undefined;
                                                } | undefined;
                                            } | undefined;
                                            dateValue?: string | undefined;
                                            uuidValue?: string | undefined;
                                            intValue?: number | undefined;
                                            geoValue?: {
                                                longitude?: number | undefined;
                                                latitude?: number | undefined;
                                            } | undefined;
                                            blobValue?: string | undefined;
                                            phoneValue?: {
                                                countryCode?: number | undefined;
                                                defaultCountry?: string | undefined;
                                                input?: string | undefined;
                                                internationalFormatted?: string | undefined;
                                                national?: number | undefined;
                                                nationalFormatted?: string | undefined;
                                                valid?: boolean | undefined;
                                            } | undefined;
                                            nullValue?: import("../google/protobuf/struct.js").NullValue | undefined;
                                            textValue?: string | undefined;
                                        } | undefined;
                                    } | undefined;
                                } | undefined;
                                refPropsRequested?: boolean | undefined;
                            } | undefined;
                            metadata?: {
                                id?: string | undefined;
                                vector?: number[] | undefined;
                                creationTimeUnix?: number | undefined;
                                creationTimeUnixPresent?: boolean | undefined;
                                lastUpdateTimeUnix?: number | undefined;
                                lastUpdateTimeUnixPresent?: boolean | undefined;
                                distance?: number | undefined;
                                distancePresent?: boolean | undefined;
                                certainty?: number | undefined;
                                certaintyPresent?: boolean | undefined;
                                score?: number | undefined;
                                scorePresent?: boolean | undefined;
                                explainScore?: string | undefined;
                                explainScorePresent?: boolean | undefined;
                                isConsistent?: boolean | undefined;
                                generative?: string | undefined;
                                generativePresent?: boolean | undefined;
                                isConsistentPresent?: boolean | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                idAsBytes?: Uint8Array | undefined;
                                rerankScore?: number | undefined;
                                rerankScorePresent?: boolean | undefined;
                                vectors?: {
                                    name?: string | undefined;
                                    index?: number | undefined;
                                    vectorBytes?: Uint8Array | undefined;
                                    type?: import("./base.js").Vectors_VectorType | undefined;
                                }[] | undefined;
                            } | undefined;
                            generative?: {
                                values?: {
                                    result?: string | undefined;
                                    debug?: {
                                        fullPrompt?: string | undefined;
                                    } | undefined;
                                    metadata?: {
                                        anthropic?: {
                                            usage?: {
                                                inputTokens?: number | undefined;
                                                outputTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        anyscale?: {} | undefined;
                                        aws?: {} | undefined;
                                        cohere?: {
                                            apiVersion?: {
                                                version?: string | undefined;
                                                isDeprecated?: boolean | undefined;
                                                isExperimental?: boolean | undefined;
                                            } | undefined;
                                            billedUnits?: {
                                                inputTokens?: number | undefined;
                                                outputTokens?: number | undefined;
                                                searchUnits?: number | undefined;
                                                classifications?: number | undefined;
                                            } | undefined;
                                            tokens?: {
                                                inputTokens?: number | undefined;
                                                outputTokens?: number | undefined;
                                            } | undefined;
                                            warnings?: {
                                                values?: string[] | undefined;
                                            } | undefined;
                                        } | undefined;
                                        dummy?: {} | undefined;
                                        mistral?: {
                                            usage?: {
                                                promptTokens?: number | undefined;
                                                completionTokens?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        ollama?: {} | undefined;
                                        openai?: {
                                            usage?: {
                                                promptTokens?: number | undefined;
                                                completionTokens?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        google?: {
                                            metadata?: {
                                                tokenMetadata?: {
                                                    inputTokenCount?: {
                                                        totalBillableCharacters?: number | undefined;
                                                        totalTokens?: number | undefined;
                                                    } | undefined;
                                                    outputTokenCount?: {
                                                        totalBillableCharacters?: number | undefined;
                                                        totalTokens?: number | undefined;
                                                    } | undefined;
                                                } | undefined;
                                            } | undefined;
                                            usageMetadata?: {
                                                promptTokenCount?: number | undefined;
                                                candidatesTokenCount?: number | undefined;
                                                totalTokenCount?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        databricks?: {
                                            usage?: {
                                                promptTokens?: number | undefined;
                                                completionTokens?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        friendliai?: {
                                            usage?: {
                                                promptTokens?: number | undefined;
                                                completionTokens?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        nvidia?: {
                                            usage?: {
                                                promptTokens?: number | undefined;
                                                completionTokens?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        xai?: {
                                            usage?: {
                                                promptTokens?: number | undefined;
                                                completionTokens?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                    } | undefined;
                                }[] | undefined;
                            } | undefined;
                        }[] | undefined;
                        rerank?: {
                            score?: number | undefined;
                        } | undefined;
                        generative?: {
                            result?: string | undefined;
                            debug?: {
                                fullPrompt?: string | undefined;
                            } | undefined;
                            metadata?: {
                                anthropic?: {
                                    usage?: {
                                        inputTokens?: number | undefined;
                                        outputTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                anyscale?: {} | undefined;
                                aws?: {} | undefined;
                                cohere?: {
                                    apiVersion?: {
                                        version?: string | undefined;
                                        isDeprecated?: boolean | undefined;
                                        isExperimental?: boolean | undefined;
                                    } | undefined;
                                    billedUnits?: {
                                        inputTokens?: number | undefined;
                                        outputTokens?: number | undefined;
                                        searchUnits?: number | undefined;
                                        classifications?: number | undefined;
                                    } | undefined;
                                    tokens?: {
                                        inputTokens?: number | undefined;
                                        outputTokens?: number | undefined;
                                    } | undefined;
                                    warnings?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                dummy?: {} | undefined;
                                mistral?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                ollama?: {} | undefined;
                                openai?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                google?: {
                                    metadata?: {
                                        tokenMetadata?: {
                                            inputTokenCount?: {
                                                totalBillableCharacters?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                            outputTokenCount?: {
                                                totalBillableCharacters?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                    } | undefined;
                                    usageMetadata?: {
                                        promptTokenCount?: number | undefined;
                                        candidatesTokenCount?: number | undefined;
                                        totalTokenCount?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                databricks?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                friendliai?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                nvidia?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                xai?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                            } | undefined;
                        } | undefined;
                        generativeResult?: {
                            values?: {
                                result?: string | undefined;
                                debug?: {
                                    fullPrompt?: string | undefined;
                                } | undefined;
                                metadata?: {
                                    anthropic?: {
                                        usage?: {
                                            inputTokens?: number | undefined;
                                            outputTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    anyscale?: {} | undefined;
                                    aws?: {} | undefined;
                                    cohere?: {
                                        apiVersion?: {
                                            version?: string | undefined;
                                            isDeprecated?: boolean | undefined;
                                            isExperimental?: boolean | undefined;
                                        } | undefined;
                                        billedUnits?: {
                                            inputTokens?: number | undefined;
                                            outputTokens?: number | undefined;
                                            searchUnits?: number | undefined;
                                            classifications?: number | undefined;
                                        } | undefined;
                                        tokens?: {
                                            inputTokens?: number | undefined;
                                            outputTokens?: number | undefined;
                                        } | undefined;
                                        warnings?: {
                                            values?: string[] | undefined;
                                        } | undefined;
                                    } | undefined;
                                    dummy?: {} | undefined;
                                    mistral?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    ollama?: {} | undefined;
                                    openai?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    google?: {
                                        metadata?: {
                                            tokenMetadata?: {
                                                inputTokenCount?: {
                                                    totalBillableCharacters?: number | undefined;
                                                    totalTokens?: number | undefined;
                                                } | undefined;
                                                outputTokenCount?: {
                                                    totalBillableCharacters?: number | undefined;
                                                    totalTokens?: number | undefined;
                                                } | undefined;
                                            } | undefined;
                                        } | undefined;
                                        usageMetadata?: {
                                            promptTokenCount?: number | undefined;
                                            candidatesTokenCount?: number | undefined;
                                            totalTokenCount?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    databricks?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    friendliai?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    nvidia?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    xai?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                } | undefined;
                            }[] | undefined;
                        } | undefined;
                    }[] | undefined;
                    generativeGroupedResults?: {
                        values?: {
                            result?: string | undefined;
                            debug?: {
                                fullPrompt?: string | undefined;
                            } | undefined;
                            metadata?: {
                                anthropic?: {
                                    usage?: {
                                        inputTokens?: number | undefined;
                                        outputTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                anyscale?: {} | undefined;
                                aws?: {} | undefined;
                                cohere?: {
                                    apiVersion?: {
                                        version?: string | undefined;
                                        isDeprecated?: boolean | undefined;
                                        isExperimental?: boolean | undefined;
                                    } | undefined;
                                    billedUnits?: {
                                        inputTokens?: number | undefined;
                                        outputTokens?: number | undefined;
                                        searchUnits?: number | undefined;
                                        classifications?: number | undefined;
                                    } | undefined;
                                    tokens?: {
                                        inputTokens?: number | undefined;
                                        outputTokens?: number | undefined;
                                    } | undefined;
                                    warnings?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                dummy?: {} | undefined;
                                mistral?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                ollama?: {} | undefined;
                                openai?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                google?: {
                                    metadata?: {
                                        tokenMetadata?: {
                                            inputTokenCount?: {
                                                totalBillableCharacters?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                            outputTokenCount?: {
                                                totalBillableCharacters?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                    } | undefined;
                                    usageMetadata?: {
                                        promptTokenCount?: number | undefined;
                                        candidatesTokenCount?: number | undefined;
                                        totalTokenCount?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                databricks?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                friendliai?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                nvidia?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                xai?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                            } | undefined;
                        }[] | undefined;
                    } | undefined;
                } | undefined): SearchReply;
                fromPartial(object: {
                    took?: number | undefined;
                    results?: {
                        properties?: {
                            refProps?: {
                                properties?: any[] | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            targetCollection?: string | undefined;
                            metadata?: {
                                id?: string | undefined;
                                vector?: number[] | undefined;
                                creationTimeUnix?: number | undefined;
                                creationTimeUnixPresent?: boolean | undefined;
                                lastUpdateTimeUnix?: number | undefined;
                                lastUpdateTimeUnixPresent?: boolean | undefined;
                                distance?: number | undefined;
                                distancePresent?: boolean | undefined;
                                certainty?: number | undefined;
                                certaintyPresent?: boolean | undefined;
                                score?: number | undefined;
                                scorePresent?: boolean | undefined;
                                explainScore?: string | undefined;
                                explainScorePresent?: boolean | undefined;
                                isConsistent?: boolean | undefined;
                                generative?: string | undefined;
                                generativePresent?: boolean | undefined;
                                isConsistentPresent?: boolean | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                idAsBytes?: Uint8Array | undefined;
                                rerankScore?: number | undefined;
                                rerankScorePresent?: boolean | undefined;
                                vectors?: {
                                    name?: string | undefined;
                                    index?: number | undefined;
                                    vectorBytes?: Uint8Array | undefined;
                                    type?: import("./base.js").Vectors_VectorType | undefined;
                                }[] | undefined;
                            } | undefined;
                            nonRefProps?: {
                                fields?: {
                                    [x: string]: {
                                        numberValue?: number | undefined;
                                        boolValue?: boolean | undefined;
                                        objectValue?: any | undefined;
                                        listValue?: {
                                            numberValues?: {
                                                values?: Uint8Array | undefined;
                                            } | undefined;
                                            boolValues?: {
                                                values?: boolean[] | undefined;
                                            } | undefined;
                                            objectValues?: {
                                                values?: any[] | undefined;
                                            } | undefined;
                                            dateValues?: {
                                                values?: string[] | undefined;
                                            } | undefined;
                                            uuidValues?: {
                                                values?: string[] | undefined;
                                            } | undefined;
                                            intValues?: {
                                                values?: Uint8Array | undefined;
                                            } | undefined;
                                            textValues?: {
                                                values?: string[] | undefined;
                                            } | undefined;
                                        } | undefined;
                                        dateValue?: string | undefined;
                                        uuidValue?: string | undefined;
                                        intValue?: number | undefined;
                                        geoValue?: {
                                            longitude?: number | undefined;
                                            latitude?: number | undefined;
                                        } | undefined;
                                        blobValue?: string | undefined;
                                        phoneValue?: {
                                            countryCode?: number | undefined;
                                            defaultCountry?: string | undefined;
                                            input?: string | undefined;
                                            internationalFormatted?: string | undefined;
                                            national?: number | undefined;
                                            nationalFormatted?: string | undefined;
                                            valid?: boolean | undefined;
                                        } | undefined;
                                        nullValue?: import("../google/protobuf/struct.js").NullValue | undefined;
                                        textValue?: string | undefined;
                                    } | undefined;
                                } | undefined;
                            } | undefined;
                            refPropsRequested?: boolean | undefined;
                        } | undefined;
                        metadata?: {
                            id?: string | undefined;
                            vector?: number[] | undefined;
                            creationTimeUnix?: number | undefined;
                            creationTimeUnixPresent?: boolean | undefined;
                            lastUpdateTimeUnix?: number | undefined;
                            lastUpdateTimeUnixPresent?: boolean | undefined;
                            distance?: number | undefined;
                            distancePresent?: boolean | undefined;
                            certainty?: number | undefined;
                            certaintyPresent?: boolean | undefined;
                            score?: number | undefined;
                            scorePresent?: boolean | undefined;
                            explainScore?: string | undefined;
                            explainScorePresent?: boolean | undefined;
                            isConsistent?: boolean | undefined;
                            generative?: string | undefined;
                            generativePresent?: boolean | undefined;
                            isConsistentPresent?: boolean | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            idAsBytes?: Uint8Array | undefined;
                            rerankScore?: number | undefined;
                            rerankScorePresent?: boolean | undefined;
                            vectors?: {
                                name?: string | undefined;
                                index?: number | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                type?: import("./base.js").Vectors_VectorType | undefined;
                            }[] | undefined;
                        } | undefined;
                        generative?: {
                            values?: {
                                result?: string | undefined;
                                debug?: {
                                    fullPrompt?: string | undefined;
                                } | undefined;
                                metadata?: {
                                    anthropic?: {
                                        usage?: {
                                            inputTokens?: number | undefined;
                                            outputTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    anyscale?: {} | undefined;
                                    aws?: {} | undefined;
                                    cohere?: {
                                        apiVersion?: {
                                            version?: string | undefined;
                                            isDeprecated?: boolean | undefined;
                                            isExperimental?: boolean | undefined;
                                        } | undefined;
                                        billedUnits?: {
                                            inputTokens?: number | undefined;
                                            outputTokens?: number | undefined;
                                            searchUnits?: number | undefined;
                                            classifications?: number | undefined;
                                        } | undefined;
                                        tokens?: {
                                            inputTokens?: number | undefined;
                                            outputTokens?: number | undefined;
                                        } | undefined;
                                        warnings?: {
                                            values?: string[] | undefined;
                                        } | undefined;
                                    } | undefined;
                                    dummy?: {} | undefined;
                                    mistral?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    ollama?: {} | undefined;
                                    openai?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    google?: {
                                        metadata?: {
                                            tokenMetadata?: {
                                                inputTokenCount?: {
                                                    totalBillableCharacters?: number | undefined;
                                                    totalTokens?: number | undefined;
                                                } | undefined;
                                                outputTokenCount?: {
                                                    totalBillableCharacters?: number | undefined;
                                                    totalTokens?: number | undefined;
                                                } | undefined;
                                            } | undefined;
                                        } | undefined;
                                        usageMetadata?: {
                                            promptTokenCount?: number | undefined;
                                            candidatesTokenCount?: number | undefined;
                                            totalTokenCount?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    databricks?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    friendliai?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    nvidia?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    xai?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                } | undefined;
                            }[] | undefined;
                        } | undefined;
                    }[] | undefined;
                    generativeGroupedResult?: string | undefined;
                    groupByResults?: {
                        name?: string | undefined;
                        minDistance?: number | undefined;
                        maxDistance?: number | undefined;
                        numberOfObjects?: number | undefined;
                        objects?: {
                            properties?: {
                                refProps?: {
                                    properties?: any[] | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                targetCollection?: string | undefined;
                                metadata?: {
                                    id?: string | undefined;
                                    vector?: number[] | undefined;
                                    creationTimeUnix?: number | undefined;
                                    creationTimeUnixPresent?: boolean | undefined;
                                    lastUpdateTimeUnix?: number | undefined;
                                    lastUpdateTimeUnixPresent?: boolean | undefined;
                                    distance?: number | undefined;
                                    distancePresent?: boolean | undefined;
                                    certainty?: number | undefined;
                                    certaintyPresent?: boolean | undefined;
                                    score?: number | undefined;
                                    scorePresent?: boolean | undefined;
                                    explainScore?: string | undefined;
                                    explainScorePresent?: boolean | undefined;
                                    isConsistent?: boolean | undefined;
                                    generative?: string | undefined;
                                    generativePresent?: boolean | undefined;
                                    isConsistentPresent?: boolean | undefined;
                                    vectorBytes?: Uint8Array | undefined;
                                    idAsBytes?: Uint8Array | undefined;
                                    rerankScore?: number | undefined;
                                    rerankScorePresent?: boolean | undefined;
                                    vectors?: {
                                        name?: string | undefined;
                                        index?: number | undefined;
                                        vectorBytes?: Uint8Array | undefined;
                                        type?: import("./base.js").Vectors_VectorType | undefined;
                                    }[] | undefined;
                                } | undefined;
                                nonRefProps?: {
                                    fields?: {
                                        [x: string]: {
                                            numberValue?: number | undefined;
                                            boolValue?: boolean | undefined;
                                            objectValue?: any | undefined;
                                            listValue?: {
                                                numberValues?: {
                                                    values?: Uint8Array | undefined;
                                                } | undefined;
                                                boolValues?: {
                                                    values?: boolean[] | undefined;
                                                } | undefined;
                                                objectValues?: {
                                                    values?: any[] | undefined;
                                                } | undefined;
                                                dateValues?: {
                                                    values?: string[] | undefined;
                                                } | undefined;
                                                uuidValues?: {
                                                    values?: string[] | undefined;
                                                } | undefined;
                                                intValues?: {
                                                    values?: Uint8Array | undefined;
                                                } | undefined;
                                                textValues?: {
                                                    values?: string[] | undefined;
                                                } | undefined;
                                            } | undefined;
                                            dateValue?: string | undefined;
                                            uuidValue?: string | undefined;
                                            intValue?: number | undefined;
                                            geoValue?: {
                                                longitude?: number | undefined;
                                                latitude?: number | undefined;
                                            } | undefined;
                                            blobValue?: string | undefined;
                                            phoneValue?: {
                                                countryCode?: number | undefined;
                                                defaultCountry?: string | undefined;
                                                input?: string | undefined;
                                                internationalFormatted?: string | undefined;
                                                national?: number | undefined;
                                                nationalFormatted?: string | undefined;
                                                valid?: boolean | undefined;
                                            } | undefined;
                                            nullValue?: import("../google/protobuf/struct.js").NullValue | undefined;
                                            textValue?: string | undefined;
                                        } | undefined;
                                    } | undefined;
                                } | undefined;
                                refPropsRequested?: boolean | undefined;
                            } | undefined;
                            metadata?: {
                                id?: string | undefined;
                                vector?: number[] | undefined;
                                creationTimeUnix?: number | undefined;
                                creationTimeUnixPresent?: boolean | undefined;
                                lastUpdateTimeUnix?: number | undefined;
                                lastUpdateTimeUnixPresent?: boolean | undefined;
                                distance?: number | undefined;
                                distancePresent?: boolean | undefined;
                                certainty?: number | undefined;
                                certaintyPresent?: boolean | undefined;
                                score?: number | undefined;
                                scorePresent?: boolean | undefined;
                                explainScore?: string | undefined;
                                explainScorePresent?: boolean | undefined;
                                isConsistent?: boolean | undefined;
                                generative?: string | undefined;
                                generativePresent?: boolean | undefined;
                                isConsistentPresent?: boolean | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                idAsBytes?: Uint8Array | undefined;
                                rerankScore?: number | undefined;
                                rerankScorePresent?: boolean | undefined;
                                vectors?: {
                                    name?: string | undefined;
                                    index?: number | undefined;
                                    vectorBytes?: Uint8Array | undefined;
                                    type?: import("./base.js").Vectors_VectorType | undefined;
                                }[] | undefined;
                            } | undefined;
                            generative?: {
                                values?: {
                                    result?: string | undefined;
                                    debug?: {
                                        fullPrompt?: string | undefined;
                                    } | undefined;
                                    metadata?: {
                                        anthropic?: {
                                            usage?: {
                                                inputTokens?: number | undefined;
                                                outputTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        anyscale?: {} | undefined;
                                        aws?: {} | undefined;
                                        cohere?: {
                                            apiVersion?: {
                                                version?: string | undefined;
                                                isDeprecated?: boolean | undefined;
                                                isExperimental?: boolean | undefined;
                                            } | undefined;
                                            billedUnits?: {
                                                inputTokens?: number | undefined;
                                                outputTokens?: number | undefined;
                                                searchUnits?: number | undefined;
                                                classifications?: number | undefined;
                                            } | undefined;
                                            tokens?: {
                                                inputTokens?: number | undefined;
                                                outputTokens?: number | undefined;
                                            } | undefined;
                                            warnings?: {
                                                values?: string[] | undefined;
                                            } | undefined;
                                        } | undefined;
                                        dummy?: {} | undefined;
                                        mistral?: {
                                            usage?: {
                                                promptTokens?: number | undefined;
                                                completionTokens?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        ollama?: {} | undefined;
                                        openai?: {
                                            usage?: {
                                                promptTokens?: number | undefined;
                                                completionTokens?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        google?: {
                                            metadata?: {
                                                tokenMetadata?: {
                                                    inputTokenCount?: {
                                                        totalBillableCharacters?: number | undefined;
                                                        totalTokens?: number | undefined;
                                                    } | undefined;
                                                    outputTokenCount?: {
                                                        totalBillableCharacters?: number | undefined;
                                                        totalTokens?: number | undefined;
                                                    } | undefined;
                                                } | undefined;
                                            } | undefined;
                                            usageMetadata?: {
                                                promptTokenCount?: number | undefined;
                                                candidatesTokenCount?: number | undefined;
                                                totalTokenCount?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        databricks?: {
                                            usage?: {
                                                promptTokens?: number | undefined;
                                                completionTokens?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        friendliai?: {
                                            usage?: {
                                                promptTokens?: number | undefined;
                                                completionTokens?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        nvidia?: {
                                            usage?: {
                                                promptTokens?: number | undefined;
                                                completionTokens?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                        xai?: {
                                            usage?: {
                                                promptTokens?: number | undefined;
                                                completionTokens?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                    } | undefined;
                                }[] | undefined;
                            } | undefined;
                        }[] | undefined;
                        rerank?: {
                            score?: number | undefined;
                        } | undefined;
                        generative?: {
                            result?: string | undefined;
                            debug?: {
                                fullPrompt?: string | undefined;
                            } | undefined;
                            metadata?: {
                                anthropic?: {
                                    usage?: {
                                        inputTokens?: number | undefined;
                                        outputTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                anyscale?: {} | undefined;
                                aws?: {} | undefined;
                                cohere?: {
                                    apiVersion?: {
                                        version?: string | undefined;
                                        isDeprecated?: boolean | undefined;
                                        isExperimental?: boolean | undefined;
                                    } | undefined;
                                    billedUnits?: {
                                        inputTokens?: number | undefined;
                                        outputTokens?: number | undefined;
                                        searchUnits?: number | undefined;
                                        classifications?: number | undefined;
                                    } | undefined;
                                    tokens?: {
                                        inputTokens?: number | undefined;
                                        outputTokens?: number | undefined;
                                    } | undefined;
                                    warnings?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                dummy?: {} | undefined;
                                mistral?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                ollama?: {} | undefined;
                                openai?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                google?: {
                                    metadata?: {
                                        tokenMetadata?: {
                                            inputTokenCount?: {
                                                totalBillableCharacters?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                            outputTokenCount?: {
                                                totalBillableCharacters?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                    } | undefined;
                                    usageMetadata?: {
                                        promptTokenCount?: number | undefined;
                                        candidatesTokenCount?: number | undefined;
                                        totalTokenCount?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                databricks?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                friendliai?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                nvidia?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                xai?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                            } | undefined;
                        } | undefined;
                        generativeResult?: {
                            values?: {
                                result?: string | undefined;
                                debug?: {
                                    fullPrompt?: string | undefined;
                                } | undefined;
                                metadata?: {
                                    anthropic?: {
                                        usage?: {
                                            inputTokens?: number | undefined;
                                            outputTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    anyscale?: {} | undefined;
                                    aws?: {} | undefined;
                                    cohere?: {
                                        apiVersion?: {
                                            version?: string | undefined;
                                            isDeprecated?: boolean | undefined;
                                            isExperimental?: boolean | undefined;
                                        } | undefined;
                                        billedUnits?: {
                                            inputTokens?: number | undefined;
                                            outputTokens?: number | undefined;
                                            searchUnits?: number | undefined;
                                            classifications?: number | undefined;
                                        } | undefined;
                                        tokens?: {
                                            inputTokens?: number | undefined;
                                            outputTokens?: number | undefined;
                                        } | undefined;
                                        warnings?: {
                                            values?: string[] | undefined;
                                        } | undefined;
                                    } | undefined;
                                    dummy?: {} | undefined;
                                    mistral?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    ollama?: {} | undefined;
                                    openai?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    google?: {
                                        metadata?: {
                                            tokenMetadata?: {
                                                inputTokenCount?: {
                                                    totalBillableCharacters?: number | undefined;
                                                    totalTokens?: number | undefined;
                                                } | undefined;
                                                outputTokenCount?: {
                                                    totalBillableCharacters?: number | undefined;
                                                    totalTokens?: number | undefined;
                                                } | undefined;
                                            } | undefined;
                                        } | undefined;
                                        usageMetadata?: {
                                            promptTokenCount?: number | undefined;
                                            candidatesTokenCount?: number | undefined;
                                            totalTokenCount?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    databricks?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    friendliai?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    nvidia?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                    xai?: {
                                        usage?: {
                                            promptTokens?: number | undefined;
                                            completionTokens?: number | undefined;
                                            totalTokens?: number | undefined;
                                        } | undefined;
                                    } | undefined;
                                } | undefined;
                            }[] | undefined;
                        } | undefined;
                    }[] | undefined;
                    generativeGroupedResults?: {
                        values?: {
                            result?: string | undefined;
                            debug?: {
                                fullPrompt?: string | undefined;
                            } | undefined;
                            metadata?: {
                                anthropic?: {
                                    usage?: {
                                        inputTokens?: number | undefined;
                                        outputTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                anyscale?: {} | undefined;
                                aws?: {} | undefined;
                                cohere?: {
                                    apiVersion?: {
                                        version?: string | undefined;
                                        isDeprecated?: boolean | undefined;
                                        isExperimental?: boolean | undefined;
                                    } | undefined;
                                    billedUnits?: {
                                        inputTokens?: number | undefined;
                                        outputTokens?: number | undefined;
                                        searchUnits?: number | undefined;
                                        classifications?: number | undefined;
                                    } | undefined;
                                    tokens?: {
                                        inputTokens?: number | undefined;
                                        outputTokens?: number | undefined;
                                    } | undefined;
                                    warnings?: {
                                        values?: string[] | undefined;
                                    } | undefined;
                                } | undefined;
                                dummy?: {} | undefined;
                                mistral?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                ollama?: {} | undefined;
                                openai?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                google?: {
                                    metadata?: {
                                        tokenMetadata?: {
                                            inputTokenCount?: {
                                                totalBillableCharacters?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                            outputTokenCount?: {
                                                totalBillableCharacters?: number | undefined;
                                                totalTokens?: number | undefined;
                                            } | undefined;
                                        } | undefined;
                                    } | undefined;
                                    usageMetadata?: {
                                        promptTokenCount?: number | undefined;
                                        candidatesTokenCount?: number | undefined;
                                        totalTokenCount?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                databricks?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                friendliai?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                nvidia?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                                xai?: {
                                    usage?: {
                                        promptTokens?: number | undefined;
                                        completionTokens?: number | undefined;
                                        totalTokens?: number | undefined;
                                    } | undefined;
                                } | undefined;
                            } | undefined;
                        }[] | undefined;
                    } | undefined;
                }): SearchReply;
            };
            readonly responseStream: false;
            readonly options: {};
        };
        readonly batchObjects: {
            readonly name: "BatchObjects";
            readonly requestType: {
                encode(message: BatchObjectsRequest, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): BatchObjectsRequest;
                fromJSON(object: any): BatchObjectsRequest;
                toJSON(message: BatchObjectsRequest): unknown;
                create(base?: {
                    objects?: {
                        uuid?: string | undefined;
                        vector?: number[] | undefined;
                        properties?: {
                            nonRefProperties?: {
                                [x: string]: any;
                            } | undefined;
                            singleTargetRefProps?: {
                                uuids?: string[] | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            multiTargetRefProps?: {
                                uuids?: string[] | undefined;
                                propName?: string | undefined;
                                targetCollection?: string | undefined;
                            }[] | undefined;
                            numberArrayProperties?: {
                                values?: number[] | undefined;
                                propName?: string | undefined;
                                valuesBytes?: Uint8Array | undefined;
                            }[] | undefined;
                            intArrayProperties?: {
                                values?: number[] | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            textArrayProperties?: {
                                values?: string[] | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            booleanArrayProperties?: {
                                values?: boolean[] | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            objectProperties?: {
                                value?: {
                                    nonRefProperties?: {
                                        [x: string]: any;
                                    } | undefined;
                                    numberArrayProperties?: {
                                        values?: number[] | undefined;
                                        propName?: string | undefined;
                                        valuesBytes?: Uint8Array | undefined;
                                    }[] | undefined;
                                    intArrayProperties?: {
                                        values?: number[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    textArrayProperties?: {
                                        values?: string[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    booleanArrayProperties?: {
                                        values?: boolean[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    objectProperties?: any[] | undefined;
                                    objectArrayProperties?: {
                                        values?: any[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    emptyListProps?: string[] | undefined;
                                } | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            objectArrayProperties?: {
                                values?: {
                                    nonRefProperties?: {
                                        [x: string]: any;
                                    } | undefined;
                                    numberArrayProperties?: {
                                        values?: number[] | undefined;
                                        propName?: string | undefined;
                                        valuesBytes?: Uint8Array | undefined;
                                    }[] | undefined;
                                    intArrayProperties?: {
                                        values?: number[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    textArrayProperties?: {
                                        values?: string[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    booleanArrayProperties?: {
                                        values?: boolean[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    objectProperties?: {
                                        value?: any | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    objectArrayProperties?: any[] | undefined;
                                    emptyListProps?: string[] | undefined;
                                }[] | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            emptyListProps?: string[] | undefined;
                        } | undefined;
                        collection?: string | undefined;
                        tenant?: string | undefined;
                        vectorBytes?: Uint8Array | undefined;
                        vectors?: {
                            name?: string | undefined;
                            index?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            type?: import("./base.js").Vectors_VectorType | undefined;
                        }[] | undefined;
                    }[] | undefined;
                    consistencyLevel?: import("./base.js").ConsistencyLevel | undefined;
                } | undefined): BatchObjectsRequest;
                fromPartial(object: {
                    objects?: {
                        uuid?: string | undefined;
                        vector?: number[] | undefined;
                        properties?: {
                            nonRefProperties?: {
                                [x: string]: any;
                            } | undefined;
                            singleTargetRefProps?: {
                                uuids?: string[] | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            multiTargetRefProps?: {
                                uuids?: string[] | undefined;
                                propName?: string | undefined;
                                targetCollection?: string | undefined;
                            }[] | undefined;
                            numberArrayProperties?: {
                                values?: number[] | undefined;
                                propName?: string | undefined;
                                valuesBytes?: Uint8Array | undefined;
                            }[] | undefined;
                            intArrayProperties?: {
                                values?: number[] | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            textArrayProperties?: {
                                values?: string[] | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            booleanArrayProperties?: {
                                values?: boolean[] | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            objectProperties?: {
                                value?: {
                                    nonRefProperties?: {
                                        [x: string]: any;
                                    } | undefined;
                                    numberArrayProperties?: {
                                        values?: number[] | undefined;
                                        propName?: string | undefined;
                                        valuesBytes?: Uint8Array | undefined;
                                    }[] | undefined;
                                    intArrayProperties?: {
                                        values?: number[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    textArrayProperties?: {
                                        values?: string[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    booleanArrayProperties?: {
                                        values?: boolean[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    objectProperties?: any[] | undefined;
                                    objectArrayProperties?: {
                                        values?: any[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    emptyListProps?: string[] | undefined;
                                } | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            objectArrayProperties?: {
                                values?: {
                                    nonRefProperties?: {
                                        [x: string]: any;
                                    } | undefined;
                                    numberArrayProperties?: {
                                        values?: number[] | undefined;
                                        propName?: string | undefined;
                                        valuesBytes?: Uint8Array | undefined;
                                    }[] | undefined;
                                    intArrayProperties?: {
                                        values?: number[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    textArrayProperties?: {
                                        values?: string[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    booleanArrayProperties?: {
                                        values?: boolean[] | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    objectProperties?: {
                                        value?: any | undefined;
                                        propName?: string | undefined;
                                    }[] | undefined;
                                    objectArrayProperties?: any[] | undefined;
                                    emptyListProps?: string[] | undefined;
                                }[] | undefined;
                                propName?: string | undefined;
                            }[] | undefined;
                            emptyListProps?: string[] | undefined;
                        } | undefined;
                        collection?: string | undefined;
                        tenant?: string | undefined;
                        vectorBytes?: Uint8Array | undefined;
                        vectors?: {
                            name?: string | undefined;
                            index?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            type?: import("./base.js").Vectors_VectorType | undefined;
                        }[] | undefined;
                    }[] | undefined;
                    consistencyLevel?: import("./base.js").ConsistencyLevel | undefined;
                }): BatchObjectsRequest;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: BatchObjectsReply, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): BatchObjectsReply;
                fromJSON(object: any): BatchObjectsReply;
                toJSON(message: BatchObjectsReply): unknown;
                create(base?: {
                    took?: number | undefined;
                    errors?: {
                        index?: number | undefined;
                        error?: string | undefined;
                    }[] | undefined;
                } | undefined): BatchObjectsReply;
                fromPartial(object: {
                    took?: number | undefined;
                    errors?: {
                        index?: number | undefined;
                        error?: string | undefined;
                    }[] | undefined;
                }): BatchObjectsReply;
            };
            readonly responseStream: false;
            readonly options: {};
        };
        readonly batchReferences: {
            readonly name: "BatchReferences";
            readonly requestType: {
                encode(message: BatchReferencesRequest, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): BatchReferencesRequest;
                fromJSON(object: any): BatchReferencesRequest;
                toJSON(message: BatchReferencesRequest): unknown;
                create(base?: {
                    references?: {
                        name?: string | undefined;
                        fromCollection?: string | undefined;
                        fromUuid?: string | undefined;
                        toCollection?: string | undefined;
                        toUuid?: string | undefined;
                        tenant?: string | undefined;
                    }[] | undefined;
                    consistencyLevel?: import("./base.js").ConsistencyLevel | undefined;
                } | undefined): BatchReferencesRequest;
                fromPartial(object: {
                    references?: {
                        name?: string | undefined;
                        fromCollection?: string | undefined;
                        fromUuid?: string | undefined;
                        toCollection?: string | undefined;
                        toUuid?: string | undefined;
                        tenant?: string | undefined;
                    }[] | undefined;
                    consistencyLevel?: import("./base.js").ConsistencyLevel | undefined;
                }): BatchReferencesRequest;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: BatchReferencesReply, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): BatchReferencesReply;
                fromJSON(object: any): BatchReferencesReply;
                toJSON(message: BatchReferencesReply): unknown;
                create(base?: {
                    took?: number | undefined;
                    errors?: {
                        index?: number | undefined;
                        error?: string | undefined;
                    }[] | undefined;
                } | undefined): BatchReferencesReply;
                fromPartial(object: {
                    took?: number | undefined;
                    errors?: {
                        index?: number | undefined;
                        error?: string | undefined;
                    }[] | undefined;
                }): BatchReferencesReply;
            };
            readonly responseStream: false;
            readonly options: {};
        };
        readonly batchDelete: {
            readonly name: "BatchDelete";
            readonly requestType: {
                encode(message: BatchDeleteRequest, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): BatchDeleteRequest;
                fromJSON(object: any): BatchDeleteRequest;
                toJSON(message: BatchDeleteRequest): unknown;
                create(base?: {
                    collection?: string | undefined;
                    filters?: {
                        operator?: import("./base.js").Filters_Operator | undefined;
                        on?: string[] | undefined;
                        filters?: any[] | undefined;
                        valueText?: string | undefined;
                        valueInt?: number | undefined;
                        valueBoolean?: boolean | undefined;
                        valueNumber?: number | undefined;
                        valueTextArray?: {
                            values?: string[] | undefined;
                        } | undefined;
                        valueIntArray?: {
                            values?: number[] | undefined;
                        } | undefined;
                        valueBooleanArray?: {
                            values?: boolean[] | undefined;
                        } | undefined;
                        valueNumberArray?: {
                            values?: number[] | undefined;
                        } | undefined;
                        valueGeo?: {
                            latitude?: number | undefined;
                            longitude?: number | undefined;
                            distance?: number | undefined;
                        } | undefined;
                        target?: {
                            property?: string | undefined;
                            singleTarget?: {
                                on?: string | undefined;
                                target?: any | undefined;
                            } | undefined;
                            multiTarget?: {
                                on?: string | undefined;
                                target?: any | undefined;
                                targetCollection?: string | undefined;
                            } | undefined;
                            count?: {
                                on?: string | undefined;
                            } | undefined;
                        } | undefined;
                    } | undefined;
                    verbose?: boolean | undefined;
                    dryRun?: boolean | undefined;
                    consistencyLevel?: import("./base.js").ConsistencyLevel | undefined;
                    tenant?: string | undefined;
                } | undefined): BatchDeleteRequest;
                fromPartial(object: {
                    collection?: string | undefined;
                    filters?: {
                        operator?: import("./base.js").Filters_Operator | undefined;
                        on?: string[] | undefined;
                        filters?: any[] | undefined;
                        valueText?: string | undefined;
                        valueInt?: number | undefined;
                        valueBoolean?: boolean | undefined;
                        valueNumber?: number | undefined;
                        valueTextArray?: {
                            values?: string[] | undefined;
                        } | undefined;
                        valueIntArray?: {
                            values?: number[] | undefined;
                        } | undefined;
                        valueBooleanArray?: {
                            values?: boolean[] | undefined;
                        } | undefined;
                        valueNumberArray?: {
                            values?: number[] | undefined;
                        } | undefined;
                        valueGeo?: {
                            latitude?: number | undefined;
                            longitude?: number | undefined;
                            distance?: number | undefined;
                        } | undefined;
                        target?: {
                            property?: string | undefined;
                            singleTarget?: {
                                on?: string | undefined;
                                target?: any | undefined;
                            } | undefined;
                            multiTarget?: {
                                on?: string | undefined;
                                target?: any | undefined;
                                targetCollection?: string | undefined;
                            } | undefined;
                            count?: {
                                on?: string | undefined;
                            } | undefined;
                        } | undefined;
                    } | undefined;
                    verbose?: boolean | undefined;
                    dryRun?: boolean | undefined;
                    consistencyLevel?: import("./base.js").ConsistencyLevel | undefined;
                    tenant?: string | undefined;
                }): BatchDeleteRequest;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: BatchDeleteReply, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): BatchDeleteReply;
                fromJSON(object: any): BatchDeleteReply;
                toJSON(message: BatchDeleteReply): unknown;
                create(base?: {
                    took?: number | undefined;
                    failed?: number | undefined;
                    matches?: number | undefined;
                    successful?: number | undefined;
                    objects?: {
                        uuid?: Uint8Array | undefined;
                        successful?: boolean | undefined;
                        error?: string | undefined;
                    }[] | undefined;
                } | undefined): BatchDeleteReply;
                fromPartial(object: {
                    took?: number | undefined;
                    failed?: number | undefined;
                    matches?: number | undefined;
                    successful?: number | undefined;
                    objects?: {
                        uuid?: Uint8Array | undefined;
                        successful?: boolean | undefined;
                        error?: string | undefined;
                    }[] | undefined;
                }): BatchDeleteReply;
            };
            readonly responseStream: false;
            readonly options: {};
        };
        readonly tenantsGet: {
            readonly name: "TenantsGet";
            readonly requestType: {
                encode(message: TenantsGetRequest, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): TenantsGetRequest;
                fromJSON(object: any): TenantsGetRequest;
                toJSON(message: TenantsGetRequest): unknown;
                create(base?: {
                    collection?: string | undefined;
                    names?: {
                        values?: string[] | undefined;
                    } | undefined;
                } | undefined): TenantsGetRequest;
                fromPartial(object: {
                    collection?: string | undefined;
                    names?: {
                        values?: string[] | undefined;
                    } | undefined;
                }): TenantsGetRequest;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: TenantsGetReply, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): TenantsGetReply;
                fromJSON(object: any): TenantsGetReply;
                toJSON(message: TenantsGetReply): unknown;
                create(base?: {
                    took?: number | undefined;
                    tenants?: {
                        name?: string | undefined;
                        activityStatus?: import("./tenants.js").TenantActivityStatus | undefined;
                    }[] | undefined;
                } | undefined): TenantsGetReply;
                fromPartial(object: {
                    took?: number | undefined;
                    tenants?: {
                        name?: string | undefined;
                        activityStatus?: import("./tenants.js").TenantActivityStatus | undefined;
                    }[] | undefined;
                }): TenantsGetReply;
            };
            readonly responseStream: false;
            readonly options: {};
        };
        readonly aggregate: {
            readonly name: "Aggregate";
            readonly requestType: {
                encode(message: AggregateRequest, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): AggregateRequest;
                fromJSON(object: any): AggregateRequest;
                toJSON(message: AggregateRequest): unknown;
                create(base?: {
                    collection?: string | undefined;
                    tenant?: string | undefined;
                    objectsCount?: boolean | undefined;
                    aggregations?: {
                        property?: string | undefined;
                        int?: {
                            count?: boolean | undefined;
                            type?: boolean | undefined;
                            sum?: boolean | undefined;
                            mean?: boolean | undefined;
                            mode?: boolean | undefined;
                            median?: boolean | undefined;
                            maximum?: boolean | undefined;
                            minimum?: boolean | undefined;
                        } | undefined;
                        number?: {
                            count?: boolean | undefined;
                            type?: boolean | undefined;
                            sum?: boolean | undefined;
                            mean?: boolean | undefined;
                            mode?: boolean | undefined;
                            median?: boolean | undefined;
                            maximum?: boolean | undefined;
                            minimum?: boolean | undefined;
                        } | undefined;
                        text?: {
                            count?: boolean | undefined;
                            type?: boolean | undefined;
                            topOccurences?: boolean | undefined;
                            topOccurencesLimit?: number | undefined;
                        } | undefined;
                        boolean?: {
                            count?: boolean | undefined;
                            type?: boolean | undefined;
                            totalTrue?: boolean | undefined;
                            totalFalse?: boolean | undefined;
                            percentageTrue?: boolean | undefined;
                            percentageFalse?: boolean | undefined;
                        } | undefined;
                        date?: {
                            count?: boolean | undefined;
                            type?: boolean | undefined;
                            median?: boolean | undefined;
                            mode?: boolean | undefined;
                            maximum?: boolean | undefined;
                            minimum?: boolean | undefined;
                        } | undefined;
                        reference?: {
                            type?: boolean | undefined;
                            pointingTo?: boolean | undefined;
                        } | undefined;
                    }[] | undefined;
                    objectLimit?: number | undefined;
                    groupBy?: {
                        collection?: string | undefined;
                        property?: string | undefined;
                    } | undefined;
                    limit?: number | undefined;
                    filters?: {
                        operator?: import("./base.js").Filters_Operator | undefined;
                        on?: string[] | undefined;
                        filters?: any[] | undefined;
                        valueText?: string | undefined;
                        valueInt?: number | undefined;
                        valueBoolean?: boolean | undefined;
                        valueNumber?: number | undefined;
                        valueTextArray?: {
                            values?: string[] | undefined;
                        } | undefined;
                        valueIntArray?: {
                            values?: number[] | undefined;
                        } | undefined;
                        valueBooleanArray?: {
                            values?: boolean[] | undefined;
                        } | undefined;
                        valueNumberArray?: {
                            values?: number[] | undefined;
                        } | undefined;
                        valueGeo?: {
                            latitude?: number | undefined;
                            longitude?: number | undefined;
                            distance?: number | undefined;
                        } | undefined;
                        target?: {
                            property?: string | undefined;
                            singleTarget?: {
                                on?: string | undefined;
                                target?: any | undefined;
                            } | undefined;
                            multiTarget?: {
                                on?: string | undefined;
                                target?: any | undefined;
                                targetCollection?: string | undefined;
                            } | undefined;
                            count?: {
                                on?: string | undefined;
                            } | undefined;
                        } | undefined;
                    } | undefined;
                    hybrid?: {
                        query?: string | undefined;
                        properties?: string[] | undefined;
                        vector?: number[] | undefined;
                        alpha?: number | undefined;
                        fusionType?: import("./base_search.js").Hybrid_FusionType | undefined;
                        vectorBytes?: Uint8Array | undefined;
                        targetVectors?: string[] | undefined;
                        nearText?: {
                            query?: string[] | undefined;
                            certainty?: number | undefined;
                            distance?: number | undefined;
                            moveTo?: {
                                force?: number | undefined;
                                concepts?: string[] | undefined;
                                uuids?: string[] | undefined;
                            } | undefined;
                            moveAway?: {
                                force?: number | undefined;
                                concepts?: string[] | undefined;
                                uuids?: string[] | undefined;
                            } | undefined;
                            targetVectors?: string[] | undefined;
                            targets?: {
                                targetVectors?: string[] | undefined;
                                combination?: import("./base_search.js").CombinationMethod | undefined;
                                weightsForTargets?: {
                                    target?: string | undefined;
                                    weight?: number | undefined;
                                }[] | undefined;
                            } | undefined;
                        } | undefined;
                        nearVector?: {
                            vector?: number[] | undefined;
                            certainty?: number | undefined;
                            distance?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            targetVectors?: string[] | undefined;
                            targets?: {
                                targetVectors?: string[] | undefined;
                                combination?: import("./base_search.js").CombinationMethod | undefined;
                                weightsForTargets?: {
                                    target?: string | undefined;
                                    weight?: number | undefined;
                                }[] | undefined;
                            } | undefined;
                            vectorPerTarget?: {
                                [x: string]: Uint8Array | undefined;
                            } | undefined;
                            vectorForTargets?: {
                                name?: string | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                vectors?: {
                                    name?: string | undefined;
                                    index?: number | undefined;
                                    vectorBytes?: Uint8Array | undefined;
                                    type?: import("./base.js").Vectors_VectorType | undefined;
                                }[] | undefined;
                            }[] | undefined;
                            vectors?: {
                                name?: string | undefined;
                                index?: number | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                type?: import("./base.js").Vectors_VectorType | undefined;
                            }[] | undefined;
                        } | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                        bm25SearchOperator?: {
                            operator?: import("./base_search.js").SearchOperatorOptions_Operator | undefined;
                            minimumOrTokensMatch?: number | undefined;
                        } | undefined;
                        vectorDistance?: number | undefined;
                        vectors?: {
                            name?: string | undefined;
                            index?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            type?: import("./base.js").Vectors_VectorType | undefined;
                        }[] | undefined;
                    } | undefined;
                    nearVector?: {
                        vector?: number[] | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        vectorBytes?: Uint8Array | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                        vectorPerTarget?: {
                            [x: string]: Uint8Array | undefined;
                        } | undefined;
                        vectorForTargets?: {
                            name?: string | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            vectors?: {
                                name?: string | undefined;
                                index?: number | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                type?: import("./base.js").Vectors_VectorType | undefined;
                            }[] | undefined;
                        }[] | undefined;
                        vectors?: {
                            name?: string | undefined;
                            index?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            type?: import("./base.js").Vectors_VectorType | undefined;
                        }[] | undefined;
                    } | undefined;
                    nearObject?: {
                        id?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearText?: {
                        query?: string[] | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        moveTo?: {
                            force?: number | undefined;
                            concepts?: string[] | undefined;
                            uuids?: string[] | undefined;
                        } | undefined;
                        moveAway?: {
                            force?: number | undefined;
                            concepts?: string[] | undefined;
                            uuids?: string[] | undefined;
                        } | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearImage?: {
                        image?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearAudio?: {
                        audio?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearVideo?: {
                        video?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearDepth?: {
                        depth?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearThermal?: {
                        thermal?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearImu?: {
                        imu?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                } | undefined): AggregateRequest;
                fromPartial(object: {
                    collection?: string | undefined;
                    tenant?: string | undefined;
                    objectsCount?: boolean | undefined;
                    aggregations?: {
                        property?: string | undefined;
                        int?: {
                            count?: boolean | undefined;
                            type?: boolean | undefined;
                            sum?: boolean | undefined;
                            mean?: boolean | undefined;
                            mode?: boolean | undefined;
                            median?: boolean | undefined;
                            maximum?: boolean | undefined;
                            minimum?: boolean | undefined;
                        } | undefined;
                        number?: {
                            count?: boolean | undefined;
                            type?: boolean | undefined;
                            sum?: boolean | undefined;
                            mean?: boolean | undefined;
                            mode?: boolean | undefined;
                            median?: boolean | undefined;
                            maximum?: boolean | undefined;
                            minimum?: boolean | undefined;
                        } | undefined;
                        text?: {
                            count?: boolean | undefined;
                            type?: boolean | undefined;
                            topOccurences?: boolean | undefined;
                            topOccurencesLimit?: number | undefined;
                        } | undefined;
                        boolean?: {
                            count?: boolean | undefined;
                            type?: boolean | undefined;
                            totalTrue?: boolean | undefined;
                            totalFalse?: boolean | undefined;
                            percentageTrue?: boolean | undefined;
                            percentageFalse?: boolean | undefined;
                        } | undefined;
                        date?: {
                            count?: boolean | undefined;
                            type?: boolean | undefined;
                            median?: boolean | undefined;
                            mode?: boolean | undefined;
                            maximum?: boolean | undefined;
                            minimum?: boolean | undefined;
                        } | undefined;
                        reference?: {
                            type?: boolean | undefined;
                            pointingTo?: boolean | undefined;
                        } | undefined;
                    }[] | undefined;
                    objectLimit?: number | undefined;
                    groupBy?: {
                        collection?: string | undefined;
                        property?: string | undefined;
                    } | undefined;
                    limit?: number | undefined;
                    filters?: {
                        operator?: import("./base.js").Filters_Operator | undefined;
                        on?: string[] | undefined;
                        filters?: any[] | undefined;
                        valueText?: string | undefined;
                        valueInt?: number | undefined;
                        valueBoolean?: boolean | undefined;
                        valueNumber?: number | undefined;
                        valueTextArray?: {
                            values?: string[] | undefined;
                        } | undefined;
                        valueIntArray?: {
                            values?: number[] | undefined;
                        } | undefined;
                        valueBooleanArray?: {
                            values?: boolean[] | undefined;
                        } | undefined;
                        valueNumberArray?: {
                            values?: number[] | undefined;
                        } | undefined;
                        valueGeo?: {
                            latitude?: number | undefined;
                            longitude?: number | undefined;
                            distance?: number | undefined;
                        } | undefined;
                        target?: {
                            property?: string | undefined;
                            singleTarget?: {
                                on?: string | undefined;
                                target?: any | undefined;
                            } | undefined;
                            multiTarget?: {
                                on?: string | undefined;
                                target?: any | undefined;
                                targetCollection?: string | undefined;
                            } | undefined;
                            count?: {
                                on?: string | undefined;
                            } | undefined;
                        } | undefined;
                    } | undefined;
                    hybrid?: {
                        query?: string | undefined;
                        properties?: string[] | undefined;
                        vector?: number[] | undefined;
                        alpha?: number | undefined;
                        fusionType?: import("./base_search.js").Hybrid_FusionType | undefined;
                        vectorBytes?: Uint8Array | undefined;
                        targetVectors?: string[] | undefined;
                        nearText?: {
                            query?: string[] | undefined;
                            certainty?: number | undefined;
                            distance?: number | undefined;
                            moveTo?: {
                                force?: number | undefined;
                                concepts?: string[] | undefined;
                                uuids?: string[] | undefined;
                            } | undefined;
                            moveAway?: {
                                force?: number | undefined;
                                concepts?: string[] | undefined;
                                uuids?: string[] | undefined;
                            } | undefined;
                            targetVectors?: string[] | undefined;
                            targets?: {
                                targetVectors?: string[] | undefined;
                                combination?: import("./base_search.js").CombinationMethod | undefined;
                                weightsForTargets?: {
                                    target?: string | undefined;
                                    weight?: number | undefined;
                                }[] | undefined;
                            } | undefined;
                        } | undefined;
                        nearVector?: {
                            vector?: number[] | undefined;
                            certainty?: number | undefined;
                            distance?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            targetVectors?: string[] | undefined;
                            targets?: {
                                targetVectors?: string[] | undefined;
                                combination?: import("./base_search.js").CombinationMethod | undefined;
                                weightsForTargets?: {
                                    target?: string | undefined;
                                    weight?: number | undefined;
                                }[] | undefined;
                            } | undefined;
                            vectorPerTarget?: {
                                [x: string]: Uint8Array | undefined;
                            } | undefined;
                            vectorForTargets?: {
                                name?: string | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                vectors?: {
                                    name?: string | undefined;
                                    index?: number | undefined;
                                    vectorBytes?: Uint8Array | undefined;
                                    type?: import("./base.js").Vectors_VectorType | undefined;
                                }[] | undefined;
                            }[] | undefined;
                            vectors?: {
                                name?: string | undefined;
                                index?: number | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                type?: import("./base.js").Vectors_VectorType | undefined;
                            }[] | undefined;
                        } | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                        bm25SearchOperator?: {
                            operator?: import("./base_search.js").SearchOperatorOptions_Operator | undefined;
                            minimumOrTokensMatch?: number | undefined;
                        } | undefined;
                        vectorDistance?: number | undefined;
                        vectors?: {
                            name?: string | undefined;
                            index?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            type?: import("./base.js").Vectors_VectorType | undefined;
                        }[] | undefined;
                    } | undefined;
                    nearVector?: {
                        vector?: number[] | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        vectorBytes?: Uint8Array | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                        vectorPerTarget?: {
                            [x: string]: Uint8Array | undefined;
                        } | undefined;
                        vectorForTargets?: {
                            name?: string | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            vectors?: {
                                name?: string | undefined;
                                index?: number | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                type?: import("./base.js").Vectors_VectorType | undefined;
                            }[] | undefined;
                        }[] | undefined;
                        vectors?: {
                            name?: string | undefined;
                            index?: number | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            type?: import("./base.js").Vectors_VectorType | undefined;
                        }[] | undefined;
                    } | undefined;
                    nearObject?: {
                        id?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearText?: {
                        query?: string[] | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        moveTo?: {
                            force?: number | undefined;
                            concepts?: string[] | undefined;
                            uuids?: string[] | undefined;
                        } | undefined;
                        moveAway?: {
                            force?: number | undefined;
                            concepts?: string[] | undefined;
                            uuids?: string[] | undefined;
                        } | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearImage?: {
                        image?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearAudio?: {
                        audio?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearVideo?: {
                        video?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearDepth?: {
                        depth?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearThermal?: {
                        thermal?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    nearImu?: {
                        imu?: string | undefined;
                        certainty?: number | undefined;
                        distance?: number | undefined;
                        targetVectors?: string[] | undefined;
                        targets?: {
                            targetVectors?: string[] | undefined;
                            combination?: import("./base_search.js").CombinationMethod | undefined;
                            weightsForTargets?: {
                                target?: string | undefined;
                                weight?: number | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                }): AggregateRequest;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: AggregateReply, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): AggregateReply;
                fromJSON(object: any): AggregateReply;
                toJSON(message: AggregateReply): unknown;
                create(base?: {
                    took?: number | undefined;
                    singleResult?: {
                        objectsCount?: number | undefined;
                        aggregations?: {
                            aggregations?: {
                                property?: string | undefined;
                                int?: {
                                    count?: number | undefined;
                                    type?: string | undefined;
                                    mean?: number | undefined;
                                    median?: number | undefined;
                                    mode?: number | undefined;
                                    maximum?: number | undefined;
                                    minimum?: number | undefined;
                                    sum?: number | undefined;
                                } | undefined;
                                number?: {
                                    count?: number | undefined;
                                    type?: string | undefined;
                                    mean?: number | undefined;
                                    median?: number | undefined;
                                    mode?: number | undefined;
                                    maximum?: number | undefined;
                                    minimum?: number | undefined;
                                    sum?: number | undefined;
                                } | undefined;
                                text?: {
                                    count?: number | undefined;
                                    type?: string | undefined;
                                    topOccurences?: {
                                        items?: {
                                            value?: string | undefined;
                                            occurs?: number | undefined;
                                        }[] | undefined;
                                    } | undefined;
                                } | undefined;
                                boolean?: {
                                    count?: number | undefined;
                                    type?: string | undefined;
                                    totalTrue?: number | undefined;
                                    totalFalse?: number | undefined;
                                    percentageTrue?: number | undefined;
                                    percentageFalse?: number | undefined;
                                } | undefined;
                                date?: {
                                    count?: number | undefined;
                                    type?: string | undefined;
                                    median?: string | undefined;
                                    mode?: string | undefined;
                                    maximum?: string | undefined;
                                    minimum?: string | undefined;
                                } | undefined;
                                reference?: {
                                    type?: string | undefined;
                                    pointingTo?: string[] | undefined;
                                } | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    groupedResults?: {
                        groups?: {
                            objectsCount?: number | undefined;
                            aggregations?: {
                                aggregations?: {
                                    property?: string | undefined;
                                    int?: {
                                        count?: number | undefined;
                                        type?: string | undefined;
                                        mean?: number | undefined;
                                        median?: number | undefined;
                                        mode?: number | undefined;
                                        maximum?: number | undefined;
                                        minimum?: number | undefined;
                                        sum?: number | undefined;
                                    } | undefined;
                                    number?: {
                                        count?: number | undefined;
                                        type?: string | undefined;
                                        mean?: number | undefined;
                                        median?: number | undefined;
                                        mode?: number | undefined;
                                        maximum?: number | undefined;
                                        minimum?: number | undefined;
                                        sum?: number | undefined;
                                    } | undefined;
                                    text?: {
                                        count?: number | undefined;
                                        type?: string | undefined;
                                        topOccurences?: {
                                            items?: {
                                                value?: string | undefined;
                                                occurs?: number | undefined;
                                            }[] | undefined;
                                        } | undefined;
                                    } | undefined;
                                    boolean?: {
                                        count?: number | undefined;
                                        type?: string | undefined;
                                        totalTrue?: number | undefined;
                                        totalFalse?: number | undefined;
                                        percentageTrue?: number | undefined;
                                        percentageFalse?: number | undefined;
                                    } | undefined;
                                    date?: {
                                        count?: number | undefined;
                                        type?: string | undefined;
                                        median?: string | undefined;
                                        mode?: string | undefined;
                                        maximum?: string | undefined;
                                        minimum?: string | undefined;
                                    } | undefined;
                                    reference?: {
                                        type?: string | undefined;
                                        pointingTo?: string[] | undefined;
                                    } | undefined;
                                }[] | undefined;
                            } | undefined;
                            groupedBy?: {
                                path?: string[] | undefined;
                                text?: string | undefined;
                                int?: number | undefined;
                                boolean?: boolean | undefined;
                                number?: number | undefined;
                                texts?: {
                                    values?: string[] | undefined;
                                } | undefined;
                                ints?: {
                                    values?: number[] | undefined;
                                } | undefined;
                                booleans?: {
                                    values?: boolean[] | undefined;
                                } | undefined;
                                numbers?: {
                                    values?: number[] | undefined;
                                } | undefined;
                                geo?: {
                                    latitude?: number | undefined;
                                    longitude?: number | undefined;
                                    distance?: number | undefined;
                                } | undefined;
                            } | undefined;
                        }[] | undefined;
                    } | undefined;
                } | undefined): AggregateReply;
                fromPartial(object: {
                    took?: number | undefined;
                    singleResult?: {
                        objectsCount?: number | undefined;
                        aggregations?: {
                            aggregations?: {
                                property?: string | undefined;
                                int?: {
                                    count?: number | undefined;
                                    type?: string | undefined;
                                    mean?: number | undefined;
                                    median?: number | undefined;
                                    mode?: number | undefined;
                                    maximum?: number | undefined;
                                    minimum?: number | undefined;
                                    sum?: number | undefined;
                                } | undefined;
                                number?: {
                                    count?: number | undefined;
                                    type?: string | undefined;
                                    mean?: number | undefined;
                                    median?: number | undefined;
                                    mode?: number | undefined;
                                    maximum?: number | undefined;
                                    minimum?: number | undefined;
                                    sum?: number | undefined;
                                } | undefined;
                                text?: {
                                    count?: number | undefined;
                                    type?: string | undefined;
                                    topOccurences?: {
                                        items?: {
                                            value?: string | undefined;
                                            occurs?: number | undefined;
                                        }[] | undefined;
                                    } | undefined;
                                } | undefined;
                                boolean?: {
                                    count?: number | undefined;
                                    type?: string | undefined;
                                    totalTrue?: number | undefined;
                                    totalFalse?: number | undefined;
                                    percentageTrue?: number | undefined;
                                    percentageFalse?: number | undefined;
                                } | undefined;
                                date?: {
                                    count?: number | undefined;
                                    type?: string | undefined;
                                    median?: string | undefined;
                                    mode?: string | undefined;
                                    maximum?: string | undefined;
                                    minimum?: string | undefined;
                                } | undefined;
                                reference?: {
                                    type?: string | undefined;
                                    pointingTo?: string[] | undefined;
                                } | undefined;
                            }[] | undefined;
                        } | undefined;
                    } | undefined;
                    groupedResults?: {
                        groups?: {
                            objectsCount?: number | undefined;
                            aggregations?: {
                                aggregations?: {
                                    property?: string | undefined;
                                    int?: {
                                        count?: number | undefined;
                                        type?: string | undefined;
                                        mean?: number | undefined;
                                        median?: number | undefined;
                                        mode?: number | undefined;
                                        maximum?: number | undefined;
                                        minimum?: number | undefined;
                                        sum?: number | undefined;
                                    } | undefined;
                                    number?: {
                                        count?: number | undefined;
                                        type?: string | undefined;
                                        mean?: number | undefined;
                                        median?: number | undefined;
                                        mode?: number | undefined;
                                        maximum?: number | undefined;
                                        minimum?: number | undefined;
                                        sum?: number | undefined;
                                    } | undefined;
                                    text?: {
                                        count?: number | undefined;
                                        type?: string | undefined;
                                        topOccurences?: {
                                            items?: {
                                                value?: string | undefined;
                                                occurs?: number | undefined;
                                            }[] | undefined;
                                        } | undefined;
                                    } | undefined;
                                    boolean?: {
                                        count?: number | undefined;
                                        type?: string | undefined;
                                        totalTrue?: number | undefined;
                                        totalFalse?: number | undefined;
                                        percentageTrue?: number | undefined;
                                        percentageFalse?: number | undefined;
                                    } | undefined;
                                    date?: {
                                        count?: number | undefined;
                                        type?: string | undefined;
                                        median?: string | undefined;
                                        mode?: string | undefined;
                                        maximum?: string | undefined;
                                        minimum?: string | undefined;
                                    } | undefined;
                                    reference?: {
                                        type?: string | undefined;
                                        pointingTo?: string[] | undefined;
                                    } | undefined;
                                }[] | undefined;
                            } | undefined;
                            groupedBy?: {
                                path?: string[] | undefined;
                                text?: string | undefined;
                                int?: number | undefined;
                                boolean?: boolean | undefined;
                                number?: number | undefined;
                                texts?: {
                                    values?: string[] | undefined;
                                } | undefined;
                                ints?: {
                                    values?: number[] | undefined;
                                } | undefined;
                                booleans?: {
                                    values?: boolean[] | undefined;
                                } | undefined;
                                numbers?: {
                                    values?: number[] | undefined;
                                } | undefined;
                                geo?: {
                                    latitude?: number | undefined;
                                    longitude?: number | undefined;
                                    distance?: number | undefined;
                                } | undefined;
                            } | undefined;
                        }[] | undefined;
                    } | undefined;
                }): AggregateReply;
            };
            readonly responseStream: false;
            readonly options: {};
        };
        readonly batchSend: {
            readonly name: "BatchSend";
            readonly requestType: {
                encode(message: BatchSendRequest, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): BatchSendRequest;
                fromJSON(object: any): BatchSendRequest;
                toJSON(message: BatchSendRequest): unknown;
                create(base?: {
                    streamId?: string | undefined;
                    objects?: {
                        values?: {
                            uuid?: string | undefined;
                            vector?: number[] | undefined;
                            properties?: {
                                nonRefProperties?: {
                                    [x: string]: any;
                                } | undefined;
                                singleTargetRefProps?: {
                                    uuids?: string[] | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                multiTargetRefProps?: {
                                    uuids?: string[] | undefined;
                                    propName?: string | undefined;
                                    targetCollection?: string | undefined;
                                }[] | undefined;
                                numberArrayProperties?: {
                                    values?: number[] | undefined;
                                    propName?: string | undefined;
                                    valuesBytes?: Uint8Array | undefined;
                                }[] | undefined;
                                intArrayProperties?: {
                                    values?: number[] | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                textArrayProperties?: {
                                    values?: string[] | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                booleanArrayProperties?: {
                                    values?: boolean[] | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                objectProperties?: {
                                    value?: {
                                        nonRefProperties?: {
                                            [x: string]: any;
                                        } | undefined;
                                        numberArrayProperties?: {
                                            values?: number[] | undefined;
                                            propName?: string | undefined;
                                            valuesBytes?: Uint8Array | undefined;
                                        }[] | undefined;
                                        intArrayProperties?: {
                                            values?: number[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        textArrayProperties?: {
                                            values?: string[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        booleanArrayProperties?: {
                                            values?: boolean[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        objectProperties?: any[] | undefined;
                                        objectArrayProperties?: {
                                            values?: any[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        emptyListProps?: string[] | undefined;
                                    } | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                objectArrayProperties?: {
                                    values?: {
                                        nonRefProperties?: {
                                            [x: string]: any;
                                        } | undefined;
                                        numberArrayProperties?: {
                                            values?: number[] | undefined;
                                            propName?: string | undefined;
                                            valuesBytes?: Uint8Array | undefined;
                                        }[] | undefined;
                                        intArrayProperties?: {
                                            values?: number[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        textArrayProperties?: {
                                            values?: string[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        booleanArrayProperties?: {
                                            values?: boolean[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        objectProperties?: {
                                            value?: any | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        objectArrayProperties?: any[] | undefined;
                                        emptyListProps?: string[] | undefined;
                                    }[] | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                emptyListProps?: string[] | undefined;
                            } | undefined;
                            collection?: string | undefined;
                            tenant?: string | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            vectors?: {
                                name?: string | undefined;
                                index?: number | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                type?: import("./base.js").Vectors_VectorType | undefined;
                            }[] | undefined;
                        }[] | undefined;
                    } | undefined;
                    references?: {
                        values?: {
                            name?: string | undefined;
                            fromCollection?: string | undefined;
                            fromUuid?: string | undefined;
                            toCollection?: string | undefined;
                            toUuid?: string | undefined;
                            tenant?: string | undefined;
                        }[] | undefined;
                    } | undefined;
                    stop?: {} | undefined;
                } | undefined): BatchSendRequest;
                fromPartial(object: {
                    streamId?: string | undefined;
                    objects?: {
                        values?: {
                            uuid?: string | undefined;
                            vector?: number[] | undefined;
                            properties?: {
                                nonRefProperties?: {
                                    [x: string]: any;
                                } | undefined;
                                singleTargetRefProps?: {
                                    uuids?: string[] | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                multiTargetRefProps?: {
                                    uuids?: string[] | undefined;
                                    propName?: string | undefined;
                                    targetCollection?: string | undefined;
                                }[] | undefined;
                                numberArrayProperties?: {
                                    values?: number[] | undefined;
                                    propName?: string | undefined;
                                    valuesBytes?: Uint8Array | undefined;
                                }[] | undefined;
                                intArrayProperties?: {
                                    values?: number[] | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                textArrayProperties?: {
                                    values?: string[] | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                booleanArrayProperties?: {
                                    values?: boolean[] | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                objectProperties?: {
                                    value?: {
                                        nonRefProperties?: {
                                            [x: string]: any;
                                        } | undefined;
                                        numberArrayProperties?: {
                                            values?: number[] | undefined;
                                            propName?: string | undefined;
                                            valuesBytes?: Uint8Array | undefined;
                                        }[] | undefined;
                                        intArrayProperties?: {
                                            values?: number[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        textArrayProperties?: {
                                            values?: string[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        booleanArrayProperties?: {
                                            values?: boolean[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        objectProperties?: any[] | undefined;
                                        objectArrayProperties?: {
                                            values?: any[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        emptyListProps?: string[] | undefined;
                                    } | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                objectArrayProperties?: {
                                    values?: {
                                        nonRefProperties?: {
                                            [x: string]: any;
                                        } | undefined;
                                        numberArrayProperties?: {
                                            values?: number[] | undefined;
                                            propName?: string | undefined;
                                            valuesBytes?: Uint8Array | undefined;
                                        }[] | undefined;
                                        intArrayProperties?: {
                                            values?: number[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        textArrayProperties?: {
                                            values?: string[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        booleanArrayProperties?: {
                                            values?: boolean[] | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        objectProperties?: {
                                            value?: any | undefined;
                                            propName?: string | undefined;
                                        }[] | undefined;
                                        objectArrayProperties?: any[] | undefined;
                                        emptyListProps?: string[] | undefined;
                                    }[] | undefined;
                                    propName?: string | undefined;
                                }[] | undefined;
                                emptyListProps?: string[] | undefined;
                            } | undefined;
                            collection?: string | undefined;
                            tenant?: string | undefined;
                            vectorBytes?: Uint8Array | undefined;
                            vectors?: {
                                name?: string | undefined;
                                index?: number | undefined;
                                vectorBytes?: Uint8Array | undefined;
                                type?: import("./base.js").Vectors_VectorType | undefined;
                            }[] | undefined;
                        }[] | undefined;
                    } | undefined;
                    references?: {
                        values?: {
                            name?: string | undefined;
                            fromCollection?: string | undefined;
                            fromUuid?: string | undefined;
                            toCollection?: string | undefined;
                            toUuid?: string | undefined;
                            tenant?: string | undefined;
                        }[] | undefined;
                    } | undefined;
                    stop?: {} | undefined;
                }): BatchSendRequest;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: BatchSendReply, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): BatchSendReply;
                fromJSON(object: any): BatchSendReply;
                toJSON(message: BatchSendReply): unknown;
                create(base?: {
                    nextBatchSize?: number | undefined;
                    backoffSeconds?: number | undefined;
                } | undefined): BatchSendReply;
                fromPartial(object: {
                    nextBatchSize?: number | undefined;
                    backoffSeconds?: number | undefined;
                }): BatchSendReply;
            };
            readonly responseStream: false;
            readonly options: {};
        };
        readonly batchStream: {
            readonly name: "BatchStream";
            readonly requestType: {
                encode(message: BatchStreamRequest, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): BatchStreamRequest;
                fromJSON(object: any): BatchStreamRequest;
                toJSON(message: BatchStreamRequest): unknown;
                create(base?: {
                    consistencyLevel?: import("./base.js").ConsistencyLevel | undefined;
                    objectIndex?: number | undefined;
                    referenceIndex?: number | undefined;
                } | undefined): BatchStreamRequest;
                fromPartial(object: {
                    consistencyLevel?: import("./base.js").ConsistencyLevel | undefined;
                    objectIndex?: number | undefined;
                    referenceIndex?: number | undefined;
                }): BatchStreamRequest;
            };
            readonly requestStream: false;
            readonly responseType: {
                encode(message: BatchStreamMessage, writer?: import("protobufjs").Writer): import("protobufjs").Writer;
                decode(input: Uint8Array | import("protobufjs").Reader, length?: number | undefined): BatchStreamMessage;
                fromJSON(object: any): BatchStreamMessage;
                toJSON(message: BatchStreamMessage): unknown;
                create(base?: {
                    streamId?: string | undefined;
                    error?: {
                        error?: string | undefined;
                        index?: number | undefined;
                        isRetriable?: boolean | undefined;
                        isObject?: boolean | undefined;
                        isReference?: boolean | undefined;
                    } | undefined;
                    start?: {} | undefined;
                    stop?: {} | undefined;
                    shutdown?: {} | undefined;
                    shuttingDown?: {} | undefined;
                } | undefined): BatchStreamMessage;
                fromPartial(object: {
                    streamId?: string | undefined;
                    error?: {
                        error?: string | undefined;
                        index?: number | undefined;
                        isRetriable?: boolean | undefined;
                        isObject?: boolean | undefined;
                        isReference?: boolean | undefined;
                    } | undefined;
                    start?: {} | undefined;
                    stop?: {} | undefined;
                    shutdown?: {} | undefined;
                    shuttingDown?: {} | undefined;
                }): BatchStreamMessage;
            };
            readonly responseStream: true;
            readonly options: {};
        };
    };
};
export interface WeaviateServiceImplementation<CallContextExt = {}> {
    search(request: SearchRequest, context: CallContext & CallContextExt): Promise<DeepPartial<SearchReply>>;
    batchObjects(request: BatchObjectsRequest, context: CallContext & CallContextExt): Promise<DeepPartial<BatchObjectsReply>>;
    batchReferences(request: BatchReferencesRequest, context: CallContext & CallContextExt): Promise<DeepPartial<BatchReferencesReply>>;
    batchDelete(request: BatchDeleteRequest, context: CallContext & CallContextExt): Promise<DeepPartial<BatchDeleteReply>>;
    tenantsGet(request: TenantsGetRequest, context: CallContext & CallContextExt): Promise<DeepPartial<TenantsGetReply>>;
    aggregate(request: AggregateRequest, context: CallContext & CallContextExt): Promise<DeepPartial<AggregateReply>>;
    batchSend(request: BatchSendRequest, context: CallContext & CallContextExt): Promise<DeepPartial<BatchSendReply>>;
    batchStream(request: BatchStreamRequest, context: CallContext & CallContextExt): ServerStreamingMethodResult<DeepPartial<BatchStreamMessage>>;
}
export interface WeaviateClient<CallOptionsExt = {}> {
    search(request: DeepPartial<SearchRequest>, options?: CallOptions & CallOptionsExt): Promise<SearchReply>;
    batchObjects(request: DeepPartial<BatchObjectsRequest>, options?: CallOptions & CallOptionsExt): Promise<BatchObjectsReply>;
    batchReferences(request: DeepPartial<BatchReferencesRequest>, options?: CallOptions & CallOptionsExt): Promise<BatchReferencesReply>;
    batchDelete(request: DeepPartial<BatchDeleteRequest>, options?: CallOptions & CallOptionsExt): Promise<BatchDeleteReply>;
    tenantsGet(request: DeepPartial<TenantsGetRequest>, options?: CallOptions & CallOptionsExt): Promise<TenantsGetReply>;
    aggregate(request: DeepPartial<AggregateRequest>, options?: CallOptions & CallOptionsExt): Promise<AggregateReply>;
    batchSend(request: DeepPartial<BatchSendRequest>, options?: CallOptions & CallOptionsExt): Promise<BatchSendReply>;
    batchStream(request: DeepPartial<BatchStreamRequest>, options?: CallOptions & CallOptionsExt): AsyncIterable<BatchStreamMessage>;
}
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
export type ServerStreamingMethodResult<Response> = {
    [Symbol.asyncIterator](): AsyncIterator<Response, void>;
};
export {};
