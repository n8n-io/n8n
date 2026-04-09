"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.infoSubstitute = void 0;
exports.generateArazzoDescription = generateArazzoDescription;
const path = __importStar(require("path"));
const description_parser_1 = require("../description-parser");
const generate_workflows_from_description_1 = require("./generate-workflows-from-description");
const generate_inputs_arazzo_components_1 = require("./generate-inputs-arazzo-components");
exports.infoSubstitute = {
    title: '[REPLACE WITH API title]',
    version: '[REPLACE WITH API version]',
};
function resolveDescriptionNameFromPath(descriptionPath) {
    return path
        .parse(descriptionPath)
        .name.replace(/\./g, '-')
        .replace(/[^A-Za-z0-9_-]/g, '');
}
async function generateArazzoDescription({ descriptionPath, 'output-file': outputFile, }) {
    const { paths: pathsObject, info, security: rootSecurity, components, } = (await (0, description_parser_1.bundleOpenApi)(descriptionPath, '')) || {};
    const sourceDescriptionName = resolveDescriptionNameFromPath(descriptionPath);
    const resolvedDescriptionPath = outputFile
        ? path.relative(path.dirname(outputFile), path.resolve(descriptionPath))
        : descriptionPath;
    const inputsComponents = components?.securitySchemes
        ? (0, generate_inputs_arazzo_components_1.generateSecurityInputsArazzoComponents)(components?.securitySchemes)
        : undefined;
    const testDescription = {
        arazzo: '1.0.1',
        info: {
            title: info?.title || exports.infoSubstitute.title,
            version: info?.version || exports.infoSubstitute.version,
        },
        sourceDescriptions: [
            {
                name: sourceDescriptionName,
                type: 'openapi',
                url: resolvedDescriptionPath,
            },
        ],
        workflows: (0, generate_workflows_from_description_1.generateWorkflowsFromDescription)({
            descriptionPaths: pathsObject,
            sourceDescriptionName,
            rootSecurity,
            inputsComponents: inputsComponents || {},
            securitySchemes: components?.securitySchemes,
        }),
        ...(inputsComponents && {
            components: inputsComponents,
        }),
    };
    return JSON.parse(JSON.stringify(testDescription, null, 2));
}
//# sourceMappingURL=generate-arazzo-description.js.map