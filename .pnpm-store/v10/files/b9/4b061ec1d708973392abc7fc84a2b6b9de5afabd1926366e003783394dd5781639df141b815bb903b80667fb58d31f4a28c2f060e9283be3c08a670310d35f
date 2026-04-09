"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerUrl = getServerUrl;
const config_parser_1 = require("../config-parser");
const inputs_1 = require("./inputs");
function getServerUrl({ ctx, descriptionName, openapiOperation, xOperation, }) {
    if (!descriptionName && xOperation?.url) {
        return { url: xOperation?.url };
    }
    // Handle server overrides from command line `server` option
    if (ctx.options?.server && descriptionName) {
        const serverOverrides = (0, inputs_1.formatCliInputs)(ctx.options.server);
        if (serverOverrides[descriptionName]) {
            return { url: serverOverrides[descriptionName] };
        }
    }
    const sourceDescription = ctx.sourceDescriptions?.find((sd) => sd.name === descriptionName);
    if (sourceDescription &&
        sourceDescription.type === 'openapi' &&
        sourceDescription['x-serverUrl']) {
        if (sourceDescription['x-serverUrl'].startsWith('http')) {
            return {
                url: sourceDescription['x-serverUrl'],
            };
        }
        const serverIndexInDescription = sourceDescription['x-serverUrl'].startsWith('$servers.')
            ? sourceDescription['x-serverUrl'].split('.')[1]
            : undefined;
        if (!serverIndexInDescription) {
            return undefined;
        }
        const serverObject = (0, config_parser_1.getValueFromContext)(`$sourceDescriptions.${descriptionName}.servers.${serverIndexInDescription}`, ctx);
        return resolveOpenApiServerUrlWithVariables(serverObject);
    }
    if (openapiOperation?.servers?.[0]) {
        const activeSourceDescription = ctx.sourceDescriptions?.find((sd) => sd.name === openapiOperation.sourceDescriptionName);
        let serverUrlOverride;
        if (ctx.sourceDescriptions?.length === 1 && ctx.sourceDescriptions[0]) {
            serverUrlOverride =
                'x-serverUrl' in ctx.sourceDescriptions[0]
                    ? ctx.sourceDescriptions[0]['x-serverUrl']
                    : undefined;
        }
        else if (activeSourceDescription) {
            serverUrlOverride =
                'x-serverUrl' in activeSourceDescription
                    ? activeSourceDescription['x-serverUrl']
                    : undefined;
        }
        return serverUrlOverride
            ? { url: serverUrlOverride }
            : resolveOpenApiServerUrlWithVariables(openapiOperation.servers[0]);
    }
    if (!descriptionName && ctx?.sourceDescriptions && ctx.sourceDescriptions.length === 1) {
        const sourceDescription = ctx.sourceDescriptions[0];
        if ('x-serverUrl' in sourceDescription && sourceDescription['x-serverUrl']) {
            return { url: sourceDescription['x-serverUrl'] };
        }
        else {
            return (resolveOpenApiServerUrlWithVariables(ctx.$sourceDescriptions[sourceDescription.name]?.servers[0]) || undefined);
        }
    }
    if (!descriptionName ||
        !ctx.$sourceDescriptions ||
        !ctx.$sourceDescriptions[descriptionName] ||
        !ctx.$sourceDescriptions[descriptionName].servers.length) {
        return undefined;
    }
    // Get first available server url from the description
    return resolveOpenApiServerUrlWithVariables(ctx.$sourceDescriptions[descriptionName].servers?.[0]);
}
function resolveOpenApiServerUrlWithVariables(server) {
    if (!server) {
        return undefined;
    }
    return {
        url: server.url,
        parameters: Object.entries(server.variables || {})
            .map(([key, value]) => ({
            in: 'path',
            name: key,
            value: value.default,
        }))
            .filter(({ value }) => !!value),
    };
}
//# sourceMappingURL=get-server-url.js.map