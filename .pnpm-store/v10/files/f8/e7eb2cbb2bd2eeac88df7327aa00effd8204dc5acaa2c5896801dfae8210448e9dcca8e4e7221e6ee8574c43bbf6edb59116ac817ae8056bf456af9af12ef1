const {transform} = require("../dist");

// Enum constants taken from the TypeScript codebase.
const ModuleKindCommonJS = 1;

const JsxEmitReactJSX = 4;
const JsxEmitReactJSXDev = 5;

/**
 * ts-node transpiler plugin
 *
 * This plugin hooks into ts-node so that Sucrase can handle all TS-to-JS
 * conversion while ts-node handles the ESM loader, require hook, REPL
 * integration, etc. ts-node automatically discovers the relevant tsconfig file,
 * so the main logic in this integration is translating tsconfig options to the
 * corresponding Sucrase options.
 *
 * Any tsconfig options relevant to Sucrase are translated, but some config
 * options outside the scope of Sucrase are ignored. For example, we assume the
 * isolatedModules option, and we ignore target because Sucrase doesn't provide
 * JS syntax downleveling (at least not in a way that is useful for Node).
 *
 * One notable caveat is that importsNotUsedAsValues and preserveValueImports
 * are ignored right now, since they are deprecated and don't have exact Sucrase
 * equivalents. To preserve imports and exports, use verbatimModuleSyntax.
 */
function create(createOptions) {
  const {nodeModuleEmitKind} = createOptions;
  const {
    module,
    jsx,
    jsxFactory,
    jsxFragmentFactory,
    jsxImportSource,
    esModuleInterop,
    verbatimModuleSyntax,
  } = createOptions.service.config.options;

  return {
    transpile(input, transpileOptions) {
      const {fileName} = transpileOptions;
      const transforms = [];
      // Detect JS rather than TS so we bias toward including the typescript
      // transform, since almost always it doesn't hurt to include.
      const isJS =
        fileName.endsWith(".js") ||
        fileName.endsWith(".jsx") ||
        fileName.endsWith(".mjs") ||
        fileName.endsWith(".cjs");
      if (!isJS) {
        transforms.push("typescript");
      }
      if (module === ModuleKindCommonJS || nodeModuleEmitKind === "nodecjs") {
        transforms.push("imports");
      }
      if (fileName.endsWith(".tsx") || fileName.endsWith(".jsx")) {
        transforms.push("jsx");
      }

      const {code, sourceMap} = transform(input, {
        transforms,
        disableESTransforms: true,
        jsxRuntime: jsx === JsxEmitReactJSX || jsx === JsxEmitReactJSXDev ? "automatic" : "classic",
        production: jsx === JsxEmitReactJSX,
        jsxImportSource,
        jsxPragma: jsxFactory,
        jsxFragmentPragma: jsxFragmentFactory,
        keepUnusedImports: verbatimModuleSyntax,
        preserveDynamicImport: nodeModuleEmitKind === "nodecjs",
        injectCreateRequireForImportRequire: nodeModuleEmitKind === "nodeesm",
        enableLegacyTypeScriptModuleInterop: !esModuleInterop,
        sourceMapOptions: {compiledFilename: fileName},
        filePath: fileName,
      });
      return {
        outputText: code,
        sourceMapText: JSON.stringify(sourceMap),
      };
    },
  };
}

exports.create = create;
