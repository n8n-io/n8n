export declare const graphqlConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly hidePaginationButtons: {
            readonly type: "boolean";
        };
        readonly menu: {
            readonly type: "object";
            readonly properties: {
                readonly requireExactGroups: {
                    readonly type: "boolean";
                };
                readonly groups: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly name: {
                                readonly type: "string";
                            };
                            readonly items: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly includeByName: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly excludeByName: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly additionalProperties: false;
                            };
                            readonly queries: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly includeByName: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly excludeByName: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly additionalProperties: false;
                            };
                            readonly mutations: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly includeByName: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly excludeByName: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly additionalProperties: false;
                            };
                            readonly subscriptions: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly includeByName: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly excludeByName: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly additionalProperties: false;
                            };
                            readonly types: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly includeByName: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly excludeByName: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly additionalProperties: false;
                            };
                            readonly directives: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly includeByName: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly excludeByName: {
                                        readonly type: "array";
                                        readonly items: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly additionalProperties: false;
                            };
                        };
                        readonly required: readonly ["name"];
                        readonly additionalProperties: false;
                    };
                };
                readonly otherItemsGroupName: {
                    readonly type: "string";
                };
            };
            readonly additionalProperties: false;
        };
        readonly sidebar: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                };
            };
        };
        readonly apiLogo: {
            readonly type: "object";
            readonly properties: {
                readonly imageUrl: {
                    readonly type: "string";
                };
                readonly href: {
                    readonly type: "string";
                };
                readonly altText: {
                    readonly type: "string";
                };
                readonly backgroundColor: {
                    readonly type: "string";
                };
            };
        };
        readonly jsonSamplesDepth: {
            readonly type: "number";
        };
        readonly samplesMaxInlineArgs: {
            readonly type: "number";
        };
        readonly licenseKey: {
            readonly type: "string";
        };
        readonly fieldExpandLevel: {
            readonly type: "number";
        };
        readonly baseUrlPath: {
            readonly type: "string";
        };
        readonly feedback: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                    readonly default: false;
                };
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["rating", "sentiment", "comment", "reasons", "mood", "scale"];
                    readonly default: "sentiment";
                };
                readonly settings: {
                    readonly type: "object";
                    readonly properties: {
                        readonly label: {
                            readonly type: "string";
                        };
                        readonly submitText: {
                            readonly type: "string";
                        };
                        readonly buttonText: {
                            readonly type: "string";
                        };
                        readonly component: {
                            readonly type: "string";
                            readonly enum: readonly ["radio", "checkbox"];
                            readonly default: "checkbox";
                        };
                        readonly items: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                            readonly minItems: 1;
                        };
                        readonly leftScaleLabel: {
                            readonly type: "string";
                        };
                        readonly rightScaleLabel: {
                            readonly type: "string";
                        };
                        readonly reasons: {
                            readonly type: "object";
                            readonly properties: {
                                readonly like: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly hide: {
                                            readonly type: "boolean";
                                            readonly default: false;
                                        };
                                        readonly component: {
                                            readonly type: "string";
                                            readonly enum: readonly ["radio", "checkbox"];
                                            readonly default: "checkbox";
                                        };
                                        readonly label: {
                                            readonly type: "string";
                                        };
                                        readonly items: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                    readonly additionalProperties: false;
                                };
                                readonly dislike: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly hide: {
                                            readonly type: "boolean";
                                            readonly default: false;
                                        };
                                        readonly component: {
                                            readonly type: "string";
                                            readonly enum: readonly ["radio", "checkbox"];
                                            readonly default: "checkbox";
                                        };
                                        readonly label: {
                                            readonly type: "string";
                                        };
                                        readonly items: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                    readonly additionalProperties: false;
                                };
                                readonly satisfied: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly hide: {
                                            readonly type: "boolean";
                                            readonly default: false;
                                        };
                                        readonly component: {
                                            readonly type: "string";
                                            readonly enum: readonly ["radio", "checkbox"];
                                            readonly default: "checkbox";
                                        };
                                        readonly label: {
                                            readonly type: "string";
                                        };
                                        readonly items: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                    readonly additionalProperties: false;
                                };
                                readonly neutral: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly hide: {
                                            readonly type: "boolean";
                                            readonly default: false;
                                        };
                                        readonly component: {
                                            readonly type: "string";
                                            readonly enum: readonly ["radio", "checkbox"];
                                            readonly default: "checkbox";
                                        };
                                        readonly label: {
                                            readonly type: "string";
                                        };
                                        readonly items: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                    readonly additionalProperties: false;
                                };
                                readonly dissatisfied: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly hide: {
                                            readonly type: "boolean";
                                            readonly default: false;
                                        };
                                        readonly component: {
                                            readonly type: "string";
                                            readonly enum: readonly ["radio", "checkbox"];
                                            readonly default: "checkbox";
                                        };
                                        readonly label: {
                                            readonly type: "string";
                                        };
                                        readonly items: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "string";
                                            };
                                        };
                                    };
                                    readonly additionalProperties: false;
                                };
                                readonly hide: {
                                    readonly type: "boolean";
                                    readonly default: false;
                                };
                                readonly component: {
                                    readonly type: "string";
                                    readonly enum: readonly ["radio", "checkbox"];
                                    readonly default: "checkbox";
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly items: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                };
                            };
                            readonly additionalProperties: false;
                        };
                        readonly comment: {
                            readonly type: "object";
                            readonly properties: {
                                readonly hide: {
                                    readonly type: "boolean";
                                    readonly default: false;
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly likeLabel: {
                                    readonly type: "string";
                                };
                                readonly dislikeLabel: {
                                    readonly type: "string";
                                };
                                readonly satisfiedLabel: {
                                    readonly type: "string";
                                };
                                readonly neutralLabel: {
                                    readonly type: "string";
                                };
                                readonly dissatisfiedLabel: {
                                    readonly type: "string";
                                };
                            };
                            readonly additionalProperties: false;
                        };
                        readonly optionalEmail: {
                            readonly type: "object";
                            readonly properties: {
                                readonly hide: {
                                    readonly type: "boolean";
                                    readonly default: false;
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly placeholder: {
                                    readonly type: "string";
                                };
                            };
                            readonly additionalProperties: false;
                        };
                    };
                    readonly additionalProperties: false;
                };
            };
            readonly additionalProperties: false;
        };
    };
    readonly additionalProperties: false;
};
