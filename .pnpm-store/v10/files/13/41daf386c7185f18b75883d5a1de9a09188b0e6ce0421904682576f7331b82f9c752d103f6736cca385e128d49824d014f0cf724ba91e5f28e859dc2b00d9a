"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "BodyComponent", {
  enumerable: true,
  get: function () {
    return _createComponent.BodyComponent;
  }
});
Object.defineProperty(exports, "HeadComponent", {
  enumerable: true,
  get: function () {
    return _createComponent.HeadComponent;
  }
});
Object.defineProperty(exports, "assignComponents", {
  enumerable: true,
  get: function () {
    return _components.assignComponents;
  }
});
Object.defineProperty(exports, "components", {
  enumerable: true,
  get: function () {
    return _components.default;
  }
});
exports.default = mjml2html;
Object.defineProperty(exports, "handleMjmlConfig", {
  enumerable: true,
  get: function () {
    return _mjmlconfig.default;
  }
});
Object.defineProperty(exports, "initComponent", {
  enumerable: true,
  get: function () {
    return _createComponent.initComponent;
  }
});
Object.defineProperty(exports, "initializeType", {
  enumerable: true,
  get: function () {
    return _type.initializeType;
  }
});
Object.defineProperty(exports, "makeLowerBreakpoint", {
  enumerable: true,
  get: function () {
    return _makeLowerBreakpoint.default;
  }
});
Object.defineProperty(exports, "registerComponent", {
  enumerable: true,
  get: function () {
    return _components.registerComponent;
  }
});
Object.defineProperty(exports, "suffixCssClasses", {
  enumerable: true,
  get: function () {
    return _suffixCssClasses.default;
  }
});
var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));
var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));
var _callSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/callSuper"));
var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));
var _wrapNativeSuper2 = _interopRequireDefault(require("@babel/runtime/helpers/wrapNativeSuper"));
var _isEmpty2 = _interopRequireDefault(require("lodash/isEmpty"));
var _each2 = _interopRequireDefault(require("lodash/each"));
var _isObject2 = _interopRequireDefault(require("lodash/isObject"));
var _reduce2 = _interopRequireDefault(require("lodash/reduce"));
var _omit2 = _interopRequireDefault(require("lodash/omit"));
var _map2 = _interopRequireDefault(require("lodash/map"));
var _identity2 = _interopRequireDefault(require("lodash/identity"));
var _get2 = _interopRequireDefault(require("lodash/get"));
var _filter2 = _interopRequireDefault(require("lodash/filter"));
var _find2 = _interopRequireDefault(require("lodash/find"));
var _path = _interopRequireDefault(require("path"));
var _juice = _interopRequireDefault(require("juice"));
var _jsBeautify = require("js-beautify");
var _htmlMinifier = require("html-minifier");
var _cheerio = require("cheerio");
var _mjmlParserXml = _interopRequireDefault(require("mjml-parser-xml"));
var _mjmlValidator = _interopRequireWildcard(require("mjml-validator"));
var _mjmlMigrate = require("mjml-migrate");
var _createComponent = require("./createComponent");
var _components = _interopRequireWildcard(require("./components"));
var _makeLowerBreakpoint = _interopRequireDefault(require("./helpers/makeLowerBreakpoint"));
var _suffixCssClasses = _interopRequireDefault(require("./helpers/suffixCssClasses"));
var _mergeOutlookConditionnals = _interopRequireDefault(require("./helpers/mergeOutlookConditionnals"));
var _minifyOutlookConditionnals = _interopRequireDefault(require("./helpers/minifyOutlookConditionnals"));
var _skeleton = _interopRequireDefault(require("./helpers/skeleton"));
var _type = require("./types/type");
var _mjmlconfig = _interopRequireWildcard(require("./helpers/mjmlconfig"));
const isNode = require('detect-node');
let ValidationError = /*#__PURE__*/function (_Error) {
  (0, _inherits2.default)(ValidationError, _Error);
  function ValidationError(message, errors) {
    var _this;
    (0, _classCallCheck2.default)(this, ValidationError);
    _this = (0, _callSuper2.default)(this, ValidationError, [message]);
    _this.errors = errors;
    return _this;
  }
  return (0, _createClass2.default)(ValidationError);
}( /*#__PURE__*/(0, _wrapNativeSuper2.default)(Error));
function mjml2html(mjml, options = {}) {
  let content = '';
  let errors = [];
  if (isNode && typeof options.skeleton === 'string') {
    /* eslint-disable global-require */
    /* eslint-disable import/no-dynamic-require */
    options.skeleton = require(options.skeleton.charAt(0) === '.' ? _path.default.resolve(process.cwd(), options.skeleton) : options.skeleton);
    /* eslint-enable global-require */
    /* eslint-enable import/no-dynamic-require */
  }
  let packages = {};
  let confOptions = {};
  let mjmlConfigOptions = {};
  let confPreprocessors = [];
  let error = null;
  let componentRootPath = null;
  if (isNode && options.useMjmlConfigOptions || options.mjmlConfigPath) {
    const mjmlConfigContent = (0, _mjmlconfig.readMjmlConfig)(options.mjmlConfigPath);
    ({
      mjmlConfig: {
        packages,
        options: confOptions,
        preprocessors: confPreprocessors
      },
      componentRootPath,
      error
    } = mjmlConfigContent);
    if (options.useMjmlConfigOptions) {
      mjmlConfigOptions = confOptions;
    }
  }

  // if mjmlConfigPath is specified then we need to register components it on each call
  if (isNode && !error && options.mjmlConfigPath) {
    (0, _mjmlconfig.handleMjmlConfigComponents)(packages, componentRootPath, _components.registerComponent);
  }
  const {
    beautify = false,
    fonts = {
      'Open Sans': 'https://fonts.googleapis.com/css?family=Open+Sans:300,400,500,700',
      'Droid Sans': 'https://fonts.googleapis.com/css?family=Droid+Sans:300,400,500,700',
      Lato: 'https://fonts.googleapis.com/css?family=Lato:300,400,500,700',
      Roboto: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700',
      Ubuntu: 'https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700'
    },
    keepComments,
    minify = false,
    minifyOptions = {},
    ignoreIncludes = false,
    juiceOptions = {},
    juicePreserveTags = null,
    skeleton = _skeleton.default,
    validationLevel = 'soft',
    filePath = '.',
    actualPath = '.',
    noMigrateWarn = false,
    preprocessors,
    presets = [],
    printerSupport = false
  } = {
    ...mjmlConfigOptions,
    ...options,
    preprocessors: options.preprocessors ? [...confPreprocessors, ...options.preprocessors] : confPreprocessors
  };
  const components = {
    ..._components.default
  };
  const dependencies = (0, _mjmlValidator.assignDependencies)({}, _mjmlValidator.dependencies);
  for (const preset of presets) {
    (0, _components.assignComponents)(components, preset.components);
    (0, _mjmlValidator.assignDependencies)(dependencies, preset.dependencies);
  }
  if (typeof mjml === 'string') {
    mjml = (0, _mjmlParserXml.default)(mjml, {
      keepComments,
      components,
      filePath,
      actualPath,
      preprocessors,
      ignoreIncludes
    });
  }
  mjml = (0, _mjmlMigrate.handleMjml3)(mjml, {
    noMigrateWarn
  });
  const globalData = {
    backgroundColor: '',
    beforeDoctype: '',
    breakpoint: '480px',
    classes: {},
    classesDefault: {},
    defaultAttributes: {},
    htmlAttributes: {},
    fonts,
    inlineStyle: [],
    headStyle: {},
    componentsHeadStyle: [],
    headRaw: [],
    mediaQueries: {},
    preview: '',
    style: [],
    title: '',
    forceOWADesktop: (0, _get2.default)(mjml, 'attributes.owa', 'mobile') === 'desktop',
    lang: (0, _get2.default)(mjml, 'attributes.lang') || 'und',
    dir: (0, _get2.default)(mjml, 'attributes.dir') || 'auto'
  };
  const validatorOptions = {
    components,
    dependencies,
    initializeType: _type.initializeType
  };
  switch (validationLevel) {
    case 'skip':
      break;
    case 'strict':
      errors = (0, _mjmlValidator.default)(mjml, validatorOptions);
      if (errors.length > 0) {
        throw new ValidationError(`ValidationError: \n ${errors.map(e => e.formattedMessage).join('\n')}`, errors);
      }
      break;
    case 'soft':
    default:
      errors = (0, _mjmlValidator.default)(mjml, validatorOptions);
      break;
  }
  const mjBody = (0, _find2.default)(mjml.children, {
    tagName: 'mj-body'
  });
  const mjHead = (0, _find2.default)(mjml.children, {
    tagName: 'mj-head'
  });
  const mjOutsideRaws = (0, _filter2.default)(mjml.children, {
    tagName: 'mj-raw'
  });
  const processing = (node, context, parseMJML = _identity2.default) => {
    if (!node) {
      return;
    }
    const component = (0, _createComponent.initComponent)({
      name: node.tagName,
      initialDatas: {
        ...parseMJML(node),
        context
      }
    });
    if (component !== null) {
      if ('handler' in component) {
        return component.handler(); // eslint-disable-line consistent-return
      }
      if ('render' in component) {
        return component.render(); // eslint-disable-line consistent-return
      }
    }
  };
  const applyAttributes = mjml => {
    const parse = (mjml, parentMjClass = '') => {
      const {
        attributes,
        tagName,
        children
      } = mjml;
      const classes = (0, _get2.default)(mjml.attributes, 'mj-class', '').split(' ');
      const attributesClasses = (0, _reduce2.default)(classes, (acc, value) => {
        const mjClassValues = globalData.classes[value];
        let multipleClasses = {};
        if (acc['css-class'] && (0, _get2.default)(mjClassValues, 'css-class')) {
          multipleClasses = {
            'css-class': `${acc['css-class']} ${mjClassValues['css-class']}`
          };
        }
        return {
          ...acc,
          ...mjClassValues,
          ...multipleClasses
        };
      }, {});
      const defaultAttributesForClasses = (0, _reduce2.default)(parentMjClass.split(' '), (acc, value) => ({
        ...acc,
        ...(0, _get2.default)(globalData.classesDefault, `${value}.${tagName}`)
      }), {});
      const nextParentMjClass = (0, _get2.default)(attributes, 'mj-class', parentMjClass);
      return {
        ...mjml,
        attributes: {
          ...globalData.defaultAttributes[tagName],
          ...attributesClasses,
          ...defaultAttributesForClasses,
          ...(0, _omit2.default)(attributes, ['mj-class'])
        },
        globalAttributes: {
          ...globalData.defaultAttributes['mj-all']
        },
        children: (0, _map2.default)(children, mjml => parse(mjml, nextParentMjClass))
      };
    };
    return parse(mjml);
  };
  const bodyHelpers = {
    components,
    globalData,
    addMediaQuery(className, {
      parsedWidth,
      unit
    }) {
      globalData.mediaQueries[className] = `{ width:${parsedWidth}${unit} !important; max-width: ${parsedWidth}${unit}; }`;
    },
    addHeadStyle(identifier, headStyle) {
      globalData.headStyle[identifier] = headStyle;
    },
    addComponentHeadSyle(headStyle) {
      globalData.componentsHeadStyle.push(headStyle);
    },
    setBackgroundColor: color => {
      globalData.backgroundColor = color;
    },
    processing: (node, context) => processing(node, context, applyAttributes)
  };
  const headHelpers = {
    components,
    globalData,
    add(attr, ...params) {
      if (Array.isArray(globalData[attr])) {
        globalData[attr].push(...params);
      } else if (Object.prototype.hasOwnProperty.call(globalData, attr)) {
        if (params.length > 1) {
          if ((0, _isObject2.default)(globalData[attr][params[0]])) {
            globalData[attr][params[0]] = {
              ...globalData[attr][params[0]],
              ...params[1]
            };
          } else {
            // eslint-disable-next-line prefer-destructuring
            globalData[attr][params[0]] = params[1];
          }
        } else {
          // eslint-disable-next-line prefer-destructuring
          globalData[attr] = params[0];
        }
      } else {
        throw Error(`An mj-head element add an unkown head attribute : ${attr} with params ${Array.isArray(params) ? params.join('') : params}`);
      }
    }
  };
  globalData.headRaw = processing(mjHead, headHelpers);
  content = processing(mjBody, bodyHelpers, applyAttributes);
  if (!content) {
    throw new Error('Malformed MJML. Check that your structure is correct and enclosed in <mjml> tags.');
  }
  content = (0, _minifyOutlookConditionnals.default)(content);
  if (mjOutsideRaws.length) {
    const toAddBeforeDoctype = mjOutsideRaws.filter(elt => elt.attributes.position && elt.attributes.position === 'file-start');
    if (toAddBeforeDoctype.length) {
      globalData.beforeDoctype = toAddBeforeDoctype.map(elt => elt.content).join('\n');
    }
  }
  if (!(0, _isEmpty2.default)(globalData.htmlAttributes)) {
    const $ = (0, _cheerio.load)(content, {
      xmlMode: true,
      // otherwise it may move contents that aren't in any tag
      decodeEntities: false // won't escape special characters
    });
    (0, _each2.default)(globalData.htmlAttributes, (data, selector) => {
      (0, _each2.default)(data, (value, attrName) => {
        $(selector).each(function getAttr() {
          $(this).attr(attrName, value || '');
        });
      });
    });
    content = $.root().html();
  }
  content = skeleton({
    content,
    ...globalData,
    printerSupport
  });
  if (globalData.inlineStyle.length > 0) {
    if (juicePreserveTags) {
      (0, _each2.default)(juicePreserveTags, (val, key) => {
        _juice.default.codeBlocks[key] = val;
      });
    }
    content = (0, _juice.default)(content, {
      applyStyleTags: false,
      extraCss: globalData.inlineStyle.join(''),
      insertPreservedExtraCss: false,
      removeStyleTags: false,
      ...juiceOptions
    });
  }
  content = (0, _mergeOutlookConditionnals.default)(content);
  if (beautify) {
    // eslint-disable-next-line no-console
    console.warn('"beautify" option is deprecated in mjml-core and only available in mjml cli.');
    content = (0, _jsBeautify.html)(content, {
      indent_size: 2,
      wrap_attributes_indent_size: 2,
      max_preserve_newline: 0,
      preserve_newlines: false
    });
  }
  if (minify) {
    // eslint-disable-next-line no-console
    console.warn('"minify" option is deprecated in mjml-core and only available in mjml cli.');
    content = (0, _htmlMinifier.minify)(content, {
      collapseWhitespace: true,
      minifyCSS: false,
      caseSensitive: true,
      removeEmptyAttributes: true,
      ...minifyOptions
    });
  }
  return {
    html: content,
    json: mjml,
    errors
  };
}
if (isNode) {
  (0, _mjmlconfig.default)(process.cwd(), _components.registerComponent);
}