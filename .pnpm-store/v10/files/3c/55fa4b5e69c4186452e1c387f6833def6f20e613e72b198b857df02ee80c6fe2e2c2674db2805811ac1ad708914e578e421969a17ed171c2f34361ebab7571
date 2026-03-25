export declare const navItemsSchema: {
    readonly type: "array";
    readonly items: {
        readonly properties: {
            readonly items: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly properties: {
                        readonly page: {
                            readonly type: "string";
                        };
                        readonly directory: {
                            readonly type: "string";
                        };
                        readonly disconnect: {
                            readonly type: "boolean";
                            readonly default: false;
                        };
                        readonly group: {
                            readonly type: "string";
                        };
                        readonly label: {
                            readonly type: "string";
                        };
                        readonly href: {
                            readonly type: "string";
                        };
                        readonly external: {
                            readonly type: "boolean";
                        };
                        readonly labelTranslationKey: {
                            readonly type: "string";
                        };
                        readonly groupTranslationKey: {
                            readonly type: "string";
                        };
                        readonly icon: {
                            readonly oneOf: readonly [{
                                readonly type: "string";
                            }, {
                                readonly type: "object";
                                readonly properties: {
                                    readonly srcSet: {
                                        readonly type: "string";
                                    };
                                };
                                readonly required: readonly ["srcSet"];
                            }];
                        };
                        readonly separator: {
                            readonly type: "string";
                        };
                        readonly separatorLine: {
                            readonly type: "boolean";
                        };
                        readonly linePosition: {
                            readonly type: "string";
                            readonly enum: readonly ["top", "bottom"];
                            readonly default: "top";
                        };
                        readonly version: {
                            readonly type: "string";
                        };
                        readonly menuStyle: {
                            readonly type: "string";
                            readonly enum: readonly ["drilldown"];
                        };
                        readonly expanded: {
                            readonly type: "string";
                            readonly const: "always";
                        };
                        readonly selectFirstItemOnExpand: {
                            readonly type: "boolean";
                        };
                        readonly flatten: {
                            readonly type: "boolean";
                        };
                        readonly linkedSidebars: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                        readonly items: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "object";
                                readonly additionalProperties: true;
                            };
                        };
                    };
                };
            };
            readonly page: {
                readonly type: "string";
            };
            readonly directory: {
                readonly type: "string";
            };
            readonly disconnect: {
                readonly type: "boolean";
                readonly default: false;
            };
            readonly group: {
                readonly type: "string";
            };
            readonly label: {
                readonly type: "string";
            };
            readonly href: {
                readonly type: "string";
            };
            readonly external: {
                readonly type: "boolean";
            };
            readonly labelTranslationKey: {
                readonly type: "string";
            };
            readonly groupTranslationKey: {
                readonly type: "string";
            };
            readonly icon: {
                readonly oneOf: readonly [{
                    readonly type: "string";
                }, {
                    readonly type: "object";
                    readonly properties: {
                        readonly srcSet: {
                            readonly type: "string";
                        };
                    };
                    readonly required: readonly ["srcSet"];
                }];
            };
            readonly separator: {
                readonly type: "string";
            };
            readonly separatorLine: {
                readonly type: "boolean";
            };
            readonly linePosition: {
                readonly type: "string";
                readonly enum: readonly ["top", "bottom"];
                readonly default: "top";
            };
            readonly version: {
                readonly type: "string";
            };
            readonly menuStyle: {
                readonly type: "string";
                readonly enum: readonly ["drilldown"];
            };
            readonly expanded: {
                readonly type: "string";
                readonly const: "always";
            };
            readonly selectFirstItemOnExpand: {
                readonly type: "boolean";
            };
            readonly flatten: {
                readonly type: "boolean";
            };
            readonly linkedSidebars: {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
            };
        };
        readonly type: "object";
    };
};
export declare const productConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly name: {
            readonly type: "string";
        };
        readonly icon: {
            readonly type: "string";
        };
        readonly folder: {
            readonly type: "string";
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["name", "folder"];
};
export declare const aiSearchConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly hide: {
            readonly type: "boolean";
            readonly default: false;
        };
        readonly prompt: {
            readonly type: "string";
        };
    };
    readonly additionalProperties: false;
};
export declare const searchFacetsConfigSchema: {
    readonly type: "array";
    readonly items: {
        readonly type: "object";
        readonly required: readonly ["name", "field", "type"];
        readonly properties: {
            readonly name: {
                readonly type: "string";
            };
            readonly field: {
                readonly type: "string";
            };
            readonly type: {
                readonly type: "string";
                readonly enum: readonly ["multi-select", "select", "tags"];
            };
        };
        readonly additionalProperties: false;
    };
};
export declare const searchFiltersConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly hide: {
            readonly type: "boolean";
        };
        readonly facets: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["name", "field", "type"];
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly field: {
                        readonly type: "string";
                    };
                    readonly type: {
                        readonly type: "string";
                        readonly enum: readonly ["multi-select", "select", "tags"];
                    };
                };
                readonly additionalProperties: false;
            };
        };
    };
    readonly additionalProperties: false;
};
export declare const logoConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly image: {
            readonly type: "string";
        };
        readonly srcSet: {
            readonly type: "string";
        };
        readonly altText: {
            readonly type: "string";
        };
        readonly link: {
            readonly type: "string";
        };
        readonly favicon: {
            readonly type: "string";
        };
    };
    readonly additionalProperties: false;
};
export declare const navbarConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly hide: {
            readonly type: "boolean";
        };
        readonly items: {
            readonly type: "array";
            readonly items: {
                readonly properties: {
                    readonly items: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "string";
                                };
                                readonly directory: {
                                    readonly type: "string";
                                };
                                readonly disconnect: {
                                    readonly type: "boolean";
                                    readonly default: false;
                                };
                                readonly group: {
                                    readonly type: "string";
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly href: {
                                    readonly type: "string";
                                };
                                readonly external: {
                                    readonly type: "boolean";
                                };
                                readonly labelTranslationKey: {
                                    readonly type: "string";
                                };
                                readonly groupTranslationKey: {
                                    readonly type: "string";
                                };
                                readonly icon: {
                                    readonly oneOf: readonly [{
                                        readonly type: "string";
                                    }, {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly srcSet: {
                                                readonly type: "string";
                                            };
                                        };
                                        readonly required: readonly ["srcSet"];
                                    }];
                                };
                                readonly separator: {
                                    readonly type: "string";
                                };
                                readonly separatorLine: {
                                    readonly type: "boolean";
                                };
                                readonly linePosition: {
                                    readonly type: "string";
                                    readonly enum: readonly ["top", "bottom"];
                                    readonly default: "top";
                                };
                                readonly version: {
                                    readonly type: "string";
                                };
                                readonly menuStyle: {
                                    readonly type: "string";
                                    readonly enum: readonly ["drilldown"];
                                };
                                readonly expanded: {
                                    readonly type: "string";
                                    readonly const: "always";
                                };
                                readonly selectFirstItemOnExpand: {
                                    readonly type: "boolean";
                                };
                                readonly flatten: {
                                    readonly type: "boolean";
                                };
                                readonly linkedSidebars: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                };
                                readonly items: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: true;
                                    };
                                };
                            };
                        };
                    };
                    readonly page: {
                        readonly type: "string";
                    };
                    readonly directory: {
                        readonly type: "string";
                    };
                    readonly disconnect: {
                        readonly type: "boolean";
                        readonly default: false;
                    };
                    readonly group: {
                        readonly type: "string";
                    };
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly href: {
                        readonly type: "string";
                    };
                    readonly external: {
                        readonly type: "boolean";
                    };
                    readonly labelTranslationKey: {
                        readonly type: "string";
                    };
                    readonly groupTranslationKey: {
                        readonly type: "string";
                    };
                    readonly icon: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                        }, {
                            readonly type: "object";
                            readonly properties: {
                                readonly srcSet: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["srcSet"];
                        }];
                    };
                    readonly separator: {
                        readonly type: "string";
                    };
                    readonly separatorLine: {
                        readonly type: "boolean";
                    };
                    readonly linePosition: {
                        readonly type: "string";
                        readonly enum: readonly ["top", "bottom"];
                        readonly default: "top";
                    };
                    readonly version: {
                        readonly type: "string";
                    };
                    readonly menuStyle: {
                        readonly type: "string";
                        readonly enum: readonly ["drilldown"];
                    };
                    readonly expanded: {
                        readonly type: "string";
                        readonly const: "always";
                    };
                    readonly selectFirstItemOnExpand: {
                        readonly type: "boolean";
                    };
                    readonly flatten: {
                        readonly type: "boolean";
                    };
                    readonly linkedSidebars: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
                readonly type: "object";
            };
        };
    };
    readonly additionalProperties: false;
};
export declare const productsConfigSchema: {
    readonly type: "object";
    readonly additionalProperties: {
        readonly type: "object";
        readonly properties: {
            readonly name: {
                readonly type: "string";
            };
            readonly icon: {
                readonly type: "string";
            };
            readonly folder: {
                readonly type: "string";
            };
        };
        readonly additionalProperties: false;
        readonly required: readonly ["name", "folder"];
    };
};
export declare const footerConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly hide: {
            readonly type: "boolean";
        };
        readonly items: {
            readonly type: "array";
            readonly items: {
                readonly properties: {
                    readonly items: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "string";
                                };
                                readonly directory: {
                                    readonly type: "string";
                                };
                                readonly disconnect: {
                                    readonly type: "boolean";
                                    readonly default: false;
                                };
                                readonly group: {
                                    readonly type: "string";
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly href: {
                                    readonly type: "string";
                                };
                                readonly external: {
                                    readonly type: "boolean";
                                };
                                readonly labelTranslationKey: {
                                    readonly type: "string";
                                };
                                readonly groupTranslationKey: {
                                    readonly type: "string";
                                };
                                readonly icon: {
                                    readonly oneOf: readonly [{
                                        readonly type: "string";
                                    }, {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly srcSet: {
                                                readonly type: "string";
                                            };
                                        };
                                        readonly required: readonly ["srcSet"];
                                    }];
                                };
                                readonly separator: {
                                    readonly type: "string";
                                };
                                readonly separatorLine: {
                                    readonly type: "boolean";
                                };
                                readonly linePosition: {
                                    readonly type: "string";
                                    readonly enum: readonly ["top", "bottom"];
                                    readonly default: "top";
                                };
                                readonly version: {
                                    readonly type: "string";
                                };
                                readonly menuStyle: {
                                    readonly type: "string";
                                    readonly enum: readonly ["drilldown"];
                                };
                                readonly expanded: {
                                    readonly type: "string";
                                    readonly const: "always";
                                };
                                readonly selectFirstItemOnExpand: {
                                    readonly type: "boolean";
                                };
                                readonly flatten: {
                                    readonly type: "boolean";
                                };
                                readonly linkedSidebars: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                };
                                readonly items: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: true;
                                    };
                                };
                            };
                        };
                    };
                    readonly page: {
                        readonly type: "string";
                    };
                    readonly directory: {
                        readonly type: "string";
                    };
                    readonly disconnect: {
                        readonly type: "boolean";
                        readonly default: false;
                    };
                    readonly group: {
                        readonly type: "string";
                    };
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly href: {
                        readonly type: "string";
                    };
                    readonly external: {
                        readonly type: "boolean";
                    };
                    readonly labelTranslationKey: {
                        readonly type: "string";
                    };
                    readonly groupTranslationKey: {
                        readonly type: "string";
                    };
                    readonly icon: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                        }, {
                            readonly type: "object";
                            readonly properties: {
                                readonly srcSet: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["srcSet"];
                        }];
                    };
                    readonly separator: {
                        readonly type: "string";
                    };
                    readonly separatorLine: {
                        readonly type: "boolean";
                    };
                    readonly linePosition: {
                        readonly type: "string";
                        readonly enum: readonly ["top", "bottom"];
                        readonly default: "top";
                    };
                    readonly version: {
                        readonly type: "string";
                    };
                    readonly menuStyle: {
                        readonly type: "string";
                        readonly enum: readonly ["drilldown"];
                    };
                    readonly expanded: {
                        readonly type: "string";
                        readonly const: "always";
                    };
                    readonly selectFirstItemOnExpand: {
                        readonly type: "boolean";
                    };
                    readonly flatten: {
                        readonly type: "boolean";
                    };
                    readonly linkedSidebars: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
                readonly type: "object";
            };
        };
        readonly copyrightText: {
            readonly type: "string";
        };
        readonly logo: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                };
            };
            readonly additionalProperties: false;
        };
    };
    readonly additionalProperties: false;
};
export declare const sidebarConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly hide: {
            readonly type: "boolean";
        };
        readonly separatorLine: {
            readonly type: "boolean";
        };
        readonly linePosition: {
            readonly type: "string";
            readonly enum: readonly ["top", "bottom"];
            readonly default: "bottom";
        };
    };
    readonly additionalProperties: false;
};
export declare const scriptsConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly head: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly src: {
                        readonly type: "string";
                    };
                    readonly async: {
                        readonly type: "boolean";
                    };
                    readonly crossorigin: {
                        readonly type: "string";
                    };
                    readonly defer: {
                        readonly type: "boolean";
                    };
                    readonly fetchpriority: {
                        readonly type: "string";
                    };
                    readonly integrity: {
                        readonly type: "string";
                    };
                    readonly module: {
                        readonly type: "boolean";
                    };
                    readonly nomodule: {
                        readonly type: "boolean";
                    };
                    readonly nonce: {
                        readonly type: "string";
                    };
                    readonly referrerpolicy: {
                        readonly type: "string";
                    };
                    readonly type: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["src"];
                readonly additionalProperties: true;
            };
        };
        readonly body: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly src: {
                        readonly type: "string";
                    };
                    readonly async: {
                        readonly type: "boolean";
                    };
                    readonly crossorigin: {
                        readonly type: "string";
                    };
                    readonly defer: {
                        readonly type: "boolean";
                    };
                    readonly fetchpriority: {
                        readonly type: "string";
                    };
                    readonly integrity: {
                        readonly type: "string";
                    };
                    readonly module: {
                        readonly type: "boolean";
                    };
                    readonly nomodule: {
                        readonly type: "boolean";
                    };
                    readonly nonce: {
                        readonly type: "string";
                    };
                    readonly referrerpolicy: {
                        readonly type: "string";
                    };
                    readonly type: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["src"];
                readonly additionalProperties: true;
            };
        };
    };
    readonly additionalProperties: false;
};
export declare const linksConfigSchema: {
    readonly type: "array";
    readonly items: {
        readonly type: "object";
        readonly properties: {
            readonly href: {
                readonly type: "string";
            };
            readonly as: {
                readonly type: "string";
            };
            readonly crossorigin: {
                readonly type: "string";
            };
            readonly fetchpriority: {
                readonly type: "string";
            };
            readonly hreflang: {
                readonly type: "string";
            };
            readonly imagesizes: {
                readonly type: "string";
            };
            readonly imagesrcset: {
                readonly type: "string";
            };
            readonly integrity: {
                readonly type: "string";
            };
            readonly media: {
                readonly type: "string";
            };
            readonly prefetch: {
                readonly type: "string";
            };
            readonly referrerpolicy: {
                readonly type: "string";
            };
            readonly rel: {
                readonly type: "string";
            };
            readonly sizes: {
                readonly type: "string";
            };
            readonly title: {
                readonly type: "string";
            };
            readonly type: {
                readonly type: "string";
            };
        };
        readonly required: readonly ["href"];
        readonly additionalProperties: true;
    };
};
export declare const searchConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly hide: {
            readonly type: "boolean";
        };
        readonly engine: {
            readonly type: "string";
            readonly enum: readonly ["flexsearch", "typesense"];
            readonly default: "flexsearch";
        };
        readonly ai: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                    readonly default: false;
                };
                readonly prompt: {
                    readonly type: "string";
                };
            };
            readonly additionalProperties: false;
        };
        readonly filters: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                };
                readonly facets: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly required: readonly ["name", "field", "type"];
                        readonly properties: {
                            readonly name: {
                                readonly type: "string";
                            };
                            readonly field: {
                                readonly type: "string";
                            };
                            readonly type: {
                                readonly type: "string";
                                readonly enum: readonly ["multi-select", "select", "tags"];
                            };
                        };
                        readonly additionalProperties: false;
                    };
                };
            };
            readonly additionalProperties: false;
        };
        readonly placement: {
            readonly type: "string";
            readonly default: "navbar";
        };
        readonly shortcuts: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
            readonly default: readonly ["/"];
        };
        readonly suggestedPages: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly page: {
                        readonly type: "string";
                    };
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly labelTranslationKey: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["page"];
            };
        };
    };
    readonly additionalProperties: false;
};
export declare const colorModeConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly hide: {
            readonly type: "boolean";
        };
        readonly ignoreDetection: {
            readonly type: "boolean";
        };
        readonly modes: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
            readonly default: readonly ["light", "dark"];
        };
    };
    readonly additionalProperties: false;
};
export declare const navigationConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly nextButton: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                };
                readonly text: {
                    readonly type: "string";
                    readonly default: "Next page";
                };
            };
            readonly additionalProperties: false;
            readonly default: {};
        };
        readonly previousButton: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                };
                readonly text: {
                    readonly type: "string";
                    readonly default: "Previous page";
                };
            };
            readonly additionalProperties: false;
            readonly default: {};
        };
    };
    readonly additionalProperties: false;
};
export declare const codeSnippetConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly elementFormat: {
            readonly type: "string";
            readonly default: "icon";
        };
        readonly copy: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                };
            };
            readonly additionalProperties: false;
            readonly default: {
                readonly hide: false;
            };
        };
        readonly report: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                };
                readonly tooltipText: {
                    readonly type: "string";
                };
                readonly buttonText: {
                    readonly type: "string";
                };
                readonly label: {
                    readonly type: "string";
                };
            };
            readonly additionalProperties: false;
            readonly default: {
                readonly hide: false;
            };
        };
        readonly expand: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                };
            };
            readonly additionalProperties: false;
            readonly default: {
                readonly hide: false;
            };
        };
        readonly collapse: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                };
            };
            readonly additionalProperties: false;
            readonly default: {
                readonly hide: false;
            };
        };
    };
    readonly additionalProperties: false;
};
export declare const markdownConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly frontMatterKeysToResolve: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
            readonly default: readonly ["image", "links"];
        };
        readonly partialsFolders: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
            readonly default: readonly ["_partials"];
        };
        readonly lastUpdatedBlock: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                };
                readonly format: {
                    readonly type: "string";
                    readonly enum: readonly ["timeago", "iso", "long", "short"];
                    readonly default: "timeago";
                };
                readonly locale: {
                    readonly type: "string";
                };
            };
            readonly additionalProperties: false;
            readonly default: {};
        };
        readonly toc: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                };
                readonly header: {
                    readonly type: "string";
                    readonly default: "On this page";
                };
                readonly depth: {
                    readonly type: "integer";
                    readonly default: 3;
                    readonly minimum: 1;
                };
            };
            readonly additionalProperties: false;
            readonly default: {};
        };
        readonly editPage: {
            readonly type: "object";
            readonly properties: {
                readonly hide: {
                    readonly type: "boolean";
                };
                readonly baseUrl: {
                    readonly type: "string";
                };
            };
            readonly additionalProperties: false;
            readonly default: {};
        };
    };
    readonly additionalProperties: false;
    readonly default: {};
};
export declare const openapiConfigSchema: {
    readonly properties: {
        readonly theme: {
            readonly type: "object";
            readonly properties: {
                readonly breakpoints: {
                    readonly type: "object";
                    readonly properties: {
                        readonly small: {
                            readonly type: "string";
                        };
                        readonly medium: {
                            readonly type: "string";
                        };
                        readonly large: {
                            readonly type: "string";
                        };
                    };
                };
                readonly codeBlock: {
                    readonly type: "object";
                    readonly properties: {
                        readonly backgroundColor: {
                            readonly type: "string";
                        };
                        readonly borderRadius: {
                            readonly type: "string";
                        };
                        readonly tokens: {
                            readonly type: "object";
                            readonly properties: {
                                readonly fontFamily: {
                                    readonly type: "string";
                                };
                                readonly fontSize: {
                                    readonly type: "string";
                                };
                                readonly fontWeight: {
                                    readonly type: "string";
                                };
                                readonly lineHeight: {
                                    readonly type: "string";
                                };
                                readonly color: {
                                    readonly type: "string";
                                };
                            };
                        };
                    };
                };
                readonly colors: {
                    readonly type: "object";
                    readonly properties: {
                        readonly accent: {
                            readonly type: "object";
                            readonly properties: {
                                readonly main: {
                                    readonly type: "string";
                                };
                                readonly light: {
                                    readonly type: "string";
                                };
                                readonly dark: {
                                    readonly type: "string";
                                };
                                readonly contrastText: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly border: {
                            readonly type: "object";
                            readonly properties: {
                                readonly main: {
                                    readonly type: "string";
                                };
                                readonly light: {
                                    readonly type: "string";
                                };
                                readonly dark: {
                                    readonly type: "string";
                                };
                                readonly contrastText: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly error: {
                            readonly type: "object";
                            readonly properties: {
                                readonly main: {
                                    readonly type: "string";
                                };
                                readonly light: {
                                    readonly type: "string";
                                };
                                readonly dark: {
                                    readonly type: "string";
                                };
                                readonly contrastText: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly http: {
                            readonly type: "object";
                            readonly properties: {
                                readonly basic: {
                                    readonly type: "string";
                                };
                                readonly delete: {
                                    readonly type: "string";
                                };
                                readonly get: {
                                    readonly type: "string";
                                };
                                readonly head: {
                                    readonly type: "string";
                                };
                                readonly link: {
                                    readonly type: "string";
                                };
                                readonly options: {
                                    readonly type: "string";
                                };
                                readonly patch: {
                                    readonly type: "string";
                                };
                                readonly post: {
                                    readonly type: "string";
                                };
                                readonly put: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly primary: {
                            readonly type: "object";
                            readonly properties: {
                                readonly main: {
                                    readonly type: "string";
                                };
                                readonly light: {
                                    readonly type: "string";
                                };
                                readonly dark: {
                                    readonly type: "string";
                                };
                                readonly contrastText: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly responses: {
                            readonly type: "object";
                            readonly properties: {
                                readonly error: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly backgroundColor: {
                                            readonly type: "string";
                                        };
                                        readonly borderColor: {
                                            readonly type: "string";
                                        };
                                        readonly color: {
                                            readonly type: "string";
                                        };
                                        readonly tabTextColor: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly info: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly backgroundColor: {
                                            readonly type: "string";
                                        };
                                        readonly borderColor: {
                                            readonly type: "string";
                                        };
                                        readonly color: {
                                            readonly type: "string";
                                        };
                                        readonly tabTextColor: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly redirect: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly backgroundColor: {
                                            readonly type: "string";
                                        };
                                        readonly borderColor: {
                                            readonly type: "string";
                                        };
                                        readonly color: {
                                            readonly type: "string";
                                        };
                                        readonly tabTextColor: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly success: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly backgroundColor: {
                                            readonly type: "string";
                                        };
                                        readonly borderColor: {
                                            readonly type: "string";
                                        };
                                        readonly color: {
                                            readonly type: "string";
                                        };
                                        readonly tabTextColor: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                            };
                        };
                        readonly secondary: {
                            readonly type: "object";
                            readonly properties: {
                                readonly main: {
                                    readonly type: "string";
                                };
                                readonly light: {
                                    readonly type: "string";
                                };
                                readonly dark: {
                                    readonly type: "string";
                                };
                                readonly contrastText: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly success: {
                            readonly type: "object";
                            readonly properties: {
                                readonly main: {
                                    readonly type: "string";
                                };
                                readonly light: {
                                    readonly type: "string";
                                };
                                readonly dark: {
                                    readonly type: "string";
                                };
                                readonly contrastText: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly text: {
                            readonly type: "object";
                            readonly properties: {
                                readonly primary: {
                                    readonly type: "string";
                                };
                                readonly secondary: {
                                    readonly type: "string";
                                };
                                readonly light: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly tonalOffset: {
                            readonly type: "number";
                        };
                        readonly warning: {
                            readonly type: "object";
                            readonly properties: {
                                readonly main: {
                                    readonly type: "string";
                                };
                                readonly light: {
                                    readonly type: "string";
                                };
                                readonly dark: {
                                    readonly type: "string";
                                };
                                readonly contrastText: {
                                    readonly type: "string";
                                };
                            };
                        };
                    };
                };
                readonly components: {
                    readonly type: "object";
                    readonly properties: {
                        readonly buttons: {
                            readonly type: "object";
                            readonly properties: {
                                readonly borderRadius: {
                                    readonly type: "string";
                                };
                                readonly hoverStyle: {
                                    readonly type: "string";
                                };
                                readonly boxShadow: {
                                    readonly type: "string";
                                };
                                readonly hoverBoxShadow: {
                                    readonly type: "string";
                                };
                                readonly sizes: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly small: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly fontSize: {
                                                    readonly type: "string";
                                                };
                                                readonly padding: {
                                                    readonly type: "string";
                                                };
                                                readonly minWidth: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                        readonly medium: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly fontSize: {
                                                    readonly type: "string";
                                                };
                                                readonly padding: {
                                                    readonly type: "string";
                                                };
                                                readonly minWidth: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                        readonly large: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly fontSize: {
                                                    readonly type: "string";
                                                };
                                                readonly padding: {
                                                    readonly type: "string";
                                                };
                                                readonly minWidth: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                        readonly xlarge: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly fontSize: {
                                                    readonly type: "string";
                                                };
                                                readonly padding: {
                                                    readonly type: "string";
                                                };
                                                readonly minWidth: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                                readonly fontFamily: {
                                    readonly type: "string";
                                };
                                readonly fontSize: {
                                    readonly type: "string";
                                };
                                readonly fontWeight: {
                                    readonly type: "string";
                                };
                                readonly lineHeight: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly httpBadges: {
                            readonly type: "object";
                            readonly properties: {
                                readonly borderRadius: {
                                    readonly type: "string";
                                };
                                readonly color: {
                                    readonly type: "string";
                                };
                                readonly sizes: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly medium: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly fontFamily: {
                                                    readonly type: "string";
                                                };
                                                readonly fontSize: {
                                                    readonly type: "string";
                                                };
                                                readonly fontWeight: {
                                                    readonly type: "string";
                                                };
                                                readonly lineHeight: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                        readonly small: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly fontFamily: {
                                                    readonly type: "string";
                                                };
                                                readonly fontSize: {
                                                    readonly type: "string";
                                                };
                                                readonly fontWeight: {
                                                    readonly type: "string";
                                                };
                                                readonly lineHeight: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                                readonly fontFamily: {
                                    readonly type: "string";
                                };
                                readonly fontSize: {
                                    readonly type: "string";
                                };
                                readonly fontWeight: {
                                    readonly type: "string";
                                };
                                readonly lineHeight: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly layoutControls: {
                            readonly type: "object";
                            readonly properties: {
                                readonly top: {
                                    readonly type: "string";
                                };
                                readonly width: {
                                    readonly type: "string";
                                };
                                readonly height: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly panels: {
                            readonly type: "object";
                            readonly properties: {
                                readonly borderRadius: {
                                    readonly type: "string";
                                };
                                readonly backgroundColor: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly tryItButton: {
                            readonly type: "object";
                            readonly properties: {
                                readonly fullWidth: {
                                    readonly type: "boolean";
                                };
                            };
                        };
                        readonly tryItSendButton: {
                            readonly type: "object";
                            readonly properties: {
                                readonly fullWidth: {
                                    readonly type: "boolean";
                                };
                            };
                        };
                    };
                };
                readonly layout: {
                    readonly type: "object";
                    readonly properties: {
                        readonly showDarkRightPanel: {
                            readonly type: "boolean";
                        };
                        readonly stacked: {
                            readonly type: "object";
                            readonly properties: {
                                readonly maxWidth: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly small: {
                                            readonly type: "string";
                                        };
                                        readonly medium: {
                                            readonly type: "string";
                                        };
                                        readonly large: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                            };
                        };
                        readonly 'three-panel': {
                            readonly type: "object";
                            readonly properties: {
                                readonly maxWidth: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly small: {
                                            readonly type: "string";
                                        };
                                        readonly medium: {
                                            readonly type: "string";
                                        };
                                        readonly large: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                                readonly middlePanelMaxWidth: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly small: {
                                            readonly type: "string";
                                        };
                                        readonly medium: {
                                            readonly type: "string";
                                        };
                                        readonly large: {
                                            readonly type: "string";
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
                readonly logo: {
                    readonly type: "object";
                    readonly properties: {
                        readonly gutter: {
                            readonly type: "string";
                        };
                        readonly maxHeight: {
                            readonly type: "string";
                        };
                        readonly maxWidth: {
                            readonly type: "string";
                        };
                    };
                };
                readonly fab: {
                    readonly type: "object";
                    readonly properties: {
                        readonly backgroundColor: {
                            readonly type: "string";
                        };
                        readonly color: {
                            readonly type: "string";
                        };
                    };
                };
                readonly overrides: {
                    readonly type: "object";
                    readonly properties: {
                        readonly DownloadButton: {
                            readonly type: "object";
                            readonly properties: {
                                readonly custom: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly NextSectionButton: {
                            readonly type: "object";
                            readonly properties: {
                                readonly custom: {
                                    readonly type: "string";
                                };
                            };
                        };
                    };
                };
                readonly rightPanel: {
                    readonly type: "object";
                    readonly properties: {
                        readonly backgroundColor: {
                            readonly type: "string";
                        };
                        readonly panelBackgroundColor: {
                            readonly type: "string";
                        };
                        readonly panelControlsBackgroundColor: {
                            readonly type: "string";
                        };
                        readonly showAtBreakpoint: {
                            readonly type: "string";
                        };
                        readonly textColor: {
                            readonly type: "string";
                        };
                        readonly width: {
                            readonly type: "string";
                        };
                    };
                };
                readonly schema: {
                    readonly type: "object";
                    readonly properties: {
                        readonly breakFieldNames: {
                            readonly type: "boolean";
                        };
                        readonly caretColor: {
                            readonly type: "string";
                        };
                        readonly caretSize: {
                            readonly type: "string";
                        };
                        readonly constraints: {
                            readonly type: "object";
                            readonly properties: {
                                readonly backgroundColor: {
                                    readonly type: "string";
                                };
                                readonly border: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly defaultDetailsWidth: {
                            readonly type: "string";
                        };
                        readonly examples: {
                            readonly type: "object";
                            readonly properties: {
                                readonly backgroundColor: {
                                    readonly type: "string";
                                };
                                readonly border: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly labelsTextSize: {
                            readonly type: "string";
                        };
                        readonly linesColor: {
                            readonly type: "string";
                        };
                        readonly nestedBackground: {
                            readonly type: "string";
                        };
                        readonly nestingSpacing: {
                            readonly type: "string";
                        };
                        readonly requireLabelColor: {
                            readonly type: "string";
                        };
                        readonly typeNameColor: {
                            readonly type: "string";
                        };
                        readonly typeTitleColor: {
                            readonly type: "string";
                        };
                    };
                };
                readonly shape: {
                    readonly type: "object";
                    readonly properties: {
                        readonly borderRadius: {
                            readonly type: "string";
                        };
                    };
                };
                readonly sidebar: {
                    readonly type: "object";
                    readonly properties: {
                        readonly activeBgColor: {
                            readonly type: "string";
                        };
                        readonly activeTextColor: {
                            readonly type: "string";
                        };
                        readonly backgroundColor: {
                            readonly type: "string";
                        };
                        readonly borderRadius: {
                            readonly type: "string";
                        };
                        readonly breakPath: {
                            readonly type: "boolean";
                        };
                        readonly caretColor: {
                            readonly type: "string";
                        };
                        readonly caretSize: {
                            readonly type: "string";
                        };
                        readonly groupItems: {
                            readonly type: "object";
                            readonly properties: {
                                readonly subItemsColor: {
                                    readonly type: "string";
                                };
                                readonly textTransform: {
                                    readonly type: "string";
                                };
                                readonly fontWeight: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly level1items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly subItemsColor: {
                                    readonly type: "string";
                                };
                                readonly textTransform: {
                                    readonly type: "string";
                                };
                                readonly fontWeight: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly rightLineColor: {
                            readonly type: "string";
                        };
                        readonly separatorLabelColor: {
                            readonly type: "string";
                        };
                        readonly showAtBreakpoint: {
                            readonly type: "string";
                        };
                        readonly spacing: {
                            readonly type: "object";
                            readonly properties: {
                                readonly unit: {
                                    readonly type: "number";
                                };
                                readonly paddingHorizontal: {
                                    readonly type: "string";
                                };
                                readonly paddingVertical: {
                                    readonly type: "string";
                                };
                                readonly offsetTop: {
                                    readonly type: "string";
                                };
                                readonly offsetLeft: {
                                    readonly type: "string";
                                };
                                readonly offsetNesting: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly textColor: {
                            readonly type: "string";
                        };
                        readonly width: {
                            readonly type: "string";
                        };
                        readonly fontFamily: {
                            readonly type: "string";
                        };
                        readonly fontSize: {
                            readonly type: "string";
                        };
                        readonly fontWeight: {
                            readonly type: "string";
                        };
                        readonly lineHeight: {
                            readonly type: "string";
                        };
                    };
                };
                readonly spacing: {
                    readonly type: "object";
                    readonly properties: {
                        readonly sectionHorizontal: {
                            readonly type: "number";
                        };
                        readonly sectionVertical: {
                            readonly type: "number";
                        };
                        readonly unit: {
                            readonly type: "number";
                        };
                    };
                };
                readonly typography: {
                    readonly type: "object";
                    readonly properties: {
                        readonly fontWeightBold: {
                            readonly type: "string";
                        };
                        readonly fontWeightLight: {
                            readonly type: "string";
                        };
                        readonly fontWeightRegular: {
                            readonly type: "string";
                        };
                        readonly heading1: {
                            readonly type: "object";
                            readonly properties: {
                                readonly color: {
                                    readonly type: "string";
                                };
                                readonly transform: {
                                    readonly type: "string";
                                };
                                readonly fontFamily: {
                                    readonly type: "string";
                                };
                                readonly fontSize: {
                                    readonly type: "string";
                                };
                                readonly fontWeight: {
                                    readonly type: "string";
                                };
                                readonly lineHeight: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly heading2: {
                            readonly type: "object";
                            readonly properties: {
                                readonly color: {
                                    readonly type: "string";
                                };
                                readonly transform: {
                                    readonly type: "string";
                                };
                                readonly fontFamily: {
                                    readonly type: "string";
                                };
                                readonly fontSize: {
                                    readonly type: "string";
                                };
                                readonly fontWeight: {
                                    readonly type: "string";
                                };
                                readonly lineHeight: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly heading3: {
                            readonly type: "object";
                            readonly properties: {
                                readonly color: {
                                    readonly type: "string";
                                };
                                readonly transform: {
                                    readonly type: "string";
                                };
                                readonly fontFamily: {
                                    readonly type: "string";
                                };
                                readonly fontSize: {
                                    readonly type: "string";
                                };
                                readonly fontWeight: {
                                    readonly type: "string";
                                };
                                readonly lineHeight: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly headings: {
                            readonly type: "object";
                            readonly properties: {
                                readonly fontFamily: {
                                    readonly type: "string";
                                };
                                readonly fontSize: {
                                    readonly type: "string";
                                };
                                readonly fontWeight: {
                                    readonly type: "string";
                                };
                                readonly lineHeight: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly lineHeight: {
                            readonly type: "string";
                        };
                        readonly links: {
                            readonly type: "object";
                            readonly properties: {
                                readonly color: {
                                    readonly type: "string";
                                };
                                readonly hover: {
                                    readonly type: "string";
                                };
                                readonly textDecoration: {
                                    readonly type: "string";
                                };
                                readonly hoverTextDecoration: {
                                    readonly type: "string";
                                };
                                readonly visited: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly optimizeSpeed: {
                            readonly type: "boolean";
                        };
                        readonly rightPanelHeading: {
                            readonly type: "object";
                            readonly properties: {
                                readonly color: {
                                    readonly type: "string";
                                };
                                readonly transform: {
                                    readonly type: "string";
                                };
                                readonly fontFamily: {
                                    readonly type: "string";
                                };
                                readonly fontSize: {
                                    readonly type: "string";
                                };
                                readonly fontWeight: {
                                    readonly type: "string";
                                };
                                readonly lineHeight: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly smoothing: {
                            readonly type: "string";
                            readonly enum: readonly ["auto", "none", "antialiased", "subpixel-antialiased", "grayscale"];
                        };
                        readonly fontFamily: {
                            readonly type: "string";
                        };
                        readonly fontSize: {
                            readonly type: "string";
                        };
                        readonly fontWeight: {
                            readonly type: "string";
                        };
                        readonly code: {
                            readonly type: "object";
                            readonly properties: {
                                readonly backgroundColor: {
                                    readonly type: "string";
                                };
                                readonly color: {
                                    readonly type: "string";
                                };
                                readonly wordBreak: {
                                    readonly type: "string";
                                    readonly enum: readonly ["break-all", "break-word", "keep-all", "normal", "revert", "unset", "inherit", "initial"];
                                };
                                readonly wrap: {
                                    readonly type: "boolean";
                                };
                                readonly fontFamily: {
                                    readonly type: "string";
                                };
                                readonly fontSize: {
                                    readonly type: "string";
                                };
                                readonly fontWeight: {
                                    readonly type: "string";
                                };
                                readonly lineHeight: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly fieldName: {
                            readonly type: "object";
                            readonly properties: {
                                readonly fontFamily: {
                                    readonly type: "string";
                                };
                                readonly fontSize: {
                                    readonly type: "string";
                                };
                                readonly fontWeight: {
                                    readonly type: "string";
                                };
                                readonly lineHeight: {
                                    readonly type: "string";
                                };
                            };
                        };
                    };
                };
                readonly links: {
                    readonly properties: {
                        readonly color: {
                            readonly type: "string";
                        };
                    };
                };
                readonly codeSample: {
                    readonly properties: {
                        readonly backgroundColor: {
                            readonly type: "string";
                        };
                    };
                };
            };
        };
        readonly ctrlFHijack: {
            readonly type: "boolean";
        };
        readonly defaultSampleLanguage: {
            readonly type: "string";
        };
        readonly disableDeepLinks: {
            readonly type: "boolean";
        };
        readonly disableSearch: {
            readonly type: "boolean";
        };
        readonly disableSidebar: {
            readonly type: "boolean";
        };
        readonly downloadDefinitionUrl: {
            readonly type: "string";
        };
        readonly expandDefaultServerVariables: {
            readonly type: "boolean";
        };
        readonly enumSkipQuotes: {
            readonly type: "boolean";
        };
        readonly expandDefaultRequest: {
            readonly type: "boolean";
        };
        readonly expandDefaultResponse: {
            readonly type: "boolean";
        };
        readonly expandResponses: {
            readonly type: "string";
        };
        readonly expandSingleSchemaField: {
            readonly type: "boolean";
        };
        readonly generateCodeSamples: {
            readonly type: "object";
            readonly properties: {
                readonly skipOptionalParameters: {
                    readonly type: "boolean";
                };
                readonly languages: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly lang: {
                                readonly enum: readonly ["curl", "C#", "Go", "Java", "Java8+Apache", "JavaScript", "Node.js", "PHP", "Python", "R", "Ruby"];
                            };
                        };
                        readonly required: readonly ["lang"];
                    };
                };
            };
            readonly required: readonly ["languages"];
        };
        readonly generatedPayloadSamplesMaxDepth: {
            readonly type: "number";
        };
        readonly hideDownloadButton: {
            readonly type: "boolean";
        };
        readonly hideHostname: {
            readonly type: "boolean";
        };
        readonly hideInfoSection: {
            readonly type: "boolean";
        };
        readonly hideLogo: {
            readonly type: "boolean";
        };
        readonly hideRequestPayloadSample: {
            readonly type: "boolean";
        };
        readonly hideRightPanel: {
            readonly type: "boolean";
        };
        readonly hideSchemaPattern: {
            readonly type: "boolean";
        };
        readonly hideSingleRequestSampleTab: {
            readonly type: "boolean";
        };
        readonly hideSecuritySection: {
            readonly type: "boolean";
        };
        readonly hideTryItPanel: {
            readonly type: "boolean";
        };
        readonly hideFab: {
            readonly type: "boolean";
        };
        readonly hideOneOfDescription: {
            readonly type: "boolean";
        };
        readonly htmlTemplate: {
            readonly type: "string";
        };
        readonly jsonSampleExpandLevel: {
            readonly oneOf: readonly [{
                readonly type: "number";
                readonly minimum: 1;
            }, {
                readonly type: "string";
            }];
        };
        readonly labels: {
            readonly type: "object";
            readonly properties: {
                readonly enum: {
                    readonly type: "string";
                };
                readonly enumSingleValue: {
                    readonly type: "string";
                };
                readonly enumArray: {
                    readonly type: "string";
                };
                readonly default: {
                    readonly type: "string";
                };
                readonly deprecated: {
                    readonly type: "string";
                };
                readonly example: {
                    readonly type: "string";
                };
                readonly examples: {
                    readonly type: "string";
                };
                readonly nullable: {
                    readonly type: "string";
                };
                readonly recursive: {
                    readonly type: "string";
                };
                readonly arrayOf: {
                    readonly type: "string";
                };
                readonly webhook: {
                    readonly type: "string";
                };
                readonly authorizations: {
                    readonly type: "string";
                };
                readonly tryItAuthBasicUsername: {
                    readonly type: "string";
                };
                readonly tryItAuthBasicPassword: {
                    readonly type: "string";
                };
            };
        };
        readonly menuToggle: {
            readonly type: "boolean";
        };
        readonly nativeScrollbars: {
            readonly type: "boolean";
        };
        readonly noAutoAuth: {
            readonly type: "boolean";
        };
        readonly onDeepLinkClick: {
            readonly type: "object";
        };
        readonly pagination: {
            readonly enum: readonly ["none", "section", "item"];
        };
        readonly pathInMiddlePanel: {
            readonly type: "boolean";
        };
        readonly payloadSampleIdx: {
            readonly type: "number";
            readonly minimum: 0;
        };
        readonly requestInterceptor: {
            readonly type: "object";
        };
        readonly requiredPropsFirst: {
            readonly type: "boolean";
        };
        readonly routingStrategy: {
            readonly type: "string";
        };
        readonly samplesTabsMaxCount: {
            readonly type: "number";
        };
        readonly schemaExpansionLevel: {
            readonly oneOf: readonly [{
                readonly type: "number";
                readonly minimum: 0;
            }, {
                readonly type: "string";
            }];
        };
        readonly minCharacterLengthToInitSearch: {
            readonly type: "number";
            readonly minimum: 1;
        };
        readonly maxResponseHeadersToShowInTryIt: {
            readonly type: "number";
            readonly minimum: 0;
        };
        readonly scrollYOffset: {
            readonly oneOf: readonly [{
                readonly type: "number";
            }, {
                readonly type: "string";
            }];
        };
        readonly searchAutoExpand: {
            readonly type: "boolean";
        };
        readonly searchFieldLevelBoost: {
            readonly type: "number";
            readonly minimum: 0;
        };
        readonly searchMaxDepth: {
            readonly type: "number";
            readonly minimum: 1;
        };
        readonly searchMode: {
            readonly type: "string";
            readonly enum: readonly ["default", "path-only"];
        };
        readonly searchOperationTitleBoost: {
            readonly type: "number";
        };
        readonly searchTagTitleBoost: {
            readonly type: "number";
        };
        readonly sendXUserAgentInTryIt: {
            readonly type: "boolean";
        };
        readonly showChangeLayoutButton: {
            readonly type: "boolean";
        };
        readonly showConsole: {
            readonly type: "boolean";
        };
        readonly showNextButton: {
            readonly type: "boolean";
        };
        readonly showRightPanelToggle: {
            readonly type: "boolean";
        };
        readonly showSecuritySchemeType: {
            readonly type: "boolean";
        };
        readonly showWebhookVerb: {
            readonly type: "boolean";
        };
        readonly showObjectSchemaExamples: {
            readonly type: "boolean";
        };
        readonly disableTryItRequestUrlEncoding: {
            readonly type: "boolean";
        };
        readonly sidebarLinks: {
            readonly type: "object";
            readonly properties: {
                readonly beforeInfo: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly link: {
                                readonly type: "string";
                            };
                            readonly target: {
                                readonly type: "string";
                            };
                        };
                        readonly required: readonly ["label", "link"];
                    };
                };
                readonly end: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly link: {
                                readonly type: "string";
                            };
                            readonly target: {
                                readonly type: "string";
                            };
                        };
                        readonly required: readonly ["label", "link"];
                    };
                };
            };
        };
        readonly sideNavStyle: {
            readonly type: "string";
            readonly enum: readonly ["summary-only", "path-first", "id-only", "path-only"];
        };
        readonly simpleOneOfTypeLabel: {
            readonly type: "boolean";
        };
        readonly sortEnumValuesAlphabetically: {
            readonly type: "boolean";
        };
        readonly sortOperationsAlphabetically: {
            readonly type: "boolean";
        };
        readonly sortPropsAlphabetically: {
            readonly type: "boolean";
        };
        readonly sortTagsAlphabetically: {
            readonly type: "boolean";
        };
        readonly suppressWarnings: {
            readonly type: "boolean";
        };
        readonly unstable_externalDescription: {
            readonly type: "boolean";
        };
        readonly unstable_ignoreMimeParameters: {
            readonly type: "boolean";
        };
        readonly untrustedDefinition: {
            readonly type: "boolean";
        };
        readonly showAccessMode: {
            readonly type: "boolean";
        };
        readonly preserveOriginalExtensionsName: {
            readonly type: "boolean";
        };
        readonly markdownHeadingsAnchorLevel: {
            readonly type: "number";
        };
        readonly licenseKey: {
            readonly type: "string";
        };
        readonly hideLoading: {
            readonly type: "boolean";
        };
        readonly disableRouter: {
            readonly type: "boolean";
        };
        readonly hideSidebar: {
            readonly type: "boolean";
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
        readonly hideReplay: {
            readonly type: "boolean";
        };
        readonly oAuth2RedirectURI: {
            readonly type: "string";
            readonly nullable: true;
        };
        readonly corsProxyUrl: {
            readonly type: "string";
        };
        readonly sortRequiredPropsFirst: {
            readonly type: "boolean";
        };
        readonly sanitize: {
            readonly type: "boolean";
        };
        readonly hideDownloadButtons: {
            readonly type: "boolean";
        };
        readonly downloadUrls: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly title: {
                        readonly type: "string";
                    };
                    readonly url: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["url"];
                readonly additionalProperties: false;
            };
        };
        readonly onlyRequiredInSamples: {
            readonly type: "boolean";
        };
        readonly generatedSamplesMaxDepth: {
            readonly oneOf: readonly [{
                readonly type: "number";
            }, {
                readonly type: "string";
            }];
        };
        readonly showExtensions: {
            readonly oneOf: readonly [{
                readonly type: "boolean";
            }, {
                readonly type: "string";
            }, {
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
            }];
        };
        readonly hideSchemaTitles: {
            readonly type: "boolean";
        };
        readonly jsonSamplesExpandLevel: {
            readonly oneOf: readonly [{
                readonly type: "number";
            }, {
                readonly type: "string";
            }];
        };
        readonly schemasExpansionLevel: {
            readonly oneOf: readonly [{
                readonly type: "number";
            }, {
                readonly type: "string";
            }];
        };
        readonly mockServer: {
            readonly type: "object";
            readonly properties: {
                readonly url: {
                    readonly type: "string";
                };
                readonly position: {
                    readonly type: "string";
                    readonly enum: readonly ["first", "last", "replace", "off"];
                };
                readonly description: {
                    readonly type: "string";
                };
            };
        };
        readonly maxDisplayedEnumValues: {
            readonly type: "number";
        };
        readonly schemaDefinitionsTagName: {
            readonly type: "string";
        };
        readonly layout: {
            readonly type: "string";
            readonly enum: readonly ["stacked", "three-panel"];
        };
        readonly hideInfoMetadata: {
            readonly type: "boolean";
        };
        readonly events: {
            readonly type: "object";
        };
        readonly skipBundle: {
            readonly type: "boolean";
        };
        readonly routingBasePath: {
            readonly type: "string";
        };
        readonly codeSamples: {
            readonly type: "object";
            readonly properties: {
                readonly languages: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly properties: {
                            readonly lang: {
                                readonly type: "string";
                                readonly enum: readonly ["curl", "JavaScript", "Node.js", "Python", "Java8+Apache", "Java", "C#", "C#+Newtonsoft", "PHP", "Go", "Ruby", "R", "Payload"];
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly options: {
                                readonly type: "object";
                                readonly properties: {
                                    readonly indent: {
                                        readonly type: "string";
                                    };
                                    readonly withImports: {
                                        readonly type: "boolean";
                                    };
                                    readonly withComments: {
                                        readonly type: "boolean";
                                    };
                                    readonly binary: {
                                        readonly type: "boolean";
                                    };
                                    readonly credentials: {
                                        readonly type: "string";
                                        readonly enum: readonly ["omit", "same-origin", "include"];
                                    };
                                };
                                readonly additionalProperties: false;
                            };
                        };
                        readonly required: readonly ["lang"];
                        readonly additionalProperties: false;
                    };
                };
                readonly skipOptionalParameters: {
                    readonly type: "boolean";
                };
                readonly withOAuth2Call: {
                    readonly type: "boolean";
                };
            };
            readonly required: readonly ["languages"];
            readonly additionalProperties: false;
        };
        readonly ignoreNamedSchemas: {
            readonly oneOf: readonly [{
                readonly type: "array";
                readonly items: {
                    readonly type: "string";
                };
            }, {
                readonly type: "string";
            }];
        };
        readonly hidePropertiesPrefix: {
            readonly type: "boolean";
        };
        readonly excludeFromSearch: {
            readonly type: "boolean";
        };
    };
    readonly type: "object";
    readonly additionalProperties: false;
};
export declare const amplitudeAnalyticsConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly includeInDevelopment: {
            readonly type: "boolean";
        };
        readonly apiKey: {
            readonly type: "string";
        };
        readonly head: {
            readonly type: "boolean";
        };
        readonly respectDNT: {
            readonly type: "boolean";
        };
        readonly exclude: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
        readonly outboundClickEventName: {
            readonly type: "string";
        };
        readonly pageViewEventName: {
            readonly type: "string";
        };
        readonly amplitudeConfig: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["apiKey"];
};
export declare const fullstoryAnalyticsConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly includeInDevelopment: {
            readonly type: "boolean";
        };
        readonly orgId: {
            readonly type: "string";
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["orgId"];
};
export declare const heapAnalyticsConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly includeInDevelopment: {
            readonly type: "boolean";
        };
        readonly appId: {
            readonly type: "string";
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["appId"];
};
export declare const rudderstackAnalyticsConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly includeInDevelopment: {
            readonly type: "boolean";
        };
        readonly writeKey: {
            readonly type: "string";
            readonly minLength: 10;
        };
        readonly trackPage: {
            readonly type: "boolean";
        };
        readonly dataPlaneUrl: {
            readonly type: "string";
        };
        readonly controlPlaneUrl: {
            readonly type: "string";
        };
        readonly sdkUrl: {
            readonly type: "string";
        };
        readonly loadOptions: {
            readonly type: "object";
            readonly additionalProperties: true;
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["writeKey"];
};
export declare const segmentAnalyticsConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly includeInDevelopment: {
            readonly type: "boolean";
        };
        readonly writeKey: {
            readonly type: "string";
            readonly minLength: 10;
        };
        readonly trackPage: {
            readonly type: "boolean";
        };
        readonly includeTitleInPageCall: {
            readonly type: "boolean";
        };
        readonly host: {
            readonly type: "string";
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["writeKey"];
};
export declare const gtmAnalyticsConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly includeInDevelopment: {
            readonly type: "boolean";
        };
        readonly trackingId: {
            readonly type: "string";
        };
        readonly gtmAuth: {
            readonly type: "string";
        };
        readonly gtmPreview: {
            readonly type: "string";
        };
        readonly defaultDataLayer: {};
        readonly dataLayerName: {
            readonly type: "string";
        };
        readonly enableWebVitalsTracking: {
            readonly type: "boolean";
        };
        readonly selfHostedOrigin: {
            readonly type: "string";
        };
        readonly pageViewEventName: {
            readonly type: "string";
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["trackingId"];
};
export declare const productGoogleAnalyticsConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly includeInDevelopment: {
            readonly type: "boolean";
        };
        readonly trackingId: {
            readonly type: "string";
        };
        readonly conversionId: {
            readonly type: "string";
        };
        readonly floodlightId: {
            readonly type: "string";
        };
        readonly optimizeId: {
            readonly type: "string";
        };
        readonly exclude: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["trackingId"];
};
export declare const googleAnalyticsConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly includeInDevelopment: {
            readonly type: "boolean";
        };
        readonly trackingId: {
            readonly type: "string";
        };
        readonly conversionId: {
            readonly type: "string";
        };
        readonly floodlightId: {
            readonly type: "string";
        };
        readonly head: {
            readonly type: "boolean";
        };
        readonly respectDNT: {
            readonly type: "boolean";
        };
        readonly exclude: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
        readonly optimizeId: {
            readonly type: "string";
        };
        readonly anonymizeIp: {
            readonly type: "boolean";
        };
        readonly cookieExpires: {
            readonly type: "number";
        };
        readonly trackers: {
            readonly type: "object";
            readonly additionalProperties: {
                readonly type: "object";
                readonly properties: {
                    readonly includeInDevelopment: {
                        readonly type: "boolean";
                    };
                    readonly trackingId: {
                        readonly type: "string";
                    };
                    readonly conversionId: {
                        readonly type: "string";
                    };
                    readonly floodlightId: {
                        readonly type: "string";
                    };
                    readonly optimizeId: {
                        readonly type: "string";
                    };
                    readonly exclude: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
                readonly additionalProperties: false;
                readonly required: readonly ["trackingId"];
            };
        };
    };
    readonly additionalProperties: false;
    readonly required: readonly ["trackingId"];
};
export declare const analyticsConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly adobe: {
            readonly type: "object";
            readonly properties: {
                readonly includeInDevelopment: {
                    readonly type: "boolean";
                };
                readonly scriptUrl: {
                    readonly type: "string";
                };
                readonly pageViewEventName: {
                    readonly type: "string";
                };
            };
            readonly additionalProperties: false;
            readonly required: readonly ["scriptUrl"];
        };
        readonly amplitude: {
            readonly type: "object";
            readonly properties: {
                readonly includeInDevelopment: {
                    readonly type: "boolean";
                };
                readonly apiKey: {
                    readonly type: "string";
                };
                readonly head: {
                    readonly type: "boolean";
                };
                readonly respectDNT: {
                    readonly type: "boolean";
                };
                readonly exclude: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
                readonly outboundClickEventName: {
                    readonly type: "string";
                };
                readonly pageViewEventName: {
                    readonly type: "string";
                };
                readonly amplitudeConfig: {
                    readonly type: "object";
                    readonly additionalProperties: true;
                };
            };
            readonly additionalProperties: false;
            readonly required: readonly ["apiKey"];
        };
        readonly fullstory: {
            readonly type: "object";
            readonly properties: {
                readonly includeInDevelopment: {
                    readonly type: "boolean";
                };
                readonly orgId: {
                    readonly type: "string";
                };
            };
            readonly additionalProperties: false;
            readonly required: readonly ["orgId"];
        };
        readonly heap: {
            readonly type: "object";
            readonly properties: {
                readonly includeInDevelopment: {
                    readonly type: "boolean";
                };
                readonly appId: {
                    readonly type: "string";
                };
            };
            readonly additionalProperties: false;
            readonly required: readonly ["appId"];
        };
        readonly rudderstack: {
            readonly type: "object";
            readonly properties: {
                readonly includeInDevelopment: {
                    readonly type: "boolean";
                };
                readonly writeKey: {
                    readonly type: "string";
                    readonly minLength: 10;
                };
                readonly trackPage: {
                    readonly type: "boolean";
                };
                readonly dataPlaneUrl: {
                    readonly type: "string";
                };
                readonly controlPlaneUrl: {
                    readonly type: "string";
                };
                readonly sdkUrl: {
                    readonly type: "string";
                };
                readonly loadOptions: {
                    readonly type: "object";
                    readonly additionalProperties: true;
                };
            };
            readonly additionalProperties: false;
            readonly required: readonly ["writeKey"];
        };
        readonly segment: {
            readonly type: "object";
            readonly properties: {
                readonly includeInDevelopment: {
                    readonly type: "boolean";
                };
                readonly writeKey: {
                    readonly type: "string";
                    readonly minLength: 10;
                };
                readonly trackPage: {
                    readonly type: "boolean";
                };
                readonly includeTitleInPageCall: {
                    readonly type: "boolean";
                };
                readonly host: {
                    readonly type: "string";
                };
            };
            readonly additionalProperties: false;
            readonly required: readonly ["writeKey"];
        };
        readonly gtm: {
            readonly type: "object";
            readonly properties: {
                readonly includeInDevelopment: {
                    readonly type: "boolean";
                };
                readonly trackingId: {
                    readonly type: "string";
                };
                readonly gtmAuth: {
                    readonly type: "string";
                };
                readonly gtmPreview: {
                    readonly type: "string";
                };
                readonly defaultDataLayer: {};
                readonly dataLayerName: {
                    readonly type: "string";
                };
                readonly enableWebVitalsTracking: {
                    readonly type: "boolean";
                };
                readonly selfHostedOrigin: {
                    readonly type: "string";
                };
                readonly pageViewEventName: {
                    readonly type: "string";
                };
            };
            readonly additionalProperties: false;
            readonly required: readonly ["trackingId"];
        };
        readonly ga: {
            readonly type: "object";
            readonly properties: {
                readonly includeInDevelopment: {
                    readonly type: "boolean";
                };
                readonly trackingId: {
                    readonly type: "string";
                };
                readonly conversionId: {
                    readonly type: "string";
                };
                readonly floodlightId: {
                    readonly type: "string";
                };
                readonly head: {
                    readonly type: "boolean";
                };
                readonly respectDNT: {
                    readonly type: "boolean";
                };
                readonly exclude: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
                readonly optimizeId: {
                    readonly type: "string";
                };
                readonly anonymizeIp: {
                    readonly type: "boolean";
                };
                readonly cookieExpires: {
                    readonly type: "number";
                };
                readonly trackers: {
                    readonly type: "object";
                    readonly additionalProperties: {
                        readonly type: "object";
                        readonly properties: {
                            readonly includeInDevelopment: {
                                readonly type: "boolean";
                            };
                            readonly trackingId: {
                                readonly type: "string";
                            };
                            readonly conversionId: {
                                readonly type: "string";
                            };
                            readonly floodlightId: {
                                readonly type: "string";
                            };
                            readonly optimizeId: {
                                readonly type: "string";
                            };
                            readonly exclude: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly additionalProperties: false;
                        readonly required: readonly ["trackingId"];
                    };
                };
            };
            readonly additionalProperties: false;
            readonly required: readonly ["trackingId"];
        };
    };
};
export declare const userMenuConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly hide: {
            readonly type: "boolean";
        };
        readonly items: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly external: {
                        readonly type: "boolean";
                    };
                    readonly link: {
                        readonly type: "string";
                    };
                    readonly separatorLine: {
                        readonly type: "boolean";
                    };
                };
                readonly additionalProperties: true;
            };
            readonly default: readonly [];
        };
        readonly hideLoginButton: {
            readonly type: "boolean";
        };
    };
    readonly additionalProperties: false;
};
export declare const versionPickerConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly hide: {
            readonly type: "boolean";
        };
        readonly showForUnversioned: {
            readonly type: "boolean";
        };
    };
};
export declare const breadcrumbsConfigSchema: {
    readonly type: "object";
    readonly properties: {
        readonly hide: {
            readonly type: "boolean";
        };
        readonly prefixItems: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly labelTranslationKey: {
                        readonly type: "string";
                    };
                    readonly page: {
                        readonly type: "string";
                    };
                };
                readonly additionalProperties: false;
                readonly default: {};
            };
        };
    };
    readonly additionalProperties: false;
};
export declare const catalogFilterSchema: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly required: readonly ["title", "property"];
    readonly properties: {
        readonly type: {
            readonly type: "string";
            readonly enum: readonly ["select", "checkboxes", "date-range"];
            readonly default: "checkboxes";
        };
        readonly title: {
            readonly type: "string";
        };
        readonly titleTranslationKey: {
            readonly type: "string";
        };
        readonly property: {
            readonly type: "string";
        };
        readonly parentFilter: {
            readonly type: "string";
        };
        readonly valuesMapping: {
            readonly type: "object";
            readonly additionalProperties: {
                readonly type: "string";
            };
        };
        readonly missingCategoryName: {
            readonly type: "string";
        };
        readonly missingCategoryNameTranslationKey: {
            readonly type: "string";
        };
        readonly options: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
    };
};
export declare const catalogSchema: {
    readonly type: "object";
    readonly additionalProperties: true;
    readonly required: readonly ["slug", "items"];
    readonly properties: {
        readonly slug: {
            readonly type: "string";
        };
        readonly filters: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly additionalProperties: false;
                readonly required: readonly ["title", "property"];
                readonly properties: {
                    readonly type: {
                        readonly type: "string";
                        readonly enum: readonly ["select", "checkboxes", "date-range"];
                        readonly default: "checkboxes";
                    };
                    readonly title: {
                        readonly type: "string";
                    };
                    readonly titleTranslationKey: {
                        readonly type: "string";
                    };
                    readonly property: {
                        readonly type: "string";
                    };
                    readonly parentFilter: {
                        readonly type: "string";
                    };
                    readonly valuesMapping: {
                        readonly type: "object";
                        readonly additionalProperties: {
                            readonly type: "string";
                        };
                    };
                    readonly missingCategoryName: {
                        readonly type: "string";
                    };
                    readonly missingCategoryNameTranslationKey: {
                        readonly type: "string";
                    };
                    readonly options: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
            };
        };
        readonly groupByFirstFilter: {
            readonly type: "boolean";
        };
        readonly filterValuesCasing: {
            readonly type: "string";
            readonly enum: readonly ["sentence", "original", "lowercase", "uppercase"];
        };
        readonly items: {
            readonly type: "array";
            readonly items: {
                readonly properties: {
                    readonly items: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "string";
                                };
                                readonly directory: {
                                    readonly type: "string";
                                };
                                readonly disconnect: {
                                    readonly type: "boolean";
                                    readonly default: false;
                                };
                                readonly group: {
                                    readonly type: "string";
                                };
                                readonly label: {
                                    readonly type: "string";
                                };
                                readonly href: {
                                    readonly type: "string";
                                };
                                readonly external: {
                                    readonly type: "boolean";
                                };
                                readonly labelTranslationKey: {
                                    readonly type: "string";
                                };
                                readonly groupTranslationKey: {
                                    readonly type: "string";
                                };
                                readonly icon: {
                                    readonly oneOf: readonly [{
                                        readonly type: "string";
                                    }, {
                                        readonly type: "object";
                                        readonly properties: {
                                            readonly srcSet: {
                                                readonly type: "string";
                                            };
                                        };
                                        readonly required: readonly ["srcSet"];
                                    }];
                                };
                                readonly separator: {
                                    readonly type: "string";
                                };
                                readonly separatorLine: {
                                    readonly type: "boolean";
                                };
                                readonly linePosition: {
                                    readonly type: "string";
                                    readonly enum: readonly ["top", "bottom"];
                                    readonly default: "top";
                                };
                                readonly version: {
                                    readonly type: "string";
                                };
                                readonly menuStyle: {
                                    readonly type: "string";
                                    readonly enum: readonly ["drilldown"];
                                };
                                readonly expanded: {
                                    readonly type: "string";
                                    readonly const: "always";
                                };
                                readonly selectFirstItemOnExpand: {
                                    readonly type: "boolean";
                                };
                                readonly flatten: {
                                    readonly type: "boolean";
                                };
                                readonly linkedSidebars: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "string";
                                    };
                                };
                                readonly items: {
                                    readonly type: "array";
                                    readonly items: {
                                        readonly type: "object";
                                        readonly additionalProperties: true;
                                    };
                                };
                            };
                        };
                    };
                    readonly page: {
                        readonly type: "string";
                    };
                    readonly directory: {
                        readonly type: "string";
                    };
                    readonly disconnect: {
                        readonly type: "boolean";
                        readonly default: false;
                    };
                    readonly group: {
                        readonly type: "string";
                    };
                    readonly label: {
                        readonly type: "string";
                    };
                    readonly href: {
                        readonly type: "string";
                    };
                    readonly external: {
                        readonly type: "boolean";
                    };
                    readonly labelTranslationKey: {
                        readonly type: "string";
                    };
                    readonly groupTranslationKey: {
                        readonly type: "string";
                    };
                    readonly icon: {
                        readonly oneOf: readonly [{
                            readonly type: "string";
                        }, {
                            readonly type: "object";
                            readonly properties: {
                                readonly srcSet: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["srcSet"];
                        }];
                    };
                    readonly separator: {
                        readonly type: "string";
                    };
                    readonly separatorLine: {
                        readonly type: "boolean";
                    };
                    readonly linePosition: {
                        readonly type: "string";
                        readonly enum: readonly ["top", "bottom"];
                        readonly default: "top";
                    };
                    readonly version: {
                        readonly type: "string";
                    };
                    readonly menuStyle: {
                        readonly type: "string";
                        readonly enum: readonly ["drilldown"];
                    };
                    readonly expanded: {
                        readonly type: "string";
                        readonly const: "always";
                    };
                    readonly selectFirstItemOnExpand: {
                        readonly type: "boolean";
                    };
                    readonly flatten: {
                        readonly type: "boolean";
                    };
                    readonly linkedSidebars: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                };
                readonly type: "object";
            };
        };
        readonly requiredPermission: {
            readonly type: "string";
        };
        readonly separateVersions: {
            readonly type: "boolean";
        };
        readonly title: {
            readonly type: "string";
        };
        readonly titleTranslationKey: {
            readonly type: "string";
        };
        readonly description: {
            readonly type: "string";
        };
        readonly descriptionTranslationKey: {
            readonly type: "string";
        };
    };
};
export declare const catalogsConfigSchema: {
    readonly type: "object";
    readonly patternProperties: {
        readonly '.*': {
            readonly type: "object";
            readonly additionalProperties: true;
            readonly required: readonly ["slug", "items"];
            readonly properties: {
                readonly slug: {
                    readonly type: "string";
                };
                readonly filters: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly additionalProperties: false;
                        readonly required: readonly ["title", "property"];
                        readonly properties: {
                            readonly type: {
                                readonly type: "string";
                                readonly enum: readonly ["select", "checkboxes", "date-range"];
                                readonly default: "checkboxes";
                            };
                            readonly title: {
                                readonly type: "string";
                            };
                            readonly titleTranslationKey: {
                                readonly type: "string";
                            };
                            readonly property: {
                                readonly type: "string";
                            };
                            readonly parentFilter: {
                                readonly type: "string";
                            };
                            readonly valuesMapping: {
                                readonly type: "object";
                                readonly additionalProperties: {
                                    readonly type: "string";
                                };
                            };
                            readonly missingCategoryName: {
                                readonly type: "string";
                            };
                            readonly missingCategoryNameTranslationKey: {
                                readonly type: "string";
                            };
                            readonly options: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                            };
                        };
                    };
                };
                readonly groupByFirstFilter: {
                    readonly type: "boolean";
                };
                readonly filterValuesCasing: {
                    readonly type: "string";
                    readonly enum: readonly ["sentence", "original", "lowercase", "uppercase"];
                };
                readonly items: {
                    readonly type: "array";
                    readonly items: {
                        readonly properties: {
                            readonly items: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly page: {
                                            readonly type: "string";
                                        };
                                        readonly directory: {
                                            readonly type: "string";
                                        };
                                        readonly disconnect: {
                                            readonly type: "boolean";
                                            readonly default: false;
                                        };
                                        readonly group: {
                                            readonly type: "string";
                                        };
                                        readonly label: {
                                            readonly type: "string";
                                        };
                                        readonly href: {
                                            readonly type: "string";
                                        };
                                        readonly external: {
                                            readonly type: "boolean";
                                        };
                                        readonly labelTranslationKey: {
                                            readonly type: "string";
                                        };
                                        readonly groupTranslationKey: {
                                            readonly type: "string";
                                        };
                                        readonly icon: {
                                            readonly oneOf: readonly [{
                                                readonly type: "string";
                                            }, {
                                                readonly type: "object";
                                                readonly properties: {
                                                    readonly srcSet: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly required: readonly ["srcSet"];
                                            }];
                                        };
                                        readonly separator: {
                                            readonly type: "string";
                                        };
                                        readonly separatorLine: {
                                            readonly type: "boolean";
                                        };
                                        readonly linePosition: {
                                            readonly type: "string";
                                            readonly enum: readonly ["top", "bottom"];
                                            readonly default: "top";
                                        };
                                        readonly version: {
                                            readonly type: "string";
                                        };
                                        readonly menuStyle: {
                                            readonly type: "string";
                                            readonly enum: readonly ["drilldown"];
                                        };
                                        readonly expanded: {
                                            readonly type: "string";
                                            readonly const: "always";
                                        };
                                        readonly selectFirstItemOnExpand: {
                                            readonly type: "boolean";
                                        };
                                        readonly flatten: {
                                            readonly type: "boolean";
                                        };
                                        readonly linkedSidebars: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "string";
                                            };
                                        };
                                        readonly items: {
                                            readonly type: "array";
                                            readonly items: {
                                                readonly type: "object";
                                                readonly additionalProperties: true;
                                            };
                                        };
                                    };
                                };
                            };
                            readonly page: {
                                readonly type: "string";
                            };
                            readonly directory: {
                                readonly type: "string";
                            };
                            readonly disconnect: {
                                readonly type: "boolean";
                                readonly default: false;
                            };
                            readonly group: {
                                readonly type: "string";
                            };
                            readonly label: {
                                readonly type: "string";
                            };
                            readonly href: {
                                readonly type: "string";
                            };
                            readonly external: {
                                readonly type: "boolean";
                            };
                            readonly labelTranslationKey: {
                                readonly type: "string";
                            };
                            readonly groupTranslationKey: {
                                readonly type: "string";
                            };
                            readonly icon: {
                                readonly oneOf: readonly [{
                                    readonly type: "string";
                                }, {
                                    readonly type: "object";
                                    readonly properties: {
                                        readonly srcSet: {
                                            readonly type: "string";
                                        };
                                    };
                                    readonly required: readonly ["srcSet"];
                                }];
                            };
                            readonly separator: {
                                readonly type: "string";
                            };
                            readonly separatorLine: {
                                readonly type: "boolean";
                            };
                            readonly linePosition: {
                                readonly type: "string";
                                readonly enum: readonly ["top", "bottom"];
                                readonly default: "top";
                            };
                            readonly version: {
                                readonly type: "string";
                            };
                            readonly menuStyle: {
                                readonly type: "string";
                                readonly enum: readonly ["drilldown"];
                            };
                            readonly expanded: {
                                readonly type: "string";
                                readonly const: "always";
                            };
                            readonly selectFirstItemOnExpand: {
                                readonly type: "boolean";
                            };
                            readonly flatten: {
                                readonly type: "boolean";
                            };
                            readonly linkedSidebars: {
                                readonly type: "array";
                                readonly items: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly type: "object";
                    };
                };
                readonly requiredPermission: {
                    readonly type: "string";
                };
                readonly separateVersions: {
                    readonly type: "boolean";
                };
                readonly title: {
                    readonly type: "string";
                };
                readonly titleTranslationKey: {
                    readonly type: "string";
                };
                readonly description: {
                    readonly type: "string";
                };
                readonly descriptionTranslationKey: {
                    readonly type: "string";
                };
            };
        };
    };
};
export declare const scorecardConfigSchema: {
    readonly type: "object";
    readonly additionalProperties: true;
    readonly required: readonly [];
    readonly properties: {
        /**
         * @deprecated Should use `reunite.ignoreLint` instead
         */
        readonly ignoreNonCompliant: {
            readonly type: "boolean";
            readonly default: false;
        };
        readonly teamMetadataProperty: {
            readonly type: "object";
            readonly properties: {
                readonly property: {
                    readonly type: "string";
                };
                readonly label: {
                    readonly type: "string";
                };
                readonly default: {
                    readonly type: "string";
                };
            };
        };
        readonly levels: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["name"];
                readonly properties: {
                    readonly name: {
                        readonly type: "string";
                    };
                    readonly color: {
                        readonly type: "string";
                    };
                    readonly extends: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly rules: {
                        readonly type: "object";
                        readonly additionalProperties: {
                            readonly oneOf: readonly [{
                                readonly type: "string";
                            }, {
                                readonly type: "object";
                            }];
                        };
                    };
                };
                readonly additionalProperties: false;
            };
        };
        readonly targets: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["where"];
                readonly properties: {
                    readonly minimumLevel: {
                        readonly type: "string";
                    };
                    readonly rules: {
                        readonly type: "object";
                        readonly additionalProperties: true;
                    };
                    readonly where: {
                        readonly type: "object";
                        readonly required: readonly ["metadata"];
                        readonly properties: {
                            readonly metadata: {
                                readonly type: "object";
                                readonly additionalProperties: {
                                    readonly type: "string";
                                };
                            };
                        };
                        readonly additionalProperties: false;
                    };
                };
                readonly additionalProperties: false;
            };
        };
        readonly ignore: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
    };
};
