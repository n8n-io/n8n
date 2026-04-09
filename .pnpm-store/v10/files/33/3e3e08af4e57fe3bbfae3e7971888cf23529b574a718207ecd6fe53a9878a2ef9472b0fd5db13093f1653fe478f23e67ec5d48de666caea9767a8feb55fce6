"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestContext = createTestContext;
exports.collectSecretFields = collectSecretFields;
const node_path_1 = require("node:path");
const description_parser_1 = require("../../description-parser");
const faker_1 = require("../../faker");
const arazzo_description_generator_1 = require("../../arazzo-description-generator");
const inputs_1 = require("../inputs");
const get_test_description_from_file_1 = require("../get-test-description-from-file");
const read_env_variables_1 = require("../read-env-variables");
const get_nested_value_1 = require("../../../utils/get-nested-value");
const set_public_workflows_1 = require("./set-public-workflows");
const resolve_mtls_certificates_1 = require("../../../utils/mtls/resolve-mtls-certificates");
const checks_1 = require("../../checks");
const faker = (0, faker_1.createFaker)();
async function createTestContext(testDescription, options, apiClient) {
    const sourceDescriptions = testDescription?.sourceDescriptions;
    const bundledDescriptions = {};
    if (sourceDescriptions) {
        await Promise.all(sourceDescriptions.map(async (sourceDescription) => {
            if (sourceDescription.type === 'openapi') {
                bundledDescriptions[sourceDescription.name] = await (0, description_parser_1.bundleOpenApi)(sourceDescription.url, options.workflowPath);
            }
            else if (sourceDescription.type === 'arazzo') {
                const { url: sourceDescriptionPath, name } = sourceDescription;
                const filePath = (0, node_path_1.resolve)((0, node_path_1.dirname)(options.workflowPath), sourceDescriptionPath);
                const bundledTestDescription = await (0, get_test_description_from_file_1.bundleArazzo)(filePath);
                bundledDescriptions[name] = bundledTestDescription;
            }
        }));
    }
    for (const workflow of testDescription.workflows || []) {
        for (const step of workflow.steps) {
            step.checks = []; // we are mutating the copy of the arazzo file
        }
    }
    const ctx = {
        $response: undefined,
        $request: undefined,
        $inputs: { env: {} },
        $faker: faker,
        $sourceDescriptions: bundledDescriptions,
        $workflows: (0, set_public_workflows_1.getPublicWorkflows)({
            workflows: testDescription.workflows || [],
            inputs: (0, inputs_1.formatCliInputs)(options?.input),
            env: (0, read_env_variables_1.readEnvVariables)(options.workflowPath) || {},
        }),
        $steps: {},
        $components: testDescription.components || {},
        $outputs: {},
        executedSteps: [],
        workflows: testDescription.workflows || [],
        harLogs: {},
        options,
        testDescription,
        info: testDescription.info || arazzo_description_generator_1.infoSubstitute,
        arazzo: testDescription.arazzo || '',
        sourceDescriptions: testDescription.sourceDescriptions || [],
        secretFields: new Set(),
        mtlsCerts: options.mutualTls?.clientCert || options.mutualTls?.clientKey || options.mutualTls?.caCert
            ? (0, resolve_mtls_certificates_1.resolveMtlsCertificates)(options.mutualTls, options.workflowPath)
            : undefined,
        severity: (0, checks_1.resolveSeverityConfiguration)(options.severity),
        apiClient,
    };
    // Collect all secret fields from the input schema and the workflow inputs
    for (const workflow of testDescription.workflows || []) {
        if (workflow.inputs) {
            collectSecretFields(ctx, workflow.inputs, ctx.$workflows[workflow.workflowId].inputs);
        }
    }
    return ctx;
}
function collectSecretFields(ctx, schema, inputs, path = []) {
    if (!schema || !inputs)
        return;
    const inputValue = (0, get_nested_value_1.getNestedValue)(inputs, path);
    if (schema.format === 'password' && inputValue) {
        ctx.secretFields?.add(inputValue);
    }
    if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, value]) => {
            const currentPath = [...path, key];
            collectSecretFields(ctx, value, inputs, currentPath);
        });
    }
}
//# sourceMappingURL=create-test-context.js.map