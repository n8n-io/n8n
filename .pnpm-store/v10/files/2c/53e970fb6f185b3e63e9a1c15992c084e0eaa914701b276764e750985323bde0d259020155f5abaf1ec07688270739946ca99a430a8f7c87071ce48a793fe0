"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    "nested": {
        "milvus": {
            "nested": {
                "proto": {
                    "nested": {
                        "schema": {
                            "options": {
                                "go_package": "github.com/milvus-io/milvus-proto/go-api/v2/schemapb",
                                "java_multiple_files": true,
                                "java_package": "io.milvus.grpc",
                                "java_outer_classname": "SchemaProto",
                                "java_generate_equals_and_hash": true,
                                "csharp_namespace": "Milvus.Client.Grpc"
                            },
                            "nested": {
                                "DataType": {
                                    "values": {
                                        "None": 0,
                                        "Bool": 1,
                                        "Int8": 2,
                                        "Int16": 3,
                                        "Int32": 4,
                                        "Int64": 5,
                                        "Float": 10,
                                        "Double": 11,
                                        "String": 20,
                                        "VarChar": 21,
                                        "Array": 22,
                                        "JSON": 23,
                                        "Geometry": 24,
                                        "Text": 25,
                                        "Timestamptz": 26,
                                        "BinaryVector": 100,
                                        "FloatVector": 101,
                                        "Float16Vector": 102,
                                        "BFloat16Vector": 103,
                                        "SparseFloatVector": 104,
                                        "Int8Vector": 105,
                                        "ArrayOfVector": 106,
                                        "ArrayOfStruct": 200,
                                        "Struct": 201
                                    }
                                },
                                "FunctionType": {
                                    "values": {
                                        "Unknown": 0,
                                        "BM25": 1,
                                        "TextEmbedding": 2,
                                        "Rerank": 3
                                    }
                                },
                                "FieldState": {
                                    "values": {
                                        "FieldCreated": 0,
                                        "FieldCreating": 1,
                                        "FieldDropping": 2,
                                        "FieldDropped": 3
                                    }
                                },
                                "FieldSchema": {
                                    "fields": {
                                        "fieldID": {
                                            "type": "int64",
                                            "id": 1
                                        },
                                        "name": {
                                            "type": "string",
                                            "id": 2
                                        },
                                        "isPrimaryKey": {
                                            "type": "bool",
                                            "id": 3
                                        },
                                        "description": {
                                            "type": "string",
                                            "id": 4
                                        },
                                        "dataType": {
                                            "type": "DataType",
                                            "id": 5
                                        },
                                        "typeParams": {
                                            "rule": "repeated",
                                            "type": "common.KeyValuePair",
                                            "id": 6
                                        },
                                        "indexParams": {
                                            "rule": "repeated",
                                            "type": "common.KeyValuePair",
                                            "id": 7
                                        },
                                        "autoID": {
                                            "type": "bool",
                                            "id": 8
                                        },
                                        "state": {
                                            "type": "FieldState",
                                            "id": 9
                                        },
                                        "elementType": {
                                            "type": "DataType",
                                            "id": 10
                                        },
                                        "defaultValue": {
                                            "type": "ValueField",
                                            "id": 11
                                        },
                                        "isDynamic": {
                                            "type": "bool",
                                            "id": 12
                                        },
                                        "isPartitionKey": {
                                            "type": "bool",
                                            "id": 13
                                        },
                                        "isClusteringKey": {
                                            "type": "bool",
                                            "id": 14
                                        },
                                        "nullable": {
                                            "type": "bool",
                                            "id": 15
                                        },
                                        "isFunctionOutput": {
                                            "type": "bool",
                                            "id": 16
                                        }
                                    }
                                },
                                "FunctionSchema": {
                                    "fields": {
                                        "name": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "id": {
                                            "type": "int64",
                                            "id": 2
                                        },
                                        "description": {
                                            "type": "string",
                                            "id": 3
                                        },
                                        "type": {
                                            "type": "FunctionType",
                                            "id": 4
                                        },
                                        "inputFieldNames": {
                                            "rule": "repeated",
                                            "type": "string",
                                            "id": 5
                                        },
                                        "inputFieldIds": {
                                            "rule": "repeated",
                                            "type": "int64",
                                            "id": 6
                                        },
                                        "outputFieldNames": {
                                            "rule": "repeated",
                                            "type": "string",
                                            "id": 7
                                        },
                                        "outputFieldIds": {
                                            "rule": "repeated",
                                            "type": "int64",
                                            "id": 8
                                        },
                                        "params": {
                                            "rule": "repeated",
                                            "type": "common.KeyValuePair",
                                            "id": 9
                                        }
                                    }
                                },
                                "FunctionScore": {
                                    "fields": {
                                        "functions": {
                                            "rule": "repeated",
                                            "type": "FunctionSchema",
                                            "id": 1
                                        },
                                        "params": {
                                            "rule": "repeated",
                                            "type": "common.KeyValuePair",
                                            "id": 2
                                        }
                                    }
                                },
                                "CollectionSchema": {
                                    "fields": {
                                        "name": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "description": {
                                            "type": "string",
                                            "id": 2
                                        },
                                        "autoID": {
                                            "type": "bool",
                                            "id": 3,
                                            "options": {
                                                "deprecated": true
                                            }
                                        },
                                        "fields": {
                                            "rule": "repeated",
                                            "type": "FieldSchema",
                                            "id": 4
                                        },
                                        "enableDynamicField": {
                                            "type": "bool",
                                            "id": 5
                                        },
                                        "properties": {
                                            "rule": "repeated",
                                            "type": "common.KeyValuePair",
                                            "id": 6
                                        },
                                        "functions": {
                                            "rule": "repeated",
                                            "type": "FunctionSchema",
                                            "id": 7
                                        },
                                        "dbName": {
                                            "type": "string",
                                            "id": 8
                                        },
                                        "structArrayFields": {
                                            "rule": "repeated",
                                            "type": "StructArrayFieldSchema",
                                            "id": 9
                                        },
                                        "version": {
                                            "type": "int32",
                                            "id": 10
                                        },
                                        "enableNamespace": {
                                            "type": "bool",
                                            "id": 15
                                        }
                                    }
                                },
                                "StructArrayFieldSchema": {
                                    "fields": {
                                        "fieldID": {
                                            "type": "int64",
                                            "id": 1
                                        },
                                        "name": {
                                            "type": "string",
                                            "id": 2
                                        },
                                        "description": {
                                            "type": "string",
                                            "id": 3
                                        },
                                        "fields": {
                                            "rule": "repeated",
                                            "type": "FieldSchema",
                                            "id": 4
                                        },
                                        "typeParams": {
                                            "rule": "repeated",
                                            "type": "common.KeyValuePair",
                                            "id": 5
                                        }
                                    }
                                },
                                "BoolArray": {
                                    "fields": {
                                        "data": {
                                            "rule": "repeated",
                                            "type": "bool",
                                            "id": 1
                                        }
                                    }
                                },
                                "IntArray": {
                                    "fields": {
                                        "data": {
                                            "rule": "repeated",
                                            "type": "int32",
                                            "id": 1
                                        }
                                    }
                                },
                                "LongArray": {
                                    "fields": {
                                        "data": {
                                            "rule": "repeated",
                                            "type": "int64",
                                            "id": 1
                                        }
                                    }
                                },
                                "FloatArray": {
                                    "fields": {
                                        "data": {
                                            "rule": "repeated",
                                            "type": "float",
                                            "id": 1
                                        }
                                    }
                                },
                                "DoubleArray": {
                                    "fields": {
                                        "data": {
                                            "rule": "repeated",
                                            "type": "double",
                                            "id": 1
                                        }
                                    }
                                },
                                "BytesArray": {
                                    "fields": {
                                        "data": {
                                            "rule": "repeated",
                                            "type": "bytes",
                                            "id": 1
                                        }
                                    }
                                },
                                "StringArray": {
                                    "fields": {
                                        "data": {
                                            "rule": "repeated",
                                            "type": "string",
                                            "id": 1
                                        }
                                    }
                                },
                                "ArrayArray": {
                                    "fields": {
                                        "data": {
                                            "rule": "repeated",
                                            "type": "ScalarField",
                                            "id": 1
                                        },
                                        "elementType": {
                                            "type": "DataType",
                                            "id": 2
                                        }
                                    }
                                },
                                "JSONArray": {
                                    "fields": {
                                        "data": {
                                            "rule": "repeated",
                                            "type": "bytes",
                                            "id": 1
                                        }
                                    }
                                },
                                "GeometryArray": {
                                    "fields": {
                                        "data": {
                                            "rule": "repeated",
                                            "type": "bytes",
                                            "id": 1
                                        }
                                    }
                                },
                                "TimestamptzArray": {
                                    "fields": {
                                        "data": {
                                            "rule": "repeated",
                                            "type": "int64",
                                            "id": 1
                                        }
                                    }
                                },
                                "GeometryWktArray": {
                                    "fields": {
                                        "data": {
                                            "rule": "repeated",
                                            "type": "string",
                                            "id": 1
                                        }
                                    }
                                },
                                "ValueField": {
                                    "oneofs": {
                                        "data": {
                                            "oneof": [
                                                "boolData",
                                                "intData",
                                                "longData",
                                                "floatData",
                                                "doubleData",
                                                "stringData",
                                                "bytesData",
                                                "timestamptzData"
                                            ]
                                        }
                                    },
                                    "fields": {
                                        "boolData": {
                                            "type": "bool",
                                            "id": 1
                                        },
                                        "intData": {
                                            "type": "int32",
                                            "id": 2
                                        },
                                        "longData": {
                                            "type": "int64",
                                            "id": 3
                                        },
                                        "floatData": {
                                            "type": "float",
                                            "id": 4
                                        },
                                        "doubleData": {
                                            "type": "double",
                                            "id": 5
                                        },
                                        "stringData": {
                                            "type": "string",
                                            "id": 6
                                        },
                                        "bytesData": {
                                            "type": "bytes",
                                            "id": 7
                                        },
                                        "timestamptzData": {
                                            "type": "int64",
                                            "id": 8
                                        }
                                    }
                                },
                                "ScalarField": {
                                    "oneofs": {
                                        "data": {
                                            "oneof": [
                                                "boolData",
                                                "intData",
                                                "longData",
                                                "floatData",
                                                "doubleData",
                                                "stringData",
                                                "bytesData",
                                                "arrayData",
                                                "jsonData",
                                                "geometryData",
                                                "timestamptzData",
                                                "geometryWktData"
                                            ]
                                        }
                                    },
                                    "fields": {
                                        "boolData": {
                                            "type": "BoolArray",
                                            "id": 1
                                        },
                                        "intData": {
                                            "type": "IntArray",
                                            "id": 2
                                        },
                                        "longData": {
                                            "type": "LongArray",
                                            "id": 3
                                        },
                                        "floatData": {
                                            "type": "FloatArray",
                                            "id": 4
                                        },
                                        "doubleData": {
                                            "type": "DoubleArray",
                                            "id": 5
                                        },
                                        "stringData": {
                                            "type": "StringArray",
                                            "id": 6
                                        },
                                        "bytesData": {
                                            "type": "BytesArray",
                                            "id": 7
                                        },
                                        "arrayData": {
                                            "type": "ArrayArray",
                                            "id": 8
                                        },
                                        "jsonData": {
                                            "type": "JSONArray",
                                            "id": 9
                                        },
                                        "geometryData": {
                                            "type": "GeometryArray",
                                            "id": 10
                                        },
                                        "timestamptzData": {
                                            "type": "TimestamptzArray",
                                            "id": 11
                                        },
                                        "geometryWktData": {
                                            "type": "GeometryWktArray",
                                            "id": 12
                                        }
                                    }
                                },
                                "SparseFloatArray": {
                                    "fields": {
                                        "contents": {
                                            "rule": "repeated",
                                            "type": "bytes",
                                            "id": 1
                                        },
                                        "dim": {
                                            "type": "int64",
                                            "id": 2
                                        }
                                    }
                                },
                                "VectorField": {
                                    "oneofs": {
                                        "data": {
                                            "oneof": [
                                                "floatVector",
                                                "binaryVector",
                                                "float16Vector",
                                                "bfloat16Vector",
                                                "sparseFloatVector",
                                                "int8Vector",
                                                "vectorArray"
                                            ]
                                        }
                                    },
                                    "fields": {
                                        "dim": {
                                            "type": "int64",
                                            "id": 1
                                        },
                                        "floatVector": {
                                            "type": "FloatArray",
                                            "id": 2
                                        },
                                        "binaryVector": {
                                            "type": "bytes",
                                            "id": 3
                                        },
                                        "float16Vector": {
                                            "type": "bytes",
                                            "id": 4
                                        },
                                        "bfloat16Vector": {
                                            "type": "bytes",
                                            "id": 5
                                        },
                                        "sparseFloatVector": {
                                            "type": "SparseFloatArray",
                                            "id": 6
                                        },
                                        "int8Vector": {
                                            "type": "bytes",
                                            "id": 7
                                        },
                                        "vectorArray": {
                                            "type": "VectorArray",
                                            "id": 8
                                        }
                                    }
                                },
                                "VectorArray": {
                                    "fields": {
                                        "dim": {
                                            "type": "int64",
                                            "id": 1
                                        },
                                        "data": {
                                            "rule": "repeated",
                                            "type": "VectorField",
                                            "id": 2
                                        },
                                        "elementType": {
                                            "type": "DataType",
                                            "id": 3
                                        }
                                    }
                                },
                                "StructArrayField": {
                                    "fields": {
                                        "fields": {
                                            "rule": "repeated",
                                            "type": "FieldData",
                                            "id": 1
                                        }
                                    }
                                },
                                "FieldData": {
                                    "oneofs": {
                                        "field": {
                                            "oneof": [
                                                "scalars",
                                                "vectors",
                                                "structArrays"
                                            ]
                                        }
                                    },
                                    "fields": {
                                        "type": {
                                            "type": "DataType",
                                            "id": 1
                                        },
                                        "fieldName": {
                                            "type": "string",
                                            "id": 2
                                        },
                                        "scalars": {
                                            "type": "ScalarField",
                                            "id": 3
                                        },
                                        "vectors": {
                                            "type": "VectorField",
                                            "id": 4
                                        },
                                        "structArrays": {
                                            "type": "StructArrayField",
                                            "id": 8
                                        },
                                        "fieldId": {
                                            "type": "int64",
                                            "id": 5
                                        },
                                        "isDynamic": {
                                            "type": "bool",
                                            "id": 6
                                        },
                                        "validData": {
                                            "rule": "repeated",
                                            "type": "bool",
                                            "id": 7
                                        }
                                    }
                                },
                                "IDs": {
                                    "oneofs": {
                                        "idField": {
                                            "oneof": [
                                                "intId",
                                                "strId"
                                            ]
                                        }
                                    },
                                    "fields": {
                                        "intId": {
                                            "type": "LongArray",
                                            "id": 1
                                        },
                                        "strId": {
                                            "type": "StringArray",
                                            "id": 2
                                        }
                                    }
                                },
                                "SearchIteratorV2Results": {
                                    "fields": {
                                        "token": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "lastBound": {
                                            "type": "float",
                                            "id": 2
                                        }
                                    }
                                },
                                "SearchResultData": {
                                    "oneofs": {
                                        "_searchIteratorV2Results": {
                                            "oneof": [
                                                "searchIteratorV2Results"
                                            ]
                                        }
                                    },
                                    "fields": {
                                        "numQueries": {
                                            "type": "int64",
                                            "id": 1
                                        },
                                        "topK": {
                                            "type": "int64",
                                            "id": 2
                                        },
                                        "fieldsData": {
                                            "rule": "repeated",
                                            "type": "FieldData",
                                            "id": 3
                                        },
                                        "scores": {
                                            "rule": "repeated",
                                            "type": "float",
                                            "id": 4
                                        },
                                        "ids": {
                                            "type": "IDs",
                                            "id": 5
                                        },
                                        "topks": {
                                            "rule": "repeated",
                                            "type": "int64",
                                            "id": 6
                                        },
                                        "outputFields": {
                                            "rule": "repeated",
                                            "type": "string",
                                            "id": 7
                                        },
                                        "groupByFieldValue": {
                                            "type": "FieldData",
                                            "id": 8
                                        },
                                        "allSearchCount": {
                                            "type": "int64",
                                            "id": 9
                                        },
                                        "distances": {
                                            "rule": "repeated",
                                            "type": "float",
                                            "id": 10
                                        },
                                        "searchIteratorV2Results": {
                                            "type": "SearchIteratorV2Results",
                                            "id": 11,
                                            "options": {
                                                "proto3_optional": true
                                            }
                                        },
                                        "recalls": {
                                            "rule": "repeated",
                                            "type": "float",
                                            "id": 12
                                        },
                                        "primaryFieldName": {
                                            "type": "string",
                                            "id": 13
                                        },
                                        "highlightResults": {
                                            "rule": "repeated",
                                            "type": "common.HighlightResult",
                                            "id": 14
                                        }
                                    }
                                },
                                "VectorClusteringInfo": {
                                    "fields": {
                                        "field": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "centroid": {
                                            "type": "schema.VectorField",
                                            "id": 2
                                        }
                                    }
                                },
                                "ScalarClusteringInfo": {
                                    "fields": {
                                        "field": {
                                            "type": "string",
                                            "id": 1
                                        }
                                    }
                                },
                                "ClusteringInfo": {
                                    "fields": {
                                        "vectorClusteringInfos": {
                                            "rule": "repeated",
                                            "type": "VectorClusteringInfo",
                                            "id": 1
                                        },
                                        "scalarClusteringInfos": {
                                            "rule": "repeated",
                                            "type": "ScalarClusteringInfo",
                                            "id": 2
                                        }
                                    }
                                },
                                "TemplateValue": {
                                    "oneofs": {
                                        "val": {
                                            "oneof": [
                                                "boolVal",
                                                "int64Val",
                                                "floatVal",
                                                "stringVal",
                                                "arrayVal"
                                            ]
                                        }
                                    },
                                    "fields": {
                                        "boolVal": {
                                            "type": "bool",
                                            "id": 1
                                        },
                                        "int64Val": {
                                            "type": "int64",
                                            "id": 2
                                        },
                                        "floatVal": {
                                            "type": "double",
                                            "id": 3
                                        },
                                        "stringVal": {
                                            "type": "string",
                                            "id": 4
                                        },
                                        "arrayVal": {
                                            "type": "TemplateArrayValue",
                                            "id": 5
                                        }
                                    }
                                },
                                "TemplateArrayValue": {
                                    "oneofs": {
                                        "data": {
                                            "oneof": [
                                                "boolData",
                                                "longData",
                                                "doubleData",
                                                "stringData",
                                                "arrayData",
                                                "jsonData"
                                            ]
                                        }
                                    },
                                    "fields": {
                                        "boolData": {
                                            "type": "BoolArray",
                                            "id": 1
                                        },
                                        "longData": {
                                            "type": "LongArray",
                                            "id": 2
                                        },
                                        "doubleData": {
                                            "type": "DoubleArray",
                                            "id": 3
                                        },
                                        "stringData": {
                                            "type": "StringArray",
                                            "id": 4
                                        },
                                        "arrayData": {
                                            "type": "TemplateArrayValueArray",
                                            "id": 5
                                        },
                                        "jsonData": {
                                            "type": "JSONArray",
                                            "id": 6
                                        }
                                    }
                                },
                                "TemplateArrayValueArray": {
                                    "fields": {
                                        "data": {
                                            "rule": "repeated",
                                            "type": "TemplateArrayValue",
                                            "id": 1
                                        }
                                    }
                                }
                            }
                        },
                        "common": {
                            "options": {
                                "go_package": "github.com/milvus-io/milvus-proto/go-api/v2/commonpb",
                                "java_multiple_files": true,
                                "java_package": "io.milvus.grpc",
                                "java_outer_classname": "CommonProto",
                                "java_generate_equals_and_hash": true,
                                "csharp_namespace": "Milvus.Client.Grpc"
                            },
                            "nested": {
                                "ErrorCode": {
                                    "options": {
                                        "deprecated": true
                                    },
                                    "values": {
                                        "Success": 0,
                                        "UnexpectedError": 1,
                                        "ConnectFailed": 2,
                                        "PermissionDenied": 3,
                                        "CollectionNotExists": 4,
                                        "IllegalArgument": 5,
                                        "IllegalDimension": 7,
                                        "IllegalIndexType": 8,
                                        "IllegalCollectionName": 9,
                                        "IllegalTOPK": 10,
                                        "IllegalRowRecord": 11,
                                        "IllegalVectorID": 12,
                                        "IllegalSearchResult": 13,
                                        "FileNotFound": 14,
                                        "MetaFailed": 15,
                                        "CacheFailed": 16,
                                        "CannotCreateFolder": 17,
                                        "CannotCreateFile": 18,
                                        "CannotDeleteFolder": 19,
                                        "CannotDeleteFile": 20,
                                        "BuildIndexError": 21,
                                        "IllegalNLIST": 22,
                                        "IllegalMetricType": 23,
                                        "OutOfMemory": 24,
                                        "IndexNotExist": 25,
                                        "EmptyCollection": 26,
                                        "UpdateImportTaskFailure": 27,
                                        "CollectionNameNotFound": 28,
                                        "CreateCredentialFailure": 29,
                                        "UpdateCredentialFailure": 30,
                                        "DeleteCredentialFailure": 31,
                                        "GetCredentialFailure": 32,
                                        "ListCredUsersFailure": 33,
                                        "GetUserFailure": 34,
                                        "CreateRoleFailure": 35,
                                        "DropRoleFailure": 36,
                                        "OperateUserRoleFailure": 37,
                                        "SelectRoleFailure": 38,
                                        "SelectUserFailure": 39,
                                        "SelectResourceFailure": 40,
                                        "OperatePrivilegeFailure": 41,
                                        "SelectGrantFailure": 42,
                                        "RefreshPolicyInfoCacheFailure": 43,
                                        "ListPolicyFailure": 44,
                                        "NotShardLeader": 45,
                                        "NoReplicaAvailable": 46,
                                        "SegmentNotFound": 47,
                                        "ForceDeny": 48,
                                        "RateLimit": 49,
                                        "NodeIDNotMatch": 50,
                                        "UpsertAutoIDTrue": 51,
                                        "InsufficientMemoryToLoad": 52,
                                        "MemoryQuotaExhausted": 53,
                                        "DiskQuotaExhausted": 54,
                                        "TimeTickLongDelay": 55,
                                        "NotReadyServe": 56,
                                        "NotReadyCoordActivating": 57,
                                        "CreatePrivilegeGroupFailure": 58,
                                        "DropPrivilegeGroupFailure": 59,
                                        "ListPrivilegeGroupsFailure": 60,
                                        "OperatePrivilegeGroupFailure": 61,
                                        "SchemaMismatch": 62,
                                        "DataCoordNA": 100,
                                        "DDRequestRace": 1000
                                    }
                                },
                                "IndexState": {
                                    "values": {
                                        "IndexStateNone": 0,
                                        "Unissued": 1,
                                        "InProgress": 2,
                                        "Finished": 3,
                                        "Failed": 4,
                                        "Retry": 5
                                    }
                                },
                                "SegmentState": {
                                    "values": {
                                        "SegmentStateNone": 0,
                                        "NotExist": 1,
                                        "Growing": 2,
                                        "Sealed": 3,
                                        "Flushed": 4,
                                        "Flushing": 5,
                                        "Dropped": 6,
                                        "Importing": 7
                                    }
                                },
                                "SegmentLevel": {
                                    "values": {
                                        "Legacy": 0,
                                        "L0": 1,
                                        "L1": 2,
                                        "L2": 3
                                    }
                                },
                                "Status": {
                                    "fields": {
                                        "errorCode": {
                                            "type": "ErrorCode",
                                            "id": 1,
                                            "options": {
                                                "deprecated": true
                                            }
                                        },
                                        "reason": {
                                            "type": "string",
                                            "id": 2
                                        },
                                        "code": {
                                            "type": "int32",
                                            "id": 3
                                        },
                                        "retriable": {
                                            "type": "bool",
                                            "id": 4
                                        },
                                        "detail": {
                                            "type": "string",
                                            "id": 5
                                        },
                                        "extraInfo": {
                                            "keyType": "string",
                                            "type": "string",
                                            "id": 6
                                        }
                                    }
                                },
                                "KeyValuePair": {
                                    "fields": {
                                        "key": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "value": {
                                            "type": "string",
                                            "id": 2
                                        }
                                    }
                                },
                                "KeyDataPair": {
                                    "fields": {
                                        "key": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "data": {
                                            "type": "bytes",
                                            "id": 2
                                        }
                                    }
                                },
                                "Blob": {
                                    "fields": {
                                        "value": {
                                            "type": "bytes",
                                            "id": 1
                                        }
                                    }
                                },
                                "PlaceholderType": {
                                    "values": {
                                        "None": 0,
                                        "BinaryVector": 100,
                                        "FloatVector": 101,
                                        "Float16Vector": 102,
                                        "BFloat16Vector": 103,
                                        "SparseFloatVector": 104,
                                        "Int8Vector": 105,
                                        "Int64": 5,
                                        "VarChar": 21,
                                        "EmbListBinaryVector": 300,
                                        "EmbListFloatVector": 301,
                                        "EmbListFloat16Vector": 302,
                                        "EmbListBFloat16Vector": 303,
                                        "EmbListSparseFloatVector": 304,
                                        "EmbListInt8Vector": 305
                                    }
                                },
                                "PlaceholderValue": {
                                    "fields": {
                                        "tag": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "type": {
                                            "type": "PlaceholderType",
                                            "id": 2
                                        },
                                        "values": {
                                            "rule": "repeated",
                                            "type": "bytes",
                                            "id": 3
                                        }
                                    }
                                },
                                "PlaceholderGroup": {
                                    "fields": {
                                        "placeholders": {
                                            "rule": "repeated",
                                            "type": "PlaceholderValue",
                                            "id": 1
                                        }
                                    }
                                },
                                "Address": {
                                    "fields": {
                                        "ip": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "port": {
                                            "type": "int64",
                                            "id": 2
                                        }
                                    }
                                },
                                "MsgType": {
                                    "values": {
                                        "Undefined": 0,
                                        "CreateCollection": 100,
                                        "DropCollection": 101,
                                        "HasCollection": 102,
                                        "DescribeCollection": 103,
                                        "ShowCollections": 104,
                                        "GetSystemConfigs": 105,
                                        "LoadCollection": 106,
                                        "ReleaseCollection": 107,
                                        "CreateAlias": 108,
                                        "DropAlias": 109,
                                        "AlterAlias": 110,
                                        "AlterCollection": 111,
                                        "RenameCollection": 112,
                                        "DescribeAlias": 113,
                                        "ListAliases": 114,
                                        "AlterCollectionField": 115,
                                        "AddCollectionFunction": 116,
                                        "AlterCollectionFunction": 117,
                                        "DropCollectionFunction": 118,
                                        "TruncateCollection": 119,
                                        "CreatePartition": 200,
                                        "DropPartition": 201,
                                        "HasPartition": 202,
                                        "DescribePartition": 203,
                                        "ShowPartitions": 204,
                                        "LoadPartitions": 205,
                                        "ReleasePartitions": 206,
                                        "ShowSegments": 250,
                                        "DescribeSegment": 251,
                                        "LoadSegments": 252,
                                        "ReleaseSegments": 253,
                                        "HandoffSegments": 254,
                                        "LoadBalanceSegments": 255,
                                        "DescribeSegments": 256,
                                        "FederListIndexedSegment": 257,
                                        "FederDescribeSegmentIndexData": 258,
                                        "CreateIndex": 300,
                                        "DescribeIndex": 301,
                                        "DropIndex": 302,
                                        "GetIndexStatistics": 303,
                                        "AlterIndex": 304,
                                        "Insert": 400,
                                        "Delete": 401,
                                        "Flush": 402,
                                        "ResendSegmentStats": 403,
                                        "Upsert": 404,
                                        "ManualFlush": 405,
                                        "FlushSegment": 406,
                                        "CreateSegment": 407,
                                        "Import": 408,
                                        "FlushAll": 409,
                                        "Search": 500,
                                        "SearchResult": 501,
                                        "GetIndexState": 502,
                                        "GetIndexBuildProgress": 503,
                                        "GetCollectionStatistics": 504,
                                        "GetPartitionStatistics": 505,
                                        "Retrieve": 506,
                                        "RetrieveResult": 507,
                                        "WatchDmChannels": 508,
                                        "RemoveDmChannels": 509,
                                        "WatchQueryChannels": 510,
                                        "RemoveQueryChannels": 511,
                                        "SealedSegmentsChangeInfo": 512,
                                        "WatchDeltaChannels": 513,
                                        "GetShardLeaders": 514,
                                        "GetReplicas": 515,
                                        "UnsubDmChannel": 516,
                                        "GetDistribution": 517,
                                        "SyncDistribution": 518,
                                        "RunAnalyzer": 519,
                                        "SegmentInfo": 600,
                                        "SystemInfo": 601,
                                        "GetRecoveryInfo": 602,
                                        "GetSegmentState": 603,
                                        "TimeTick": 1200,
                                        "QueryNodeStats": 1201,
                                        "LoadIndex": 1202,
                                        "RequestID": 1203,
                                        "RequestTSO": 1204,
                                        "AllocateSegment": 1205,
                                        "SegmentStatistics": 1206,
                                        "SegmentFlushDone": 1207,
                                        "DataNodeTt": 1208,
                                        "Connect": 1209,
                                        "ListClientInfos": 1210,
                                        "AllocTimestamp": 1211,
                                        "Replicate": 1212,
                                        "CreateCredential": 1500,
                                        "GetCredential": 1501,
                                        "DeleteCredential": 1502,
                                        "UpdateCredential": 1503,
                                        "ListCredUsernames": 1504,
                                        "CreateRole": 1600,
                                        "DropRole": 1601,
                                        "OperateUserRole": 1602,
                                        "SelectRole": 1603,
                                        "SelectUser": 1604,
                                        "SelectResource": 1605,
                                        "OperatePrivilege": 1606,
                                        "SelectGrant": 1607,
                                        "RefreshPolicyInfoCache": 1608,
                                        "ListPolicy": 1609,
                                        "CreatePrivilegeGroup": 1610,
                                        "DropPrivilegeGroup": 1611,
                                        "ListPrivilegeGroups": 1612,
                                        "OperatePrivilegeGroup": 1613,
                                        "OperatePrivilegeV2": 1614,
                                        "CreateResourceGroup": 1700,
                                        "DropResourceGroup": 1701,
                                        "ListResourceGroups": 1702,
                                        "DescribeResourceGroup": 1703,
                                        "TransferNode": 1704,
                                        "TransferReplica": 1705,
                                        "UpdateResourceGroups": 1706,
                                        "CreateDatabase": 1801,
                                        "DropDatabase": 1802,
                                        "ListDatabases": 1803,
                                        "AlterDatabase": 1804,
                                        "DescribeDatabase": 1805,
                                        "AddCollectionField": 1900,
                                        "AlterWAL": 2000
                                    }
                                },
                                "MsgBase": {
                                    "fields": {
                                        "msgType": {
                                            "type": "MsgType",
                                            "id": 1
                                        },
                                        "msgID": {
                                            "type": "int64",
                                            "id": 2
                                        },
                                        "timestamp": {
                                            "type": "uint64",
                                            "id": 3
                                        },
                                        "sourceID": {
                                            "type": "int64",
                                            "id": 4
                                        },
                                        "targetID": {
                                            "type": "int64",
                                            "id": 5
                                        },
                                        "properties": {
                                            "keyType": "string",
                                            "type": "string",
                                            "id": 6
                                        },
                                        "replicateInfo": {
                                            "type": "ReplicateInfo",
                                            "id": 7
                                        }
                                    }
                                },
                                "ReplicateInfo": {
                                    "fields": {
                                        "isReplicate": {
                                            "type": "bool",
                                            "id": 1
                                        },
                                        "msgTimestamp": {
                                            "type": "uint64",
                                            "id": 2
                                        },
                                        "replicateID": {
                                            "type": "string",
                                            "id": 3
                                        }
                                    }
                                },
                                "DslType": {
                                    "values": {
                                        "Dsl": 0,
                                        "BoolExprV1": 1
                                    }
                                },
                                "MsgHeader": {
                                    "fields": {
                                        "base": {
                                            "type": "common.MsgBase",
                                            "id": 1
                                        }
                                    }
                                },
                                "DMLMsgHeader": {
                                    "fields": {
                                        "base": {
                                            "type": "common.MsgBase",
                                            "id": 1
                                        },
                                        "shardName": {
                                            "type": "string",
                                            "id": 2
                                        }
                                    }
                                },
                                "CompactionState": {
                                    "values": {
                                        "UndefiedState": 0,
                                        "Executing": 1,
                                        "Completed": 2
                                    }
                                },
                                "ConsistencyLevel": {
                                    "values": {
                                        "Strong": 0,
                                        "Session": 1,
                                        "Bounded": 2,
                                        "Eventually": 3,
                                        "Customized": 4
                                    }
                                },
                                "ImportState": {
                                    "values": {
                                        "ImportPending": 0,
                                        "ImportFailed": 1,
                                        "ImportStarted": 2,
                                        "ImportPersisted": 5,
                                        "ImportFlushed": 8,
                                        "ImportCompleted": 6,
                                        "ImportFailedAndCleaned": 7
                                    }
                                },
                                "ObjectType": {
                                    "values": {
                                        "Collection": 0,
                                        "Global": 1,
                                        "User": 2
                                    }
                                },
                                "ObjectPrivilege": {
                                    "values": {
                                        "PrivilegeAll": 0,
                                        "PrivilegeCreateCollection": 1,
                                        "PrivilegeDropCollection": 2,
                                        "PrivilegeDescribeCollection": 3,
                                        "PrivilegeShowCollections": 4,
                                        "PrivilegeLoad": 5,
                                        "PrivilegeRelease": 6,
                                        "PrivilegeCompaction": 7,
                                        "PrivilegeInsert": 8,
                                        "PrivilegeDelete": 9,
                                        "PrivilegeGetStatistics": 10,
                                        "PrivilegeCreateIndex": 11,
                                        "PrivilegeIndexDetail": 12,
                                        "PrivilegeDropIndex": 13,
                                        "PrivilegeSearch": 14,
                                        "PrivilegeFlush": 15,
                                        "PrivilegeQuery": 16,
                                        "PrivilegeLoadBalance": 17,
                                        "PrivilegeImport": 18,
                                        "PrivilegeCreateOwnership": 19,
                                        "PrivilegeUpdateUser": 20,
                                        "PrivilegeDropOwnership": 21,
                                        "PrivilegeSelectOwnership": 22,
                                        "PrivilegeManageOwnership": 23,
                                        "PrivilegeSelectUser": 24,
                                        "PrivilegeUpsert": 25,
                                        "PrivilegeCreateResourceGroup": 26,
                                        "PrivilegeDropResourceGroup": 27,
                                        "PrivilegeDescribeResourceGroup": 28,
                                        "PrivilegeListResourceGroups": 29,
                                        "PrivilegeTransferNode": 30,
                                        "PrivilegeTransferReplica": 31,
                                        "PrivilegeGetLoadingProgress": 32,
                                        "PrivilegeGetLoadState": 33,
                                        "PrivilegeRenameCollection": 34,
                                        "PrivilegeCreateDatabase": 35,
                                        "PrivilegeDropDatabase": 36,
                                        "PrivilegeListDatabases": 37,
                                        "PrivilegeFlushAll": 38,
                                        "PrivilegeCreatePartition": 39,
                                        "PrivilegeDropPartition": 40,
                                        "PrivilegeShowPartitions": 41,
                                        "PrivilegeHasPartition": 42,
                                        "PrivilegeGetFlushState": 43,
                                        "PrivilegeCreateAlias": 44,
                                        "PrivilegeDropAlias": 45,
                                        "PrivilegeDescribeAlias": 46,
                                        "PrivilegeListAliases": 47,
                                        "PrivilegeUpdateResourceGroups": 48,
                                        "PrivilegeAlterDatabase": 49,
                                        "PrivilegeDescribeDatabase": 50,
                                        "PrivilegeBackupRBAC": 51,
                                        "PrivilegeRestoreRBAC": 52,
                                        "PrivilegeGroupReadOnly": 53,
                                        "PrivilegeGroupReadWrite": 54,
                                        "PrivilegeGroupAdmin": 55,
                                        "PrivilegeCreatePrivilegeGroup": 56,
                                        "PrivilegeDropPrivilegeGroup": 57,
                                        "PrivilegeListPrivilegeGroups": 58,
                                        "PrivilegeOperatePrivilegeGroup": 59,
                                        "PrivilegeGroupClusterReadOnly": 60,
                                        "PrivilegeGroupClusterReadWrite": 61,
                                        "PrivilegeGroupClusterAdmin": 62,
                                        "PrivilegeGroupDatabaseReadOnly": 63,
                                        "PrivilegeGroupDatabaseReadWrite": 64,
                                        "PrivilegeGroupDatabaseAdmin": 65,
                                        "PrivilegeGroupCollectionReadOnly": 66,
                                        "PrivilegeGroupCollectionReadWrite": 67,
                                        "PrivilegeGroupCollectionAdmin": 68,
                                        "PrivilegeGetImportProgress": 69,
                                        "PrivilegeListImport": 70,
                                        "PrivilegeAddCollectionField": 71,
                                        "PrivilegeAddFileResource": 72,
                                        "PrivilegeRemoveFileResource": 73,
                                        "PrivilegeListFileResources": 74,
                                        "PrivilegeUpdateReplicateConfiguration": 78,
                                        "PrivilegeGetReplicateConfiguration": 85
                                    }
                                },
                                "PrivilegeExt": {
                                    "fields": {
                                        "objectType": {
                                            "type": "ObjectType",
                                            "id": 1
                                        },
                                        "objectPrivilege": {
                                            "type": "ObjectPrivilege",
                                            "id": 2
                                        },
                                        "objectNameIndex": {
                                            "type": "int32",
                                            "id": 3
                                        },
                                        "objectNameIndexs": {
                                            "type": "int32",
                                            "id": 4
                                        }
                                    }
                                },
                                "privilegeExtObj": {
                                    "type": "PrivilegeExt",
                                    "id": 1001,
                                    "extend": "google.protobuf.MessageOptions"
                                },
                                "StateCode": {
                                    "values": {
                                        "Initializing": 0,
                                        "Healthy": 1,
                                        "Abnormal": 2,
                                        "StandBy": 3,
                                        "Stopping": 4
                                    }
                                },
                                "LoadState": {
                                    "values": {
                                        "LoadStateNotExist": 0,
                                        "LoadStateNotLoad": 1,
                                        "LoadStateLoading": 2,
                                        "LoadStateLoaded": 3
                                    }
                                },
                                "SegmentStats": {
                                    "fields": {
                                        "SegmentID": {
                                            "type": "int64",
                                            "id": 1
                                        },
                                        "NumRows": {
                                            "type": "int64",
                                            "id": 2
                                        }
                                    }
                                },
                                "ClientInfo": {
                                    "fields": {
                                        "sdkType": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "sdkVersion": {
                                            "type": "string",
                                            "id": 2
                                        },
                                        "localTime": {
                                            "type": "string",
                                            "id": 3
                                        },
                                        "user": {
                                            "type": "string",
                                            "id": 4
                                        },
                                        "host": {
                                            "type": "string",
                                            "id": 5
                                        },
                                        "reserved": {
                                            "keyType": "string",
                                            "type": "string",
                                            "id": 6
                                        }
                                    }
                                },
                                "ServerInfo": {
                                    "fields": {
                                        "buildTags": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "buildTime": {
                                            "type": "string",
                                            "id": 2
                                        },
                                        "gitCommit": {
                                            "type": "string",
                                            "id": 3
                                        },
                                        "goVersion": {
                                            "type": "string",
                                            "id": 4
                                        },
                                        "deployMode": {
                                            "type": "string",
                                            "id": 5
                                        },
                                        "reserved": {
                                            "keyType": "string",
                                            "type": "string",
                                            "id": 6
                                        }
                                    }
                                },
                                "NodeInfo": {
                                    "fields": {
                                        "nodeId": {
                                            "type": "int64",
                                            "id": 1
                                        },
                                        "address": {
                                            "type": "string",
                                            "id": 2
                                        },
                                        "hostname": {
                                            "type": "string",
                                            "id": 3
                                        }
                                    }
                                },
                                "LoadPriority": {
                                    "values": {
                                        "HIGH": 0,
                                        "LOW": 1
                                    }
                                },
                                "WALName": {
                                    "values": {
                                        "Unknown": 0,
                                        "RocksMQ": 1,
                                        "Pulsar": 2,
                                        "Kafka": 3,
                                        "WoodPecker": 4,
                                        "Test": 999
                                    }
                                },
                                "ReplicateConfiguration": {
                                    "fields": {
                                        "clusters": {
                                            "rule": "repeated",
                                            "type": "MilvusCluster",
                                            "id": 1
                                        },
                                        "crossClusterTopology": {
                                            "rule": "repeated",
                                            "type": "CrossClusterTopology",
                                            "id": 2
                                        }
                                    }
                                },
                                "ConnectionParam": {
                                    "fields": {
                                        "uri": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "token": {
                                            "type": "string",
                                            "id": 2
                                        }
                                    }
                                },
                                "MilvusCluster": {
                                    "fields": {
                                        "clusterId": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "connectionParam": {
                                            "type": "ConnectionParam",
                                            "id": 2
                                        },
                                        "pchannels": {
                                            "rule": "repeated",
                                            "type": "string",
                                            "id": 3
                                        }
                                    }
                                },
                                "CrossClusterTopology": {
                                    "fields": {
                                        "sourceClusterId": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "targetClusterId": {
                                            "type": "string",
                                            "id": 2
                                        }
                                    }
                                },
                                "MessageID": {
                                    "fields": {
                                        "id": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "WALName": {
                                            "type": "common.WALName",
                                            "id": 2
                                        }
                                    }
                                },
                                "ImmutableMessage": {
                                    "fields": {
                                        "id": {
                                            "type": "MessageID",
                                            "id": 1
                                        },
                                        "payload": {
                                            "type": "bytes",
                                            "id": 2
                                        },
                                        "properties": {
                                            "keyType": "string",
                                            "type": "string",
                                            "id": 3
                                        }
                                    }
                                },
                                "ReplicateCheckpoint": {
                                    "fields": {
                                        "clusterId": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "pchannel": {
                                            "type": "string",
                                            "id": 2
                                        },
                                        "messageId": {
                                            "type": "common.MessageID",
                                            "id": 3
                                        },
                                        "timeTick": {
                                            "type": "uint64",
                                            "id": 4
                                        }
                                    }
                                },
                                "HighlightData": {
                                    "fields": {
                                        "fragments": {
                                            "rule": "repeated",
                                            "type": "string",
                                            "id": 1
                                        },
                                        "scores": {
                                            "rule": "repeated",
                                            "type": "float",
                                            "id": 2
                                        }
                                    }
                                },
                                "HighlightResult": {
                                    "fields": {
                                        "fieldName": {
                                            "type": "string",
                                            "id": 1
                                        },
                                        "datas": {
                                            "rule": "repeated",
                                            "type": "HighlightData",
                                            "id": 2
                                        }
                                    }
                                },
                                "HighlightType": {
                                    "values": {
                                        "Lexical": 0,
                                        "Semantic": 1
                                    }
                                },
                                "Highlighter": {
                                    "fields": {
                                        "type": {
                                            "type": "HighlightType",
                                            "id": 1
                                        },
                                        "params": {
                                            "rule": "repeated",
                                            "type": "KeyValuePair",
                                            "id": 2
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "google": {
            "nested": {
                "protobuf": {
                    "nested": {
                        "FileDescriptorSet": {
                            "fields": {
                                "file": {
                                    "rule": "repeated",
                                    "type": "FileDescriptorProto",
                                    "id": 1
                                }
                            }
                        },
                        "FileDescriptorProto": {
                            "fields": {
                                "name": {
                                    "type": "string",
                                    "id": 1
                                },
                                "package": {
                                    "type": "string",
                                    "id": 2
                                },
                                "dependency": {
                                    "rule": "repeated",
                                    "type": "string",
                                    "id": 3
                                },
                                "publicDependency": {
                                    "rule": "repeated",
                                    "type": "int32",
                                    "id": 10,
                                    "options": {
                                        "packed": false
                                    }
                                },
                                "weakDependency": {
                                    "rule": "repeated",
                                    "type": "int32",
                                    "id": 11,
                                    "options": {
                                        "packed": false
                                    }
                                },
                                "messageType": {
                                    "rule": "repeated",
                                    "type": "DescriptorProto",
                                    "id": 4
                                },
                                "enumType": {
                                    "rule": "repeated",
                                    "type": "EnumDescriptorProto",
                                    "id": 5
                                },
                                "service": {
                                    "rule": "repeated",
                                    "type": "ServiceDescriptorProto",
                                    "id": 6
                                },
                                "extension": {
                                    "rule": "repeated",
                                    "type": "FieldDescriptorProto",
                                    "id": 7
                                },
                                "options": {
                                    "type": "FileOptions",
                                    "id": 8
                                },
                                "sourceCodeInfo": {
                                    "type": "SourceCodeInfo",
                                    "id": 9
                                },
                                "syntax": {
                                    "type": "string",
                                    "id": 12
                                }
                            }
                        },
                        "DescriptorProto": {
                            "fields": {
                                "name": {
                                    "type": "string",
                                    "id": 1
                                },
                                "field": {
                                    "rule": "repeated",
                                    "type": "FieldDescriptorProto",
                                    "id": 2
                                },
                                "extension": {
                                    "rule": "repeated",
                                    "type": "FieldDescriptorProto",
                                    "id": 6
                                },
                                "nestedType": {
                                    "rule": "repeated",
                                    "type": "DescriptorProto",
                                    "id": 3
                                },
                                "enumType": {
                                    "rule": "repeated",
                                    "type": "EnumDescriptorProto",
                                    "id": 4
                                },
                                "extensionRange": {
                                    "rule": "repeated",
                                    "type": "ExtensionRange",
                                    "id": 5
                                },
                                "oneofDecl": {
                                    "rule": "repeated",
                                    "type": "OneofDescriptorProto",
                                    "id": 8
                                },
                                "options": {
                                    "type": "MessageOptions",
                                    "id": 7
                                },
                                "reservedRange": {
                                    "rule": "repeated",
                                    "type": "ReservedRange",
                                    "id": 9
                                },
                                "reservedName": {
                                    "rule": "repeated",
                                    "type": "string",
                                    "id": 10
                                }
                            },
                            "nested": {
                                "ExtensionRange": {
                                    "fields": {
                                        "start": {
                                            "type": "int32",
                                            "id": 1
                                        },
                                        "end": {
                                            "type": "int32",
                                            "id": 2
                                        }
                                    }
                                },
                                "ReservedRange": {
                                    "fields": {
                                        "start": {
                                            "type": "int32",
                                            "id": 1
                                        },
                                        "end": {
                                            "type": "int32",
                                            "id": 2
                                        }
                                    }
                                }
                            }
                        },
                        "FieldDescriptorProto": {
                            "fields": {
                                "name": {
                                    "type": "string",
                                    "id": 1
                                },
                                "number": {
                                    "type": "int32",
                                    "id": 3
                                },
                                "label": {
                                    "type": "Label",
                                    "id": 4
                                },
                                "type": {
                                    "type": "Type",
                                    "id": 5
                                },
                                "typeName": {
                                    "type": "string",
                                    "id": 6
                                },
                                "extendee": {
                                    "type": "string",
                                    "id": 2
                                },
                                "defaultValue": {
                                    "type": "string",
                                    "id": 7
                                },
                                "oneofIndex": {
                                    "type": "int32",
                                    "id": 9
                                },
                                "jsonName": {
                                    "type": "string",
                                    "id": 10
                                },
                                "options": {
                                    "type": "FieldOptions",
                                    "id": 8
                                }
                            },
                            "nested": {
                                "Type": {
                                    "values": {
                                        "TYPE_DOUBLE": 1,
                                        "TYPE_FLOAT": 2,
                                        "TYPE_INT64": 3,
                                        "TYPE_UINT64": 4,
                                        "TYPE_INT32": 5,
                                        "TYPE_FIXED64": 6,
                                        "TYPE_FIXED32": 7,
                                        "TYPE_BOOL": 8,
                                        "TYPE_STRING": 9,
                                        "TYPE_GROUP": 10,
                                        "TYPE_MESSAGE": 11,
                                        "TYPE_BYTES": 12,
                                        "TYPE_UINT32": 13,
                                        "TYPE_ENUM": 14,
                                        "TYPE_SFIXED32": 15,
                                        "TYPE_SFIXED64": 16,
                                        "TYPE_SINT32": 17,
                                        "TYPE_SINT64": 18
                                    }
                                },
                                "Label": {
                                    "values": {
                                        "LABEL_OPTIONAL": 1,
                                        "LABEL_REQUIRED": 2,
                                        "LABEL_REPEATED": 3
                                    }
                                }
                            }
                        },
                        "OneofDescriptorProto": {
                            "fields": {
                                "name": {
                                    "type": "string",
                                    "id": 1
                                },
                                "options": {
                                    "type": "OneofOptions",
                                    "id": 2
                                }
                            }
                        },
                        "EnumDescriptorProto": {
                            "fields": {
                                "name": {
                                    "type": "string",
                                    "id": 1
                                },
                                "value": {
                                    "rule": "repeated",
                                    "type": "EnumValueDescriptorProto",
                                    "id": 2
                                },
                                "options": {
                                    "type": "EnumOptions",
                                    "id": 3
                                }
                            }
                        },
                        "EnumValueDescriptorProto": {
                            "fields": {
                                "name": {
                                    "type": "string",
                                    "id": 1
                                },
                                "number": {
                                    "type": "int32",
                                    "id": 2
                                },
                                "options": {
                                    "type": "EnumValueOptions",
                                    "id": 3
                                }
                            }
                        },
                        "ServiceDescriptorProto": {
                            "fields": {
                                "name": {
                                    "type": "string",
                                    "id": 1
                                },
                                "method": {
                                    "rule": "repeated",
                                    "type": "MethodDescriptorProto",
                                    "id": 2
                                },
                                "options": {
                                    "type": "ServiceOptions",
                                    "id": 3
                                }
                            }
                        },
                        "MethodDescriptorProto": {
                            "fields": {
                                "name": {
                                    "type": "string",
                                    "id": 1
                                },
                                "inputType": {
                                    "type": "string",
                                    "id": 2
                                },
                                "outputType": {
                                    "type": "string",
                                    "id": 3
                                },
                                "options": {
                                    "type": "MethodOptions",
                                    "id": 4
                                },
                                "clientStreaming": {
                                    "type": "bool",
                                    "id": 5
                                },
                                "serverStreaming": {
                                    "type": "bool",
                                    "id": 6
                                }
                            }
                        },
                        "FileOptions": {
                            "fields": {
                                "javaPackage": {
                                    "type": "string",
                                    "id": 1
                                },
                                "javaOuterClassname": {
                                    "type": "string",
                                    "id": 8
                                },
                                "javaMultipleFiles": {
                                    "type": "bool",
                                    "id": 10
                                },
                                "javaGenerateEqualsAndHash": {
                                    "type": "bool",
                                    "id": 20,
                                    "options": {
                                        "deprecated": true
                                    }
                                },
                                "javaStringCheckUtf8": {
                                    "type": "bool",
                                    "id": 27
                                },
                                "optimizeFor": {
                                    "type": "OptimizeMode",
                                    "id": 9,
                                    "options": {
                                        "default": "SPEED"
                                    }
                                },
                                "goPackage": {
                                    "type": "string",
                                    "id": 11
                                },
                                "ccGenericServices": {
                                    "type": "bool",
                                    "id": 16
                                },
                                "javaGenericServices": {
                                    "type": "bool",
                                    "id": 17
                                },
                                "pyGenericServices": {
                                    "type": "bool",
                                    "id": 18
                                },
                                "deprecated": {
                                    "type": "bool",
                                    "id": 23
                                },
                                "ccEnableArenas": {
                                    "type": "bool",
                                    "id": 31
                                },
                                "objcClassPrefix": {
                                    "type": "string",
                                    "id": 36
                                },
                                "csharpNamespace": {
                                    "type": "string",
                                    "id": 37
                                },
                                "uninterpretedOption": {
                                    "rule": "repeated",
                                    "type": "UninterpretedOption",
                                    "id": 999
                                }
                            },
                            "extensions": [
                                [
                                    1000,
                                    536870911
                                ]
                            ],
                            "reserved": [
                                [
                                    38,
                                    38
                                ]
                            ],
                            "nested": {
                                "OptimizeMode": {
                                    "values": {
                                        "SPEED": 1,
                                        "CODE_SIZE": 2,
                                        "LITE_RUNTIME": 3
                                    }
                                }
                            }
                        },
                        "MessageOptions": {
                            "fields": {
                                "messageSetWireFormat": {
                                    "type": "bool",
                                    "id": 1
                                },
                                "noStandardDescriptorAccessor": {
                                    "type": "bool",
                                    "id": 2
                                },
                                "deprecated": {
                                    "type": "bool",
                                    "id": 3
                                },
                                "mapEntry": {
                                    "type": "bool",
                                    "id": 7
                                },
                                "uninterpretedOption": {
                                    "rule": "repeated",
                                    "type": "UninterpretedOption",
                                    "id": 999
                                }
                            },
                            "extensions": [
                                [
                                    1000,
                                    536870911
                                ]
                            ],
                            "reserved": [
                                [
                                    8,
                                    8
                                ]
                            ]
                        },
                        "FieldOptions": {
                            "fields": {
                                "ctype": {
                                    "type": "CType",
                                    "id": 1,
                                    "options": {
                                        "default": "STRING"
                                    }
                                },
                                "packed": {
                                    "type": "bool",
                                    "id": 2
                                },
                                "jstype": {
                                    "type": "JSType",
                                    "id": 6,
                                    "options": {
                                        "default": "JS_NORMAL"
                                    }
                                },
                                "lazy": {
                                    "type": "bool",
                                    "id": 5
                                },
                                "deprecated": {
                                    "type": "bool",
                                    "id": 3
                                },
                                "weak": {
                                    "type": "bool",
                                    "id": 10
                                },
                                "uninterpretedOption": {
                                    "rule": "repeated",
                                    "type": "UninterpretedOption",
                                    "id": 999
                                }
                            },
                            "extensions": [
                                [
                                    1000,
                                    536870911
                                ]
                            ],
                            "reserved": [
                                [
                                    4,
                                    4
                                ]
                            ],
                            "nested": {
                                "CType": {
                                    "values": {
                                        "STRING": 0,
                                        "CORD": 1,
                                        "STRING_PIECE": 2
                                    }
                                },
                                "JSType": {
                                    "values": {
                                        "JS_NORMAL": 0,
                                        "JS_STRING": 1,
                                        "JS_NUMBER": 2
                                    }
                                }
                            }
                        },
                        "OneofOptions": {
                            "fields": {
                                "uninterpretedOption": {
                                    "rule": "repeated",
                                    "type": "UninterpretedOption",
                                    "id": 999
                                }
                            },
                            "extensions": [
                                [
                                    1000,
                                    536870911
                                ]
                            ]
                        },
                        "EnumOptions": {
                            "fields": {
                                "allowAlias": {
                                    "type": "bool",
                                    "id": 2
                                },
                                "deprecated": {
                                    "type": "bool",
                                    "id": 3
                                },
                                "uninterpretedOption": {
                                    "rule": "repeated",
                                    "type": "UninterpretedOption",
                                    "id": 999
                                }
                            },
                            "extensions": [
                                [
                                    1000,
                                    536870911
                                ]
                            ]
                        },
                        "EnumValueOptions": {
                            "fields": {
                                "deprecated": {
                                    "type": "bool",
                                    "id": 1
                                },
                                "uninterpretedOption": {
                                    "rule": "repeated",
                                    "type": "UninterpretedOption",
                                    "id": 999
                                }
                            },
                            "extensions": [
                                [
                                    1000,
                                    536870911
                                ]
                            ]
                        },
                        "ServiceOptions": {
                            "fields": {
                                "deprecated": {
                                    "type": "bool",
                                    "id": 33
                                },
                                "uninterpretedOption": {
                                    "rule": "repeated",
                                    "type": "UninterpretedOption",
                                    "id": 999
                                }
                            },
                            "extensions": [
                                [
                                    1000,
                                    536870911
                                ]
                            ]
                        },
                        "MethodOptions": {
                            "fields": {
                                "deprecated": {
                                    "type": "bool",
                                    "id": 33
                                },
                                "uninterpretedOption": {
                                    "rule": "repeated",
                                    "type": "UninterpretedOption",
                                    "id": 999
                                }
                            },
                            "extensions": [
                                [
                                    1000,
                                    536870911
                                ]
                            ]
                        },
                        "UninterpretedOption": {
                            "fields": {
                                "name": {
                                    "rule": "repeated",
                                    "type": "NamePart",
                                    "id": 2
                                },
                                "identifierValue": {
                                    "type": "string",
                                    "id": 3
                                },
                                "positiveIntValue": {
                                    "type": "uint64",
                                    "id": 4
                                },
                                "negativeIntValue": {
                                    "type": "int64",
                                    "id": 5
                                },
                                "doubleValue": {
                                    "type": "double",
                                    "id": 6
                                },
                                "stringValue": {
                                    "type": "bytes",
                                    "id": 7
                                },
                                "aggregateValue": {
                                    "type": "string",
                                    "id": 8
                                }
                            },
                            "nested": {
                                "NamePart": {
                                    "fields": {
                                        "namePart": {
                                            "rule": "required",
                                            "type": "string",
                                            "id": 1
                                        },
                                        "isExtension": {
                                            "rule": "required",
                                            "type": "bool",
                                            "id": 2
                                        }
                                    }
                                }
                            }
                        },
                        "SourceCodeInfo": {
                            "fields": {
                                "location": {
                                    "rule": "repeated",
                                    "type": "Location",
                                    "id": 1
                                }
                            },
                            "nested": {
                                "Location": {
                                    "fields": {
                                        "path": {
                                            "rule": "repeated",
                                            "type": "int32",
                                            "id": 1
                                        },
                                        "span": {
                                            "rule": "repeated",
                                            "type": "int32",
                                            "id": 2
                                        },
                                        "leadingComments": {
                                            "type": "string",
                                            "id": 3
                                        },
                                        "trailingComments": {
                                            "type": "string",
                                            "id": 4
                                        },
                                        "leadingDetachedComments": {
                                            "rule": "repeated",
                                            "type": "string",
                                            "id": 6
                                        }
                                    }
                                }
                            }
                        },
                        "GeneratedCodeInfo": {
                            "fields": {
                                "annotation": {
                                    "rule": "repeated",
                                    "type": "Annotation",
                                    "id": 1
                                }
                            },
                            "nested": {
                                "Annotation": {
                                    "fields": {
                                        "path": {
                                            "rule": "repeated",
                                            "type": "int32",
                                            "id": 1
                                        },
                                        "sourceFile": {
                                            "type": "string",
                                            "id": 2
                                        },
                                        "begin": {
                                            "type": "int32",
                                            "id": 3
                                        },
                                        "end": {
                                            "type": "int32",
                                            "id": 4
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};
//# sourceMappingURL=schema.base.js.map