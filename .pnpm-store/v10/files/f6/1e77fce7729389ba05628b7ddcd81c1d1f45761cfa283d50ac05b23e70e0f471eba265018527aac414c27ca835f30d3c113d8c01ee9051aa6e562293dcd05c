"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bundleOpenApi = bundleOpenApi;
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const openapi_core_1 = require("@redocly/openapi-core");
const is_url_1 = require("../../utils/is-url");
async function bundleOpenApi(path = '', workflowPath) {
    const isUrl = (0, is_url_1.isURL)(path);
    const config = await (0, openapi_core_1.loadConfig)();
    let bundleDocument;
    if (isUrl) {
        // Download OpenAPI YAML file
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch OpenAPI YAML file. Status: ${response.status}`);
        }
        const openApiYaml = await response.text();
        bundleDocument = await (0, openapi_core_1.bundleFromString)({
            source: openApiYaml,
            config,
            dereference: true,
        });
    }
    else {
        const descriptionPath = path && (0, node_path_1.resolve)((0, node_path_1.dirname)(workflowPath), path);
        if (!(0, node_fs_1.existsSync)(descriptionPath)) {
            throw new Error(`Could not find source description file '${path}' at path '${workflowPath}'`);
        }
        bundleDocument = await (0, openapi_core_1.bundle)({
            ref: descriptionPath,
            config,
            dereference: true,
        });
    }
    if (!bundleDocument)
        return;
    const { bundle: { parsed: { paths, servers, info, security, components }, }, } = bundleDocument;
    return { paths, servers, info, security, components };
}
//# sourceMappingURL=bundle-openapi.js.map