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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlugins = createPlugins;
const file_html_1 = require("./plugins/file-html");
const file_md_1 = require("./plugins/file-md");
const file_vue_1 = require("./plugins/file-vue");
const vue_root_tags_1 = require("./plugins/vue-root-tags");
const vue_script_js_1 = require("./plugins/vue-script-js");
const vue_sfc_customblocks_1 = require("./plugins/vue-sfc-customblocks");
const vue_sfc_scripts_1 = require("./plugins/vue-sfc-scripts");
const vue_sfc_styles_1 = require("./plugins/vue-sfc-styles");
const vue_sfc_template_1 = require("./plugins/vue-sfc-template");
const vue_template_html_1 = require("./plugins/vue-template-html");
const vue_template_inline_css_1 = require("./plugins/vue-template-inline-css");
const vue_template_inline_ts_1 = require("./plugins/vue-template-inline-ts");
const vue_tsx_1 = require("./plugins/vue-tsx");
const types_1 = require("./types");
__exportStar(require("./plugins/shared"), exports);
function createPlugins(pluginContext) {
    const plugins = [
        file_vue_1.default,
        file_md_1.default,
        file_html_1.default,
        vue_root_tags_1.default,
        vue_script_js_1.default,
        vue_template_html_1.default,
        vue_template_inline_css_1.default,
        vue_template_inline_ts_1.default,
        vue_sfc_styles_1.default,
        vue_sfc_customblocks_1.default,
        vue_sfc_scripts_1.default,
        vue_sfc_template_1.default,
        vue_tsx_1.default,
        ...pluginContext.vueCompilerOptions.plugins,
    ];
    const pluginInstances = plugins
        .flatMap(plugin => {
        try {
            const instance = plugin(pluginContext);
            const moduleName = plugin.__moduleName;
            if (Array.isArray(instance)) {
                for (let i = 0; i < instance.length; i++) {
                    instance[i].name ??= `${moduleName} (${i})`;
                }
            }
            else {
                instance.name ??= moduleName;
            }
            return instance;
        }
        catch (err) {
            console.warn('[Vue] Failed to create plugin', err);
        }
    })
        .filter(plugin => !!plugin)
        .sort((a, b) => {
        const aOrder = a.order ?? 0;
        const bOrder = b.order ?? 0;
        return aOrder - bOrder;
    });
    return pluginInstances.filter(plugin => {
        if (!types_1.validVersions.includes(plugin.version)) {
            console.warn(`[Vue] Plugin ${plugin.name} is not compatible with the current Vue language tools version. (version: ${plugin.version}, supported versions: ${JSON.stringify(types_1.validVersions)})`);
            return false;
        }
        return true;
    });
}
//# sourceMappingURL=plugins.js.map