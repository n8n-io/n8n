export declare const reuniteConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly ignoreLint: {
            readonly oneOf: readonly [{
                readonly type: "boolean";
                readonly default: false;
            }, {
                readonly type: "object";
                readonly additionalProperties: {
                    readonly type: "boolean";
                };
            }];
        };
        readonly ignoreLinkChecker: {
            readonly type: "boolean";
        };
        readonly ignoreMarkdocErrors: {
            readonly type: "boolean";
        };
        readonly jobs: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly path: {
                        readonly type: "string";
                        readonly pattern: "^(?!\\.\\./)(/[a-zA-Z0-9_\\-\\./]+|./[a-zA-Z0-9_\\-\\./]+|[a-zA-Z0-9_\\-\\./]+)$";
                    };
                    readonly agent: {
                        readonly type: "string";
                        readonly enum: readonly ["respect"];
                    };
                    readonly trigger: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly event: {
                                readonly type: "string";
                                readonly enum: readonly ["schedule"];
                            };
                            readonly interval: {
                                readonly type: "string";
                                readonly pattern: "^[1-9]\\d*[mhdw]$";
                            };
                        };
                        readonly required: readonly ["event"];
                    };
                    readonly inputs: {
                        readonly type: "object";
                        readonly additionalProperties: {
                            readonly type: "string";
                        };
                    };
                    readonly servers: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly patternProperties: {
                            readonly '^[a-zA-Z0-9_-]+$': {
                                readonly type: "string";
                                readonly pattern: "^https?://[^\\s/$.?#].[^\\s]*$";
                            };
                        };
                    };
                    readonly severity: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly schemaCheck: {
                                readonly type: "string";
                                readonly enum: readonly ["error", "warn", "off"];
                            };
                            readonly statusCodeCheck: {
                                readonly type: "string";
                                readonly enum: readonly ["error", "warn", "off"];
                            };
                            readonly contentTypeCheck: {
                                readonly type: "string";
                                readonly enum: readonly ["error", "warn", "off"];
                            };
                            readonly successCriteriaCheck: {
                                readonly type: "string";
                                readonly enum: readonly ["error", "warn", "off"];
                            };
                        };
                    };
                };
                readonly required: readonly ["path", "trigger", "agent"];
                readonly additionalProperties: false;
            };
        };
    };
    readonly additionalProperties: false;
};
