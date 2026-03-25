"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPlugin = exports.builtInConfigs = void 0;
const recommended_1 = require("./recommended");
const recommended_strict_1 = require("./recommended-strict");
const all_1 = require("./all");
const minimal_1 = require("./minimal");
const spec_1 = require("./spec");
const oas3_1 = require("../rules/oas3");
const oas2_1 = require("../rules/oas2");
const async2_1 = require("../rules/async2");
const async3_1 = require("../rules/async3");
const arazzo_1 = require("../rules/arazzo");
const oas3_2 = require("../decorators/oas3");
const oas2_2 = require("../decorators/oas2");
const async2_2 = require("../decorators/async2");
const async3_2 = require("../decorators/async3");
const arazzo_2 = require("../decorators/arazzo");
exports.builtInConfigs = {
    recommended: recommended_1.default,
    'recommended-strict': recommended_strict_1.default,
    minimal: minimal_1.default,
    all: all_1.default,
    spec: spec_1.default,
    'redocly-registry': {
        decorators: { 'registry-dependencies': 'on' },
    },
};
exports.defaultPlugin = {
    id: '', // default plugin doesn't have id
    rules: {
        oas3: oas3_1.rules,
        oas2: oas2_1.rules,
        async2: async2_1.rules,
        async3: async3_1.rules,
        arazzo1: arazzo_1.rules,
    },
    preprocessors: {
        oas3: oas3_1.preprocessors,
        oas2: oas2_1.preprocessors,
        async2: async2_1.preprocessors,
        async3: async3_1.preprocessors,
        arazzo1: arazzo_1.preprocessors,
    },
    decorators: {
        oas3: oas3_2.decorators,
        oas2: oas2_2.decorators,
        async2: async2_2.decorators,
        async3: async3_2.decorators,
        arazzo1: arazzo_2.decorators,
    },
    configs: exports.builtInConfigs,
};
