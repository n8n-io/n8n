"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _setupTrackingContext = /*#__PURE__*/ _interop_require_default(require("./lib/setupTrackingContext"));
const _processTailwindFeatures = /*#__PURE__*/ _interop_require_default(require("./processTailwindFeatures"));
const _sharedState = require("./lib/sharedState");
const _findAtConfigPath = require("./lib/findAtConfigPath");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
module.exports = function tailwindcss(configOrPath) {
    return {
        postcssPlugin: "tailwindcss",
        plugins: [
            _sharedState.env.DEBUG && function(root) {
                console.log("\n");
                console.time("JIT TOTAL");
                return root;
            },
            async function(root, result) {
                var _findAtConfigPath1;
                // Use the path for the `@config` directive if it exists, otherwise use the
                // path for the file being processed
                configOrPath = (_findAtConfigPath1 = (0, _findAtConfigPath.findAtConfigPath)(root, result)) !== null && _findAtConfigPath1 !== void 0 ? _findAtConfigPath1 : configOrPath;
                let context = (0, _setupTrackingContext.default)(configOrPath);
                if (root.type === "document") {
                    let roots = root.nodes.filter((node)=>node.type === "root");
                    for (const root of roots){
                        if (root.type === "root") {
                            await (0, _processTailwindFeatures.default)(context)(root, result);
                        }
                    }
                    return;
                }
                await (0, _processTailwindFeatures.default)(context)(root, result);
            },
            _sharedState.env.DEBUG && function(root) {
                console.timeEnd("JIT TOTAL");
                console.log("\n");
                return root;
            }
        ].filter(Boolean)
    };
};
module.exports.postcss = true;
