"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const runTsc_1 = require("@volar/typescript/lib/quickstart/runTsc");
const vue = require("@vue/language-core");
const windowsPathReg = /\\/g;
function run(tscPath = require.resolve('typescript/lib/tsc')) {
    let runExtensions = ['.vue'];
    const extensionsChangedException = new Error('extensions changed');
    const main = () => (0, runTsc_1.runTsc)(tscPath, runExtensions, (ts, options) => {
        const { configFilePath } = options.options;
        const vueOptions = typeof configFilePath === 'string'
            ? vue.createParsedCommandLine(ts, ts.sys, configFilePath.replace(windowsPathReg, '/')).vueOptions
            : vue.getDefaultCompilerOptions();
        const allExtensions = vue.getAllExtensions(vueOptions);
        if (runExtensions.length === allExtensions.length
            && runExtensions.every(ext => allExtensions.includes(ext))) {
            const vueLanguagePlugin = vue.createVueLanguagePlugin(ts, options.options, vueOptions, id => id);
            return { languagePlugins: [vueLanguagePlugin] };
        }
        else {
            runExtensions = allExtensions;
            throw extensionsChangedException;
        }
    });
    try {
        main();
    }
    catch (err) {
        if (err === extensionsChangedException) {
            main();
        }
        else {
            throw err;
        }
    }
}
//# sourceMappingURL=index.js.map