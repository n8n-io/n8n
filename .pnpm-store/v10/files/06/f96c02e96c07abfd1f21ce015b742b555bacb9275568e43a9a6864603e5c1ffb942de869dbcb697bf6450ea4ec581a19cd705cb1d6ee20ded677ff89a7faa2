"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _CJSImportProcessor = require('./CJSImportProcessor'); var _CJSImportProcessor2 = _interopRequireDefault(_CJSImportProcessor);
var _computeSourceMap = require('./computeSourceMap'); var _computeSourceMap2 = _interopRequireDefault(_computeSourceMap);
var _HelperManager = require('./HelperManager');
var _identifyShadowedGlobals = require('./identifyShadowedGlobals'); var _identifyShadowedGlobals2 = _interopRequireDefault(_identifyShadowedGlobals);
var _NameManager = require('./NameManager'); var _NameManager2 = _interopRequireDefault(_NameManager);
var _Options = require('./Options');

var _parser = require('./parser');

var _TokenProcessor = require('./TokenProcessor'); var _TokenProcessor2 = _interopRequireDefault(_TokenProcessor);
var _RootTransformer = require('./transformers/RootTransformer'); var _RootTransformer2 = _interopRequireDefault(_RootTransformer);
var _formatTokens = require('./util/formatTokens'); var _formatTokens2 = _interopRequireDefault(_formatTokens);
var _getTSImportedNames = require('./util/getTSImportedNames'); var _getTSImportedNames2 = _interopRequireDefault(_getTSImportedNames);














;

 function getVersion() {
  /* istanbul ignore next */
  return "3.35.0";
} exports.getVersion = getVersion;

 function transform(code, options) {
  _Options.validateOptions.call(void 0, options);
  try {
    const sucraseContext = getSucraseContext(code, options);
    const transformer = new (0, _RootTransformer2.default)(
      sucraseContext,
      options.transforms,
      Boolean(options.enableLegacyBabel5ModuleInterop),
      options,
    );
    const transformerResult = transformer.transform();
    let result = {code: transformerResult.code};
    if (options.sourceMapOptions) {
      if (!options.filePath) {
        throw new Error("filePath must be specified when generating a source map.");
      }
      result = {
        ...result,
        sourceMap: _computeSourceMap2.default.call(void 0, 
          transformerResult,
          options.filePath,
          options.sourceMapOptions,
          code,
          sucraseContext.tokenProcessor.tokens,
        ),
      };
    }
    return result;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e) {
    if (options.filePath) {
      e.message = `Error transforming ${options.filePath}: ${e.message}`;
    }
    throw e;
  }
} exports.transform = transform;

/**
 * Return a string representation of the sucrase tokens, mostly useful for
 * diagnostic purposes.
 */
 function getFormattedTokens(code, options) {
  const tokens = getSucraseContext(code, options).tokenProcessor.tokens;
  return _formatTokens2.default.call(void 0, code, tokens);
} exports.getFormattedTokens = getFormattedTokens;

/**
 * Call into the parser/tokenizer and do some further preprocessing:
 * - Come up with a set of used names so that we can assign new names.
 * - Preprocess all import/export statements so we know which globals we are interested in.
 * - Compute situations where any of those globals are shadowed.
 *
 * In the future, some of these preprocessing steps can be skipped based on what actual work is
 * being done.
 */
function getSucraseContext(code, options) {
  const isJSXEnabled = options.transforms.includes("jsx");
  const isTypeScriptEnabled = options.transforms.includes("typescript");
  const isFlowEnabled = options.transforms.includes("flow");
  const disableESTransforms = options.disableESTransforms === true;
  const file = _parser.parse.call(void 0, code, isJSXEnabled, isTypeScriptEnabled, isFlowEnabled);
  const tokens = file.tokens;
  const scopes = file.scopes;

  const nameManager = new (0, _NameManager2.default)(code, tokens);
  const helperManager = new (0, _HelperManager.HelperManager)(nameManager);
  const tokenProcessor = new (0, _TokenProcessor2.default)(
    code,
    tokens,
    isFlowEnabled,
    disableESTransforms,
    helperManager,
  );
  const enableLegacyTypeScriptModuleInterop = Boolean(options.enableLegacyTypeScriptModuleInterop);

  let importProcessor = null;
  if (options.transforms.includes("imports")) {
    importProcessor = new (0, _CJSImportProcessor2.default)(
      nameManager,
      tokenProcessor,
      enableLegacyTypeScriptModuleInterop,
      options,
      options.transforms.includes("typescript"),
      Boolean(options.keepUnusedImports),
      helperManager,
    );
    importProcessor.preprocessTokens();
    // We need to mark shadowed globals after processing imports so we know that the globals are,
    // but before type-only import pruning, since that relies on shadowing information.
    _identifyShadowedGlobals2.default.call(void 0, tokenProcessor, scopes, importProcessor.getGlobalNames());
    if (options.transforms.includes("typescript") && !options.keepUnusedImports) {
      importProcessor.pruneTypeOnlyImports();
    }
  } else if (options.transforms.includes("typescript") && !options.keepUnusedImports) {
    // Shadowed global detection is needed for TS implicit elision of imported names.
    _identifyShadowedGlobals2.default.call(void 0, tokenProcessor, scopes, _getTSImportedNames2.default.call(void 0, tokenProcessor));
  }
  return {tokenProcessor, scopes, nameManager, importProcessor, helperManager};
}
