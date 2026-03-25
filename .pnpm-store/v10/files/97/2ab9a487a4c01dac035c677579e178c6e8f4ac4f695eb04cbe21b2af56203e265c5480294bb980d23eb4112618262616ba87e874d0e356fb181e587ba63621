"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseYamlToDocument = parseYamlToDocument;
exports.makeConfigForRuleset = makeConfigForRuleset;
const js_yaml_1 = require("../js-yaml");
const resolve_1 = require("../resolve");
const config_1 = require("../config");
function parseYamlToDocument(body, absoluteRef = '') {
    return {
        source: new resolve_1.Source(absoluteRef, body),
        parsed: (0, js_yaml_1.parseYaml)(body, { filename: absoluteRef }),
    };
}
async function makeConfigForRuleset(rules, plugin) {
    const rulesConf = {};
    const ruleId = 'test';
    Object.keys(rules).forEach((name) => {
        rulesConf[`${ruleId}/${name}`] = 'error';
    });
    const extendConfigs = [
        (await (0, config_1.resolvePlugins)([
            {
                ...plugin,
                id: ruleId,
                rules: { oas3: rules },
            },
        ])),
    ];
    if (rules) {
        extendConfigs.push({ rules });
    }
    const styleguide = (0, config_1.mergeExtends)(extendConfigs);
    return new config_1.StyleguideConfig(styleguide);
}
