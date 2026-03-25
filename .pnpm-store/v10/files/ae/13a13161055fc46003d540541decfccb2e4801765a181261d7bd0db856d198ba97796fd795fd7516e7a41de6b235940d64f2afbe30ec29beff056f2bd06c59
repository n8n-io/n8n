"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getObjectOrJSON = getObjectOrJSON;
exports.getPageHTML = getPageHTML;
exports.sanitizeJSONString = sanitizeJSONString;
exports.escapeClosingScriptTag = escapeClosingScriptTag;
exports.escapeUnicode = escapeUnicode;
const react_1 = require("react");
const redoc_1 = require("redoc");
const server_1 = require("react-dom/server");
const styled_components_1 = require("styled-components");
const handlebars_1 = require("handlebars");
const path_1 = require("path");
const fs_1 = require("fs");
const colorette_1 = require("colorette");
const openapi_core_1 = require("@redocly/openapi-core");
const miscellaneous_1 = require("../../utils/miscellaneous");
function getObjectOrJSON(openapiOptions, config) {
    switch (typeof openapiOptions) {
        case 'object':
            return openapiOptions;
        case 'string':
            try {
                if ((0, fs_1.existsSync)(openapiOptions) && (0, fs_1.lstatSync)(openapiOptions).isFile()) {
                    return JSON.parse((0, fs_1.readFileSync)(openapiOptions, 'utf-8'));
                }
                else {
                    return JSON.parse(openapiOptions);
                }
            }
            catch (e) {
                process.stderr.write((0, colorette_1.red)(`Encountered error:\n\n${openapiOptions}\n\nis neither a file with a valid JSON object neither a stringified JSON object.`));
                (0, miscellaneous_1.exitWithError)(e);
            }
            break;
        default: {
            if (config) {
                process.stdout.write(`Found ${config.configFile} and using theme.openapi options\n`);
                return config.theme.openapi ? config.theme.openapi : {};
            }
            return {};
        }
    }
    return {};
}
async function getPageHTML(api, pathToApi, { title, disableGoogleFont, templateFileName, templateOptions, redocOptions = {}, redocCurrentVersion, }, configPath) {
    process.stdout.write('Prerendering docs\n');
    const apiUrl = redocOptions.specUrl || ((0, openapi_core_1.isAbsoluteUrl)(pathToApi) ? pathToApi : undefined);
    const store = await (0, redoc_1.createStore)(api, apiUrl, redocOptions);
    const sheet = new styled_components_1.ServerStyleSheet();
    const html = (0, server_1.renderToString)(sheet.collectStyles((0, react_1.createElement)(redoc_1.Redoc, { store })));
    const state = await store.toJS();
    const css = sheet.getStyleTags();
    templateFileName = templateFileName
        ? templateFileName
        : redocOptions?.htmlTemplate
            ? (0, path_1.resolve)(configPath ? (0, path_1.dirname)(configPath) : '', redocOptions.htmlTemplate)
            : (0, path_1.join)(__dirname, './template.hbs');
    const template = (0, handlebars_1.compile)((0, fs_1.readFileSync)(templateFileName).toString());
    return template({
        redocHTML: `
      <div id="redoc">${html || ''}</div>
      <script>
      ${`const __redoc_state = ${sanitizeJSONString(JSON.stringify(state))};` || ''}

      var container = document.getElementById('redoc');
      Redoc.${'hydrate(__redoc_state, container)'};

      </script>`,
        redocHead: `<script src="https://cdn.redocly.com/redoc/v${redocCurrentVersion}/bundles/redoc.standalone.js"></script>` +
            css,
        title: title || api.info.title || 'ReDoc documentation',
        disableGoogleFont,
        templateOptions,
    });
}
function sanitizeJSONString(str) {
    return escapeClosingScriptTag(escapeUnicode(str));
}
// see http://www.thespanner.co.uk/2011/07/25/the-json-specification-is-now-wrong/
function escapeClosingScriptTag(str) {
    return str.replace(/<\/script>/g, '<\\/script>');
}
// see http://www.thespanner.co.uk/2011/07/25/the-json-specification-is-now-wrong/
function escapeUnicode(str) {
    return str.replace(/\u2028|\u2029/g, (m) => '\\u202' + (m === '\u2028' ? '8' : '9'));
}
