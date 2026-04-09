export declare const operationMethod: {
    readonly type: "string";
    readonly enum: readonly ["get", "post", "put", "delete", "patch", "head", "options", "trace", "connect", "query", "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS", "TRACE", "CONNECT", "QUERY"];
};
export declare const sourceDescriptionSchema: {
    readonly type: "object";
    readonly oneOf: readonly [{
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
            };
            readonly type: {
                readonly type: "string";
                readonly enum: readonly ["openapi"];
            };
            readonly url: {
                readonly type: "string";
            };
            readonly 'x-serverUrl': {
                readonly type: "string";
            };
        };
        readonly additionalProperties: false;
        readonly required: readonly ["name", "type", "url"];
    }, {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
            };
            readonly type: {
                readonly type: "string";
                readonly enum: readonly ["arazzo"];
            };
            readonly url: {
                readonly type: "string";
            };
        };
        readonly additionalProperties: false;
        readonly required: readonly ["name", "type", "url"];
    }];
};
export declare const extendedOperation: {
    readonly type: "object";
    readonly properties: {
        readonly url: {
            readonly type: "string";
        };
        readonly method: {
            readonly type: "string";
            readonly enum: readonly ["get", "post", "put", "delete", "patch", "head", "options", "trace", "connect", "query", "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS", "TRACE", "CONNECT", "QUERY"];
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["url", "method"];
};
export declare const reusableObject: {
    readonly type: "object";
    readonly properties: {
        readonly reference: {
            readonly type: "string";
        };
        readonly value: {
            readonly oneOf: readonly [{
                readonly type: "string";
            }, {
                readonly type: "number";
            }, {
                readonly type: "boolean";
            }];
        };
    };
    readonly required: readonly ["reference"];
    readonly additionalProperties: false;
};
export declare const parameter: {
    readonly type: "object";
    readonly oneOf: readonly [{
        readonly type: "object";
        readonly properties: {
            readonly in: {
                readonly type: "string";
                readonly enum: readonly ["header", "query", "path", "cookie"];
            };
            readonly name: {
                readonly type: "string";
            };
            readonly value: {
                readonly oneOf: readonly [{
                    readonly type: "string";
                }, {
                    readonly type: "number";
                }, {
                    readonly type: "boolean";
                }];
            };
        };
        readonly required: readonly ["name", "value"];
        readonly additionalProperties: false;
    }, {
        readonly type: "object";
        readonly properties: {
            readonly reference: {
                readonly type: "string";
            };
            readonly value: {
                readonly oneOf: readonly [{
                    readonly type: "string";
                }, {
                    readonly type: "number";
                }, {
                    readonly type: "boolean";
                }];
            };
        };
        readonly required: readonly ["reference"];
        readonly additionalProperties: false;
    }];
};
export declare const infoObject: {
    readonly type: "object";
    readonly properties: {
        readonly title: {
            readonly type: "string";
        };
        readonly description: {
            readonly type: "string";
        };
        readonly summary: {
            readonly type: "string";
        };
        readonly version: {
            readonly type: "string";
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["title", "version"];
};
export declare const replacement: {
    readonly type: "object";
    readonly properties: {
        readonly target: {
            readonly type: "string";
        };
        readonly value: {
            readonly oneOf: readonly [{
                readonly type: "string";
            }, {
                readonly type: "object";
            }, {
                readonly type: "array";
            }, {
                readonly type: "number";
            }, {
                readonly type: "boolean";
            }];
        };
    };
};
export declare const requestBody: {
    readonly type: "object";
    readonly properties: {
        readonly contentType: {
            readonly type: "string";
        };
        readonly payload: {
            readonly oneOf: readonly [{
                readonly type: "string";
            }, {
                readonly type: "object";
                readonly additionalProperties: true;
            }, {
                readonly type: "array";
            }, {
                readonly type: "number";
            }, {
                readonly type: "boolean";
            }];
        };
        readonly encoding: {
            readonly type: "string";
        };
        readonly replacements: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly target: {
                        readonly type: "string";
                    };
                    readonly value: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                        }, {
                            readonly type: "object";
                        }, {
                            readonly type: "array";
                        }, {
                            readonly type: "number";
                        }, {
                            readonly type: "boolean";
                        }];
                    };
                };
            };
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["payload"];
};
export declare const criteriaObject: {
    readonly type: "object";
    readonly properties: {
        readonly condition: {
            readonly type: "string";
        };
        readonly context: {
            readonly type: "string";
        };
        readonly type: {
            readonly oneOf: readonly [{
                readonly type: "string";
                readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
            }, {
                readonly type: "object";
                readonly properties: {
                    readonly type: {
                        readonly type: "string";
                        readonly enum: readonly ["jsonpath"];
                    };
                    readonly version: {
                        readonly type: "string";
                        readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                    };
                };
            }, {
                readonly type: "object";
                readonly properties: {
                    readonly type: {
                        readonly type: "string";
                        readonly enum: readonly ["xpath"];
                    };
                    readonly version: {
                        readonly type: "string";
                        readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                    };
                };
            }];
        };
    };
    readonly required: readonly ["condition"];
    readonly additionalProperties: false;
};
export declare const onSuccessObject: {
    readonly type: "object";
    readonly properties: {
        readonly name: {
            readonly type: "string";
        };
        readonly type: {
            readonly type: "string";
            readonly enum: readonly ["goto", "end"];
        };
        readonly stepId: {
            readonly type: "string";
        };
        readonly workflowId: {
            readonly type: "string";
        };
        readonly criteria: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly condition: {
                        readonly type: "string";
                    };
                    readonly context: {
                        readonly type: "string";
                    };
                    readonly type: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                            readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                        }, {
                            readonly type: "object";
                            readonly properties: {
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: readonly ["jsonpath"];
                                };
                                readonly version: {
                                    readonly type: "string";
                                    readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                };
                            };
                        }, {
                            readonly type: "object";
                            readonly properties: {
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: readonly ["xpath"];
                                };
                                readonly version: {
                                    readonly type: "string";
                                    readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                };
                            };
                        }];
                    };
                };
                readonly required: readonly ["condition"];
                readonly additionalProperties: false;
            };
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["type", "name"];
};
export declare const onFailureObject: {
    readonly type: "object";
    readonly properties: {
        readonly name: {
            readonly type: "string";
        };
        readonly type: {
            readonly type: "string";
            readonly enum: readonly ["goto", "retry", "end"];
        };
        readonly workflowId: {
            readonly type: "string";
        };
        readonly stepId: {
            readonly type: "string";
        };
        readonly retryAfter: {
            readonly type: "number";
        };
        readonly retryLimit: {
            readonly type: "number";
        };
        readonly criteria: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly condition: {
                        readonly type: "string";
                    };
                    readonly context: {
                        readonly type: "string";
                    };
                    readonly type: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                            readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                        }, {
                            readonly type: "object";
                            readonly properties: {
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: readonly ["jsonpath"];
                                };
                                readonly version: {
                                    readonly type: "string";
                                    readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                };
                            };
                        }, {
                            readonly type: "object";
                            readonly properties: {
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: readonly ["xpath"];
                                };
                                readonly version: {
                                    readonly type: "string";
                                    readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                };
                            };
                        }];
                    };
                };
                readonly required: readonly ["condition"];
                readonly additionalProperties: false;
            };
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["type", "name"];
};
export declare const step: {
    readonly type: "object";
    readonly properties: {
        readonly stepId: {
            readonly type: "string";
        };
        readonly description: {
            readonly type: "string";
        };
        readonly operationId: {
            readonly type: "string";
        };
        readonly operationPath: {
            readonly type: "string";
        };
        readonly workflowId: {
            readonly type: "string";
        };
        readonly parameters: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly oneOf: readonly [{
                    readonly type: "object";
                    readonly properties: {
                        readonly in: {
                            readonly type: "string";
                            readonly enum: readonly ["header", "query", "path", "cookie"];
                        };
                        readonly name: {
                            readonly type: "string";
                        };
                        readonly value: {
                            readonly oneOf: readonly [{
                                readonly type: "string";
                            }, {
                                readonly type: "number";
                            }, {
                                readonly type: "boolean";
                            }];
                        };
                    };
                    readonly required: readonly ["name", "value"];
                    readonly additionalProperties: false;
                }, {
                    readonly type: "object";
                    readonly properties: {
                        readonly reference: {
                            readonly type: "string";
                        };
                        readonly value: {
                            readonly oneOf: readonly [{
                                readonly type: "string";
                            }, {
                                readonly type: "number";
                            }, {
                                readonly type: "boolean";
                            }];
                        };
                    };
                    readonly required: readonly ["reference"];
                    readonly additionalProperties: false;
                }];
            };
        };
        readonly successCriteria: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly condition: {
                        readonly type: "string";
                    };
                    readonly context: {
                        readonly type: "string";
                    };
                    readonly type: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                            readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                        }, {
                            readonly type: "object";
                            readonly properties: {
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: readonly ["jsonpath"];
                                };
                                readonly version: {
                                    readonly type: "string";
                                    readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                };
                            };
                        }, {
                            readonly type: "object";
                            readonly properties: {
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: readonly ["xpath"];
                                };
                                readonly version: {
                                    readonly type: "string";
                                    readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                };
                            };
                        }];
                    };
                };
                readonly required: readonly ["condition"];
                readonly additionalProperties: false;
            };
        };
        readonly onSuccess: {
            readonly type: "array";
            readonly items: {
                readonly oneOf: readonly [{
                    readonly type: "object";
                    readonly properties: {
                        readonly name: {
                            readonly type: "string";
                        };
                        readonly type: {
                            readonly type: "string";
                            readonly enum: readonly ["goto", "end"];
                        };
                        readonly stepId: {
                            readonly type: "string";
                        };
                        readonly workflowId: {
                            readonly type: "string";
                        };
                        readonly criteria: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly condition: {
                                        readonly type: "string";
                                    };
                                    readonly context: {
                                        readonly type: "string";
                                    };
                                    readonly type: {
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                            readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                        }, {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly type: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["jsonpath"];
                                                };
                                                readonly version: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                                };
                                            };
                                        }, {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly type: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["xpath"];
                                                };
                                                readonly version: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                                };
                                            };
                                        }];
                                    };
                                };
                                readonly required: readonly ["condition"];
                                readonly additionalProperties: false;
                            };
                        };
                    };
                    readonly additionalProperties: false;
                    readonly required: readonly ["type", "name"];
                }, {
                    readonly type: "object";
                    readonly properties: {
                        readonly reference: {
                            readonly type: "string";
                        };
                        readonly value: {
                            readonly oneOf: readonly [{
                                readonly type: "string";
                            }, {
                                readonly type: "number";
                            }, {
                                readonly type: "boolean";
                            }];
                        };
                    };
                    readonly required: readonly ["reference"];
                    readonly additionalProperties: false;
                }];
            };
        };
        readonly onFailure: {
            readonly type: "array";
            readonly items: {
                readonly oneOf: readonly [{
                    readonly type: "object";
                    readonly properties: {
                        readonly name: {
                            readonly type: "string";
                        };
                        readonly type: {
                            readonly type: "string";
                            readonly enum: readonly ["goto", "retry", "end"];
                        };
                        readonly workflowId: {
                            readonly type: "string";
                        };
                        readonly stepId: {
                            readonly type: "string";
                        };
                        readonly retryAfter: {
                            readonly type: "number";
                        };
                        readonly retryLimit: {
                            readonly type: "number";
                        };
                        readonly criteria: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly condition: {
                                        readonly type: "string";
                                    };
                                    readonly context: {
                                        readonly type: "string";
                                    };
                                    readonly type: {
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                            readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                        }, {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly type: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["jsonpath"];
                                                };
                                                readonly version: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                                };
                                            };
                                        }, {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly type: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["xpath"];
                                                };
                                                readonly version: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                                };
                                            };
                                        }];
                                    };
                                };
                                readonly required: readonly ["condition"];
                                readonly additionalProperties: false;
                            };
                        };
                    };
                    readonly additionalProperties: false;
                    readonly required: readonly ["type", "name"];
                }, {
                    readonly type: "object";
                    readonly properties: {
                        readonly reference: {
                            readonly type: "string";
                        };
                        readonly value: {
                            readonly oneOf: readonly [{
                                readonly type: "string";
                            }, {
                                readonly type: "number";
                            }, {
                                readonly type: "boolean";
                            }];
                        };
                    };
                    readonly required: readonly ["reference"];
                    readonly additionalProperties: false;
                }];
            };
        };
        readonly outputs: {
            readonly type: "object";
            readonly additionalProperties: {
                readonly oneOf: readonly [{
                    readonly type: "string";
                }, {
                    readonly type: "object";
                }, {
                    readonly type: "array";
                }, {
                    readonly type: "boolean";
                }, {
                    readonly type: "number";
                }];
            };
        };
        readonly 'x-operation': {
            readonly type: "object";
            readonly properties: {
                readonly url: {
                    readonly type: "string";
                };
                readonly method: {
                    readonly type: "string";
                    readonly enum: readonly ["get", "post", "put", "delete", "patch", "head", "options", "trace", "connect", "query", "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS", "TRACE", "CONNECT", "QUERY"];
                };
            };
            readonly additionalProperties: false;
            readonly required: readonly ["url", "method"];
        };
        readonly requestBody: {
            readonly type: "object";
            readonly properties: {
                readonly contentType: {
                    readonly type: "string";
                };
                readonly payload: {
                    readonly oneOf: readonly [{
                        readonly type: "string";
                    }, {
                        readonly type: "object";
                        readonly additionalProperties: true;
                    }, {
                        readonly type: "array";
                    }, {
                        readonly type: "number";
                    }, {
                        readonly type: "boolean";
                    }];
                };
                readonly encoding: {
                    readonly type: "string";
                };
                readonly replacements: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly target: {
                                readonly type: "string";
                            };
                            readonly value: {
                                readonly oneOf: readonly [{
                                    readonly type: "string";
                                }, {
                                    readonly type: "object";
                                }, {
                                    readonly type: "array";
                                }, {
                                    readonly type: "number";
                                }, {
                                    readonly type: "boolean";
                                }];
                            };
                        };
                    };
                };
            };
            readonly additionalProperties: false;
            readonly required: readonly ["payload"];
        };
    };
    readonly required: readonly ["stepId"];
    readonly oneOf: readonly [{
        readonly required: readonly ["x-operation"];
    }, {
        readonly required: readonly ["operationId"];
    }, {
        readonly required: readonly ["operationPath"];
    }, {
        readonly required: readonly ["workflowId"];
    }];
};
export declare const workflow: {
    readonly type: "object";
    readonly properties: {
        readonly workflowId: {
            readonly type: "string";
        };
        readonly summary: {
            readonly type: "string";
        };
        readonly description: {
            readonly type: "string";
        };
        readonly parameters: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly oneOf: readonly [{
                    readonly type: "object";
                    readonly properties: {
                        readonly in: {
                            readonly type: "string";
                            readonly enum: readonly ["header", "query", "path", "cookie"];
                        };
                        readonly name: {
                            readonly type: "string";
                        };
                        readonly value: {
                            readonly oneOf: readonly [{
                                readonly type: "string";
                            }, {
                                readonly type: "number";
                            }, {
                                readonly type: "boolean";
                            }];
                        };
                    };
                    readonly required: readonly ["name", "value"];
                    readonly additionalProperties: false;
                }, {
                    readonly type: "object";
                    readonly properties: {
                        readonly reference: {
                            readonly type: "string";
                        };
                        readonly value: {
                            readonly oneOf: readonly [{
                                readonly type: "string";
                            }, {
                                readonly type: "number";
                            }, {
                                readonly type: "boolean";
                            }];
                        };
                    };
                    readonly required: readonly ["reference"];
                    readonly additionalProperties: false;
                }];
            };
        };
        readonly dependsOn: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
        readonly inputs: {
            readonly type: "object";
            readonly properties: {
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["object", "array", "string", "number", "integer", "boolean", "null"];
                };
                readonly format: {
                    readonly type: "string";
                };
                readonly properties: {
                    readonly type: "object";
                    readonly additionalProperties: true;
                };
                readonly required: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
                readonly items: {
                    readonly type: "object";
                    readonly additionalProperties: true;
                };
            };
            readonly required: readonly ["type"];
            readonly additionalProperties: true;
        };
        readonly outputs: {
            readonly type: "object";
            readonly additionalProperties: {
                readonly type: "string";
            };
        };
        readonly steps: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly stepId: {
                        readonly type: "string";
                    };
                    readonly description: {
                        readonly type: "string";
                    };
                    readonly operationId: {
                        readonly type: "string";
                    };
                    readonly operationPath: {
                        readonly type: "string";
                    };
                    readonly workflowId: {
                        readonly type: "string";
                    };
                    readonly parameters: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly oneOf: readonly [{
                                readonly type: "object";
                                readonly properties: {
                                    readonly in: {
                                        readonly type: "string";
                                        readonly enum: readonly ["header", "query", "path", "cookie"];
                                    };
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                    readonly value: {
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                        }, {
                                            readonly type: "number";
                                        }, {
                                            readonly type: "boolean";
                                        }];
                                    };
                                };
                                readonly required: readonly ["name", "value"];
                                readonly additionalProperties: false;
                            }, {
                                readonly type: "object";
                                readonly properties: {
                                    readonly reference: {
                                        readonly type: "string";
                                    };
                                    readonly value: {
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                        }, {
                                            readonly type: "number";
                                        }, {
                                            readonly type: "boolean";
                                        }];
                                    };
                                };
                                readonly required: readonly ["reference"];
                                readonly additionalProperties: false;
                            }];
                        };
                    };
                    readonly successCriteria: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly condition: {
                                    readonly type: "string";
                                };
                                readonly context: {
                                    readonly type: "string";
                                };
                                readonly type: {
                                    readonly oneOf: readonly [{
                                        readonly type: "string";
                                        readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                    }, {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly type: {
                                                readonly type: "string";
                                                readonly enum: readonly ["jsonpath"];
                                            };
                                            readonly version: {
                                                readonly type: "string";
                                                readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                            };
                                        };
                                    }, {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly type: {
                                                readonly type: "string";
                                                readonly enum: readonly ["xpath"];
                                            };
                                            readonly version: {
                                                readonly type: "string";
                                                readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                            };
                                        };
                                    }];
                                };
                            };
                            readonly required: readonly ["condition"];
                            readonly additionalProperties: false;
                        };
                    };
                    readonly onSuccess: {
                        readonly type: "array";
                        readonly items: {
                            readonly oneOf: readonly [{
                                readonly type: "object";
                                readonly properties: {
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly enum: readonly ["goto", "end"];
                                    };
                                    readonly stepId: {
                                        readonly type: "string";
                                    };
                                    readonly workflowId: {
                                        readonly type: "string";
                                    };
                                    readonly criteria: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly condition: {
                                                    readonly type: "string";
                                                };
                                                readonly context: {
                                                    readonly type: "string";
                                                };
                                                readonly type: {
                                                    readonly oneOf: readonly [{
                                                        readonly type: "string";
                                                        readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                                    }, {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly type: {
                                                                readonly type: "string";
                                                                readonly enum: readonly ["jsonpath"];
                                                            };
                                                            readonly version: {
                                                                readonly type: "string";
                                                                readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                                            };
                                                        };
                                                    }, {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly type: {
                                                                readonly type: "string";
                                                                readonly enum: readonly ["xpath"];
                                                            };
                                                            readonly version: {
                                                                readonly type: "string";
                                                                readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                                            };
                                                        };
                                                    }];
                                                };
                                            };
                                            readonly required: readonly ["condition"];
                                            readonly additionalProperties: false;
                                        };
                                    };
                                };
                                readonly additionalProperties: false;
                                readonly required: readonly ["type", "name"];
                            }, {
                                readonly type: "object";
                                readonly properties: {
                                    readonly reference: {
                                        readonly type: "string";
                                    };
                                    readonly value: {
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                        }, {
                                            readonly type: "number";
                                        }, {
                                            readonly type: "boolean";
                                        }];
                                    };
                                };
                                readonly required: readonly ["reference"];
                                readonly additionalProperties: false;
                            }];
                        };
                    };
                    readonly onFailure: {
                        readonly type: "array";
                        readonly items: {
                            readonly oneOf: readonly [{
                                readonly type: "object";
                                readonly properties: {
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly enum: readonly ["goto", "retry", "end"];
                                    };
                                    readonly workflowId: {
                                        readonly type: "string";
                                    };
                                    readonly stepId: {
                                        readonly type: "string";
                                    };
                                    readonly retryAfter: {
                                        readonly type: "number";
                                    };
                                    readonly retryLimit: {
                                        readonly type: "number";
                                    };
                                    readonly criteria: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly condition: {
                                                    readonly type: "string";
                                                };
                                                readonly context: {
                                                    readonly type: "string";
                                                };
                                                readonly type: {
                                                    readonly oneOf: readonly [{
                                                        readonly type: "string";
                                                        readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                                    }, {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly type: {
                                                                readonly type: "string";
                                                                readonly enum: readonly ["jsonpath"];
                                                            };
                                                            readonly version: {
                                                                readonly type: "string";
                                                                readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                                            };
                                                        };
                                                    }, {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly type: {
                                                                readonly type: "string";
                                                                readonly enum: readonly ["xpath"];
                                                            };
                                                            readonly version: {
                                                                readonly type: "string";
                                                                readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                                            };
                                                        };
                                                    }];
                                                };
                                            };
                                            readonly required: readonly ["condition"];
                                            readonly additionalProperties: false;
                                        };
                                    };
                                };
                                readonly additionalProperties: false;
                                readonly required: readonly ["type", "name"];
                            }, {
                                readonly type: "object";
                                readonly properties: {
                                    readonly reference: {
                                        readonly type: "string";
                                    };
                                    readonly value: {
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                        }, {
                                            readonly type: "number";
                                        }, {
                                            readonly type: "boolean";
                                        }];
                                    };
                                };
                                readonly required: readonly ["reference"];
                                readonly additionalProperties: false;
                            }];
                        };
                    };
                    readonly outputs: {
                        readonly type: "object";
                        readonly additionalProperties: {
                            readonly oneOf: readonly [{
                                readonly type: "string";
                            }, {
                                readonly type: "object";
                            }, {
                                readonly type: "array";
                            }, {
                                readonly type: "boolean";
                            }, {
                                readonly type: "number";
                            }];
                        };
                    };
                    readonly 'x-operation': {
                        readonly type: "object";
                        readonly properties: {
                            readonly url: {
                                readonly type: "string";
                            };
                            readonly method: {
                                readonly type: "string";
                                readonly enum: readonly ["get", "post", "put", "delete", "patch", "head", "options", "trace", "connect", "query", "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS", "TRACE", "CONNECT", "QUERY"];
                            };
                        };
                        readonly additionalProperties: false;
                        readonly required: readonly ["url", "method"];
                    };
                    readonly requestBody: {
                        readonly type: "object";
                        readonly properties: {
                            readonly contentType: {
                                readonly type: "string";
                            };
                            readonly payload: {
                                readonly oneOf: readonly [{
                                    readonly type: "string";
                                }, {
                                    readonly type: "object";
                                    readonly additionalProperties: true;
                                }, {
                                    readonly type: "array";
                                }, {
                                    readonly type: "number";
                                }, {
                                    readonly type: "boolean";
                                }];
                            };
                            readonly encoding: {
                                readonly type: "string";
                            };
                            readonly replacements: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly target: {
                                            readonly type: "string";
                                        };
                                        readonly value: {
                                            readonly oneOf: readonly [{
                                                readonly type: "string";
                                            }, {
                                                readonly type: "object";
                                            }, {
                                                readonly type: "array";
                                            }, {
                                                readonly type: "number";
                                            }, {
                                                readonly type: "boolean";
                                            }];
                                        };
                                    };
                                };
                            };
                        };
                        readonly additionalProperties: false;
                        readonly required: readonly ["payload"];
                    };
                };
                readonly required: readonly ["stepId"];
                readonly oneOf: readonly [{
                    readonly required: readonly ["x-operation"];
                }, {
                    readonly required: readonly ["operationId"];
                }, {
                    readonly required: readonly ["operationPath"];
                }, {
                    readonly required: readonly ["workflowId"];
                }];
            };
        };
        readonly successActions: {
            readonly type: "array";
            readonly items: {
                readonly oneOf: readonly [{
                    readonly type: "object";
                    readonly properties: {
                        readonly name: {
                            readonly type: "string";
                        };
                        readonly type: {
                            readonly type: "string";
                            readonly enum: readonly ["goto", "end"];
                        };
                        readonly stepId: {
                            readonly type: "string";
                        };
                        readonly workflowId: {
                            readonly type: "string";
                        };
                        readonly criteria: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly condition: {
                                        readonly type: "string";
                                    };
                                    readonly context: {
                                        readonly type: "string";
                                    };
                                    readonly type: {
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                            readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                        }, {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly type: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["jsonpath"];
                                                };
                                                readonly version: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                                };
                                            };
                                        }, {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly type: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["xpath"];
                                                };
                                                readonly version: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                                };
                                            };
                                        }];
                                    };
                                };
                                readonly required: readonly ["condition"];
                                readonly additionalProperties: false;
                            };
                        };
                    };
                    readonly additionalProperties: false;
                    readonly required: readonly ["type", "name"];
                }, {
                    readonly type: "object";
                    readonly properties: {
                        readonly reference: {
                            readonly type: "string";
                        };
                        readonly value: {
                            readonly oneOf: readonly [{
                                readonly type: "string";
                            }, {
                                readonly type: "number";
                            }, {
                                readonly type: "boolean";
                            }];
                        };
                    };
                    readonly required: readonly ["reference"];
                    readonly additionalProperties: false;
                }];
            };
        };
        readonly failureActions: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly type: {
                        readonly type: "string";
                        readonly enum: readonly ["goto", "retry", "end"];
                    };
                    readonly workflowId: {
                        readonly type: "string";
                    };
                    readonly stepId: {
                        readonly type: "string";
                    };
                    readonly retryAfter: {
                        readonly type: "number";
                    };
                    readonly retryLimit: {
                        readonly type: "number";
                    };
                    readonly criteria: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly condition: {
                                    readonly type: "string";
                                };
                                readonly context: {
                                    readonly type: "string";
                                };
                                readonly type: {
                                    readonly oneOf: readonly [{
                                        readonly type: "string";
                                        readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                    }, {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly type: {
                                                readonly type: "string";
                                                readonly enum: readonly ["jsonpath"];
                                            };
                                            readonly version: {
                                                readonly type: "string";
                                                readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                            };
                                        };
                                    }, {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly type: {
                                                readonly type: "string";
                                                readonly enum: readonly ["xpath"];
                                            };
                                            readonly version: {
                                                readonly type: "string";
                                                readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                            };
                                        };
                                    }];
                                };
                            };
                            readonly required: readonly ["condition"];
                            readonly additionalProperties: false;
                        };
                    };
                };
                readonly additionalProperties: false;
                readonly required: readonly ["type", "name"];
            };
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["workflowId", "steps"];
};
export declare const arazzoSchema: {
    readonly type: "object";
    readonly properties: {
        readonly arazzo: {
            readonly type: "string";
            readonly enum: readonly ["1.0.0"];
        };
        readonly info: {
            readonly type: "object";
            readonly properties: {
                readonly title: {
                    readonly type: "string";
                };
                readonly description: {
                    readonly type: "string";
                };
                readonly summary: {
                    readonly type: "string";
                };
                readonly version: {
                    readonly type: "string";
                };
            };
            readonly additionalProperties: false;
            readonly required: readonly ["title", "version"];
        };
        readonly sourceDescriptions: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly oneOf: readonly [{
                    readonly type: "object";
                    readonly properties: {
                        readonly name: {
                            readonly type: "string";
                        };
                        readonly type: {
                            readonly type: "string";
                            readonly enum: readonly ["openapi"];
                        };
                        readonly url: {
                            readonly type: "string";
                        };
                        readonly 'x-serverUrl': {
                            readonly type: "string";
                        };
                    };
                    readonly additionalProperties: false;
                    readonly required: readonly ["name", "type", "url"];
                }, {
                    readonly type: "object";
                    readonly properties: {
                        readonly name: {
                            readonly type: "string";
                        };
                        readonly type: {
                            readonly type: "string";
                            readonly enum: readonly ["arazzo"];
                        };
                        readonly url: {
                            readonly type: "string";
                        };
                    };
                    readonly additionalProperties: false;
                    readonly required: readonly ["name", "type", "url"];
                }];
            };
        };
        readonly workflows: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly workflowId: {
                        readonly type: "string";
                    };
                    readonly summary: {
                        readonly type: "string";
                    };
                    readonly description: {
                        readonly type: "string";
                    };
                    readonly parameters: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly oneOf: readonly [{
                                readonly type: "object";
                                readonly properties: {
                                    readonly in: {
                                        readonly type: "string";
                                        readonly enum: readonly ["header", "query", "path", "cookie"];
                                    };
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                    readonly value: {
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                        }, {
                                            readonly type: "number";
                                        }, {
                                            readonly type: "boolean";
                                        }];
                                    };
                                };
                                readonly required: readonly ["name", "value"];
                                readonly additionalProperties: false;
                            }, {
                                readonly type: "object";
                                readonly properties: {
                                    readonly reference: {
                                        readonly type: "string";
                                    };
                                    readonly value: {
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                        }, {
                                            readonly type: "number";
                                        }, {
                                            readonly type: "boolean";
                                        }];
                                    };
                                };
                                readonly required: readonly ["reference"];
                                readonly additionalProperties: false;
                            }];
                        };
                    };
                    readonly dependsOn: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly inputs: {
                        readonly type: "object";
                        readonly properties: {
                            readonly type: {
                                readonly type: "string";
                                readonly enum: readonly ["object", "array", "string", "number", "integer", "boolean", "null"];
                            };
                            readonly format: {
                                readonly type: "string";
                            };
                            readonly properties: {
                                readonly type: "object";
                                readonly additionalProperties: true;
                            };
                            readonly required: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                            };
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: true;
                            };
                        };
                        readonly required: readonly ["type"];
                        readonly additionalProperties: true;
                    };
                    readonly outputs: {
                        readonly type: "object";
                        readonly additionalProperties: {
                            readonly type: "string";
                        };
                    };
                    readonly steps: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly stepId: {
                                    readonly type: "string";
                                };
                                readonly description: {
                                    readonly type: "string";
                                };
                                readonly operationId: {
                                    readonly type: "string";
                                };
                                readonly operationPath: {
                                    readonly type: "string";
                                };
                                readonly workflowId: {
                                    readonly type: "string";
                                };
                                readonly parameters: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly oneOf: readonly [{
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly in: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["header", "query", "path", "cookie"];
                                                };
                                                readonly name: {
                                                    readonly type: "string";
                                                };
                                                readonly value: {
                                                    readonly oneOf: readonly [{
                                                        readonly type: "string";
                                                    }, {
                                                        readonly type: "number";
                                                    }, {
                                                        readonly type: "boolean";
                                                    }];
                                                };
                                            };
                                            readonly required: readonly ["name", "value"];
                                            readonly additionalProperties: false;
                                        }, {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly reference: {
                                                    readonly type: "string";
                                                };
                                                readonly value: {
                                                    readonly oneOf: readonly [{
                                                        readonly type: "string";
                                                    }, {
                                                        readonly type: "number";
                                                    }, {
                                                        readonly type: "boolean";
                                                    }];
                                                };
                                            };
                                            readonly required: readonly ["reference"];
                                            readonly additionalProperties: false;
                                        }];
                                    };
                                };
                                readonly successCriteria: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly condition: {
                                                readonly type: "string";
                                            };
                                            readonly context: {
                                                readonly type: "string";
                                            };
                                            readonly type: {
                                                readonly oneOf: readonly [{
                                                    readonly type: "string";
                                                    readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                                }, {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly type: {
                                                            readonly type: "string";
                                                            readonly enum: readonly ["jsonpath"];
                                                        };
                                                        readonly version: {
                                                            readonly type: "string";
                                                            readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                                        };
                                                    };
                                                }, {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly type: {
                                                            readonly type: "string";
                                                            readonly enum: readonly ["xpath"];
                                                        };
                                                        readonly version: {
                                                            readonly type: "string";
                                                            readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                                        };
                                                    };
                                                }];
                                            };
                                        };
                                        readonly required: readonly ["condition"];
                                        readonly additionalProperties: false;
                                    };
                                };
                                readonly onSuccess: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly oneOf: readonly [{
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly name: {
                                                    readonly type: "string";
                                                };
                                                readonly type: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["goto", "end"];
                                                };
                                                readonly stepId: {
                                                    readonly type: "string";
                                                };
                                                readonly workflowId: {
                                                    readonly type: "string";
                                                };
                                                readonly criteria: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly condition: {
                                                                readonly type: "string";
                                                            };
                                                            readonly context: {
                                                                readonly type: "string";
                                                            };
                                                            readonly type: {
                                                                readonly oneOf: readonly [{
                                                                    readonly type: "string";
                                                                    readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                                                }, {
                                                                    readonly type: "object";
                                                                    readonly properties: {
                                                                        readonly type: {
                                                                            readonly type: "string";
                                                                            readonly enum: readonly ["jsonpath"];
                                                                        };
                                                                        readonly version: {
                                                                            readonly type: "string";
                                                                            readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                                                        };
                                                                    };
                                                                }, {
                                                                    readonly type: "object";
                                                                    readonly properties: {
                                                                        readonly type: {
                                                                            readonly type: "string";
                                                                            readonly enum: readonly ["xpath"];
                                                                        };
                                                                        readonly version: {
                                                                            readonly type: "string";
                                                                            readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                                                        };
                                                                    };
                                                                }];
                                                            };
                                                        };
                                                        readonly required: readonly ["condition"];
                                                        readonly additionalProperties: false;
                                                    };
                                                };
                                            };
                                            readonly additionalProperties: false;
                                            readonly required: readonly ["type", "name"];
                                        }, {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly reference: {
                                                    readonly type: "string";
                                                };
                                                readonly value: {
                                                    readonly oneOf: readonly [{
                                                        readonly type: "string";
                                                    }, {
                                                        readonly type: "number";
                                                    }, {
                                                        readonly type: "boolean";
                                                    }];
                                                };
                                            };
                                            readonly required: readonly ["reference"];
                                            readonly additionalProperties: false;
                                        }];
                                    };
                                };
                                readonly onFailure: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly oneOf: readonly [{
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly name: {
                                                    readonly type: "string";
                                                };
                                                readonly type: {
                                                    readonly type: "string";
                                                    readonly enum: readonly ["goto", "retry", "end"];
                                                };
                                                readonly workflowId: {
                                                    readonly type: "string";
                                                };
                                                readonly stepId: {
                                                    readonly type: "string";
                                                };
                                                readonly retryAfter: {
                                                    readonly type: "number";
                                                };
                                                readonly retryLimit: {
                                                    readonly type: "number";
                                                };
                                                readonly criteria: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly condition: {
                                                                readonly type: "string";
                                                            };
                                                            readonly context: {
                                                                readonly type: "string";
                                                            };
                                                            readonly type: {
                                                                readonly oneOf: readonly [{
                                                                    readonly type: "string";
                                                                    readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                                                }, {
                                                                    readonly type: "object";
                                                                    readonly properties: {
                                                                        readonly type: {
                                                                            readonly type: "string";
                                                                            readonly enum: readonly ["jsonpath"];
                                                                        };
                                                                        readonly version: {
                                                                            readonly type: "string";
                                                                            readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                                                        };
                                                                    };
                                                                }, {
                                                                    readonly type: "object";
                                                                    readonly properties: {
                                                                        readonly type: {
                                                                            readonly type: "string";
                                                                            readonly enum: readonly ["xpath"];
                                                                        };
                                                                        readonly version: {
                                                                            readonly type: "string";
                                                                            readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                                                        };
                                                                    };
                                                                }];
                                                            };
                                                        };
                                                        readonly required: readonly ["condition"];
                                                        readonly additionalProperties: false;
                                                    };
                                                };
                                            };
                                            readonly additionalProperties: false;
                                            readonly required: readonly ["type", "name"];
                                        }, {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly reference: {
                                                    readonly type: "string";
                                                };
                                                readonly value: {
                                                    readonly oneOf: readonly [{
                                                        readonly type: "string";
                                                    }, {
                                                        readonly type: "number";
                                                    }, {
                                                        readonly type: "boolean";
                                                    }];
                                                };
                                            };
                                            readonly required: readonly ["reference"];
                                            readonly additionalProperties: false;
                                        }];
                                    };
                                };
                                readonly outputs: {
                                    readonly type: "object";
                                    readonly additionalProperties: {
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                        }, {
                                            readonly type: "object";
                                        }, {
                                            readonly type: "array";
                                        }, {
                                            readonly type: "boolean";
                                        }, {
                                            readonly type: "number";
                                        }];
                                    };
                                };
                                readonly 'x-operation': {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly url: {
                                            readonly type: "string";
                                        };
                                        readonly method: {
                                            readonly type: "string";
                                            readonly enum: readonly ["get", "post", "put", "delete", "patch", "head", "options", "trace", "connect", "query", "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS", "TRACE", "CONNECT", "QUERY"];
                                        };
                                    };
                                    readonly additionalProperties: false;
                                    readonly required: readonly ["url", "method"];
                                };
                                readonly requestBody: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly contentType: {
                                            readonly type: "string";
                                        };
                                        readonly payload: {
                                            readonly oneOf: readonly [{
                                                readonly type: "string";
                                            }, {
                                                readonly type: "object";
                                                readonly additionalProperties: true;
                                            }, {
                                                readonly type: "array";
                                            }, {
                                                readonly type: "number";
                                            }, {
                                                readonly type: "boolean";
                                            }];
                                        };
                                        readonly encoding: {
                                            readonly type: "string";
                                        };
                                        readonly replacements: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "object";
                                                readonly properties: {
                                                    readonly target: {
                                                        readonly type: "string";
                                                    };
                                                    readonly value: {
                                                        readonly oneOf: readonly [{
                                                            readonly type: "string";
                                                        }, {
                                                            readonly type: "object";
                                                        }, {
                                                            readonly type: "array";
                                                        }, {
                                                            readonly type: "number";
                                                        }, {
                                                            readonly type: "boolean";
                                                        }];
                                                    };
                                                };
                                            };
                                        };
                                    };
                                    readonly additionalProperties: false;
                                    readonly required: readonly ["payload"];
                                };
                            };
                            readonly required: readonly ["stepId"];
                            readonly oneOf: readonly [{
                                readonly required: readonly ["x-operation"];
                            }, {
                                readonly required: readonly ["operationId"];
                            }, {
                                readonly required: readonly ["operationPath"];
                            }, {
                                readonly required: readonly ["workflowId"];
                            }];
                        };
                    };
                    readonly successActions: {
                        readonly type: "array";
                        readonly items: {
                            readonly oneOf: readonly [{
                                readonly type: "object";
                                readonly properties: {
                                    readonly name: {
                                        readonly type: "string";
                                    };
                                    readonly type: {
                                        readonly type: "string";
                                        readonly enum: readonly ["goto", "end"];
                                    };
                                    readonly stepId: {
                                        readonly type: "string";
                                    };
                                    readonly workflowId: {
                                        readonly type: "string";
                                    };
                                    readonly criteria: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly condition: {
                                                    readonly type: "string";
                                                };
                                                readonly context: {
                                                    readonly type: "string";
                                                };
                                                readonly type: {
                                                    readonly oneOf: readonly [{
                                                        readonly type: "string";
                                                        readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                                    }, {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly type: {
                                                                readonly type: "string";
                                                                readonly enum: readonly ["jsonpath"];
                                                            };
                                                            readonly version: {
                                                                readonly type: "string";
                                                                readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                                            };
                                                        };
                                                    }, {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly type: {
                                                                readonly type: "string";
                                                                readonly enum: readonly ["xpath"];
                                                            };
                                                            readonly version: {
                                                                readonly type: "string";
                                                                readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                                            };
                                                        };
                                                    }];
                                                };
                                            };
                                            readonly required: readonly ["condition"];
                                            readonly additionalProperties: false;
                                        };
                                    };
                                };
                                readonly additionalProperties: false;
                                readonly required: readonly ["type", "name"];
                            }, {
                                readonly type: "object";
                                readonly properties: {
                                    readonly reference: {
                                        readonly type: "string";
                                    };
                                    readonly value: {
                                        readonly oneOf: readonly [{
                                            readonly type: "string";
                                        }, {
                                            readonly type: "number";
                                        }, {
                                            readonly type: "boolean";
                                        }];
                                    };
                                };
                                readonly required: readonly ["reference"];
                                readonly additionalProperties: false;
                            }];
                        };
                    };
                    readonly failureActions: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly name: {
                                    readonly type: "string";
                                };
                                readonly type: {
                                    readonly type: "string";
                                    readonly enum: readonly ["goto", "retry", "end"];
                                };
                                readonly workflowId: {
                                    readonly type: "string";
                                };
                                readonly stepId: {
                                    readonly type: "string";
                                };
                                readonly retryAfter: {
                                    readonly type: "number";
                                };
                                readonly retryLimit: {
                                    readonly type: "number";
                                };
                                readonly criteria: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly condition: {
                                                readonly type: "string";
                                            };
                                            readonly context: {
                                                readonly type: "string";
                                            };
                                            readonly type: {
                                                readonly oneOf: readonly [{
                                                    readonly type: "string";
                                                    readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                                }, {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly type: {
                                                            readonly type: "string";
                                                            readonly enum: readonly ["jsonpath"];
                                                        };
                                                        readonly version: {
                                                            readonly type: "string";
                                                            readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                                        };
                                                    };
                                                }, {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly type: {
                                                            readonly type: "string";
                                                            readonly enum: readonly ["xpath"];
                                                        };
                                                        readonly version: {
                                                            readonly type: "string";
                                                            readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                                        };
                                                    };
                                                }];
                                            };
                                        };
                                        readonly required: readonly ["condition"];
                                        readonly additionalProperties: false;
                                    };
                                };
                            };
                            readonly additionalProperties: false;
                            readonly required: readonly ["type", "name"];
                        };
                    };
                };
                readonly additionalProperties: false;
                readonly required: readonly ["workflowId", "steps"];
            };
        };
        readonly components: {
            readonly type: "object";
            readonly properties: {
                readonly inputs: {
                    readonly type: "object";
                    readonly additionalProperties: {
                        readonly type: "object";
                        readonly additionalProperties: true;
                        readonly properties: {
                            readonly type: {
                                readonly type: "string";
                            };
                            readonly properties: {
                                readonly type: "object";
                                readonly additionalProperties: true;
                            };
                        };
                        readonly required: readonly ["type"];
                    };
                };
                readonly parameters: {
                    readonly type: "object";
                    readonly additionalProperties: {
                        readonly type: "object";
                        readonly oneOf: readonly [{
                            readonly type: "object";
                            readonly properties: {
                                readonly in: {
                                    readonly type: "string";
                                    readonly enum: readonly ["header", "query", "path", "cookie"];
                                };
                                readonly name: {
                                    readonly type: "string";
                                };
                                readonly value: {
                                    readonly oneOf: readonly [{
                                        readonly type: "string";
                                    }, {
                                        readonly type: "number";
                                    }, {
                                        readonly type: "boolean";
                                    }];
                                };
                            };
                            readonly required: readonly ["name", "value"];
                            readonly additionalProperties: false;
                        }, {
                            readonly type: "object";
                            readonly properties: {
                                readonly reference: {
                                    readonly type: "string";
                                };
                                readonly value: {
                                    readonly oneOf: readonly [{
                                        readonly type: "string";
                                    }, {
                                        readonly type: "number";
                                    }, {
                                        readonly type: "boolean";
                                    }];
                                };
                            };
                            readonly required: readonly ["reference"];
                            readonly additionalProperties: false;
                        }];
                    };
                };
                readonly successActions: {
                    readonly type: "object";
                    readonly additionalProperties: {
                        readonly type: "object";
                        readonly properties: {
                            readonly name: {
                                readonly type: "string";
                            };
                            readonly type: {
                                readonly type: "string";
                                readonly enum: readonly ["goto", "end"];
                            };
                            readonly stepId: {
                                readonly type: "string";
                            };
                            readonly workflowId: {
                                readonly type: "string";
                            };
                            readonly criteria: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly condition: {
                                            readonly type: "string";
                                        };
                                        readonly context: {
                                            readonly type: "string";
                                        };
                                        readonly type: {
                                            readonly oneOf: readonly [{
                                                readonly type: "string";
                                                readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                            }, {
                                                readonly type: "object";
                                                readonly properties: {
                                                    readonly type: {
                                                        readonly type: "string";
                                                        readonly enum: readonly ["jsonpath"];
                                                    };
                                                    readonly version: {
                                                        readonly type: "string";
                                                        readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                                    };
                                                };
                                            }, {
                                                readonly type: "object";
                                                readonly properties: {
                                                    readonly type: {
                                                        readonly type: "string";
                                                        readonly enum: readonly ["xpath"];
                                                    };
                                                    readonly version: {
                                                        readonly type: "string";
                                                        readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                                    };
                                                };
                                            }];
                                        };
                                    };
                                    readonly required: readonly ["condition"];
                                    readonly additionalProperties: false;
                                };
                            };
                        };
                        readonly additionalProperties: false;
                        readonly required: readonly ["type", "name"];
                    };
                };
                readonly failureActions: {
                    readonly type: "object";
                    readonly additionalProperties: {
                        readonly type: "object";
                        readonly properties: {
                            readonly name: {
                                readonly type: "string";
                            };
                            readonly type: {
                                readonly type: "string";
                                readonly enum: readonly ["goto", "retry", "end"];
                            };
                            readonly workflowId: {
                                readonly type: "string";
                            };
                            readonly stepId: {
                                readonly type: "string";
                            };
                            readonly retryAfter: {
                                readonly type: "number";
                            };
                            readonly retryLimit: {
                                readonly type: "number";
                            };
                            readonly criteria: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly condition: {
                                            readonly type: "string";
                                        };
                                        readonly context: {
                                            readonly type: "string";
                                        };
                                        readonly type: {
                                            readonly oneOf: readonly [{
                                                readonly type: "string";
                                                readonly enum: readonly ["regex", "jsonpath", "simple", "xpath"];
                                            }, {
                                                readonly type: "object";
                                                readonly properties: {
                                                    readonly type: {
                                                        readonly type: "string";
                                                        readonly enum: readonly ["jsonpath"];
                                                    };
                                                    readonly version: {
                                                        readonly type: "string";
                                                        readonly enum: readonly ["draft-goessner-dispatch-jsonpath-00"];
                                                    };
                                                };
                                            }, {
                                                readonly type: "object";
                                                readonly properties: {
                                                    readonly type: {
                                                        readonly type: "string";
                                                        readonly enum: readonly ["xpath"];
                                                    };
                                                    readonly version: {
                                                        readonly type: "string";
                                                        readonly enum: readonly ["xpath-30", "xpath-20", "xpath-10"];
                                                    };
                                                };
                                            }];
                                        };
                                    };
                                    readonly required: readonly ["condition"];
                                    readonly additionalProperties: false;
                                };
                            };
                        };
                        readonly additionalProperties: false;
                        readonly required: readonly ["type", "name"];
                    };
                };
            };
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["arazzo", "info", "sourceDescriptions", "workflows"];
};
//# sourceMappingURL=arazzo-schema.d.ts.map