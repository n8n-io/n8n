import type {
  Plugin as PluginDef,
  PluginInfo,
  XastElement,
} from '../lib/types';

type DefaultPlugins = {
  cleanupAttrs: {
    newlines?: boolean;
    trim?: boolean;
    spaces?: boolean;
  };
  cleanupEnableBackground: void;
  cleanupIds: {
    remove?: boolean;
    minify?: boolean;
    preserve?: string[];
    preservePrefixes?: string[];
    force?: boolean;
  };
  cleanupNumericValues: {
    floatPrecision?: number;
    leadingZero?: boolean;
    defaultPx?: boolean;
    convertToPx?: boolean;
  };
  collapseGroups: void;
  convertColors: {
    currentColor?: boolean | string | RegExp;
    names2hex?: boolean;
    rgb2hex?: boolean;
    shorthex?: boolean;
    shortname?: boolean;
  };
  convertEllipseToCircle: void;
  convertPathData: {
    applyTransforms?: boolean;
    applyTransformsStroked?: boolean;
    makeArcs?: {
      threshold: number;
      tolerance: number;
    };
    straightCurves?: boolean;
    convertToQ?: boolean;
    lineShorthands?: boolean;
    convertToZ?: boolean;
    curveSmoothShorthands?: boolean;
    floatPrecision?: number | false;
    transformPrecision?: number;
    smartArcRounding?: boolean;
    removeUseless?: boolean;
    collapseRepeated?: boolean;
    utilizeAbsolute?: boolean;
    leadingZero?: boolean;
    negativeExtraSpace?: boolean;
    noSpaceAfterFlags?: boolean;
    forceAbsolutePath?: boolean;
  };
  convertShapeToPath: {
    convertArcs?: boolean;
    floatPrecision?: number;
  };
  convertTransform: {
    convertToShorts?: boolean;
    degPrecision?: number;
    floatPrecision?: number;
    transformPrecision?: number;
    matrixToTransform?: boolean;
    shortTranslate?: boolean;
    shortScale?: boolean;
    shortRotate?: boolean;
    removeUseless?: boolean;
    collapseIntoOne?: boolean;
    leadingZero?: boolean;
    negativeExtraSpace?: boolean;
  };
  mergeStyles: void;
  inlineStyles: {
    /**
     * Inlines selectors that match once only.
     *
     * @default true
     */
    onlyMatchedOnce?: boolean;
    /**
     * Clean up matched selectors. Unused selects are left as-is.
     *
     * @default true
     */
    removeMatchedSelectors?: boolean;
    /**
     * Media queries to use. An empty string indicates all selectors outside of
     * media queries.
     */
    useMqs?: string[];
    /**
     * Pseudo-classes and elements to use. An empty string indicates all
     * all non-pseudo-classes and elements.
     */
    usePseudos?: string[];
  };
  mergePaths: {
    force?: boolean;
    floatPrecision?: number;
    noSpaceAfterFlags?: boolean;
  };

  minifyStyles: {
    /**
     * Disable or enable a structure optimisations.
     * @default true
     */
    restructure?: boolean;
    /**
     * Enables merging of @media rules with the same media query split by other rules.
     * The optimisation is unsafe in general, but should work fine in most cases. Use it on your own risk.
     * @default false
     */
    forceMediaMerge?: boolean;
    /**
     * Specify what comments to leave:
     * - 'exclamation' or true – leave all exclamation comments
     * - 'first-exclamation' – remove every comment except first one
     * - false – remove all comments
     * @default true
     */
    comments?: string | boolean;
    /**
     * Advanced optimizations
     */
    usage?:
      | boolean
      | {
          force?: boolean;
          ids?: boolean;
          classes?: boolean;
          tags?: boolean;
        };
  };

  moveElemsAttrsToGroup: void;
  moveGroupAttrsToElems: void;
  removeComments: {
    preservePatterns: Array<RegExp | string> | false;
  };
  removeDesc: {
    removeAny?: boolean;
  };
  removeDoctype: void;
  removeEditorsNSData: {
    additionalNamespaces?: string[];
  };
  removeEmptyAttrs: void;
  removeEmptyContainers: void;
  removeEmptyText: {
    text?: boolean;
    tspan?: boolean;
    tref?: boolean;
  };
  removeHiddenElems: {
    isHidden?: boolean;
    displayNone?: boolean;
    opacity0?: boolean;
    circleR0?: boolean;
    ellipseRX0?: boolean;
    ellipseRY0?: boolean;
    rectWidth0?: boolean;
    rectHeight0?: boolean;
    patternWidth0?: boolean;
    patternHeight0?: boolean;
    imageWidth0?: boolean;
    imageHeight0?: boolean;
    pathEmptyD?: boolean;
    polylineEmptyPoints?: boolean;
    polygonEmptyPoints?: boolean;
  };
  removeMetadata: void;
  removeNonInheritableGroupAttrs: void;
  removeTitle: void;
  removeUnknownsAndDefaults: {
    unknownContent?: boolean;
    unknownAttrs?: boolean;
    defaultAttrs?: boolean;
    /**
     * If to remove XML declarations that are assigned their default value. XML
     * declarations are the properties in the `<?xml … ?>` block at the top of
     * the document.
     */
    defaultMarkupDeclarations?: boolean;
    uselessOverrides?: boolean;
    keepDataAttrs?: boolean;
    keepAriaAttrs?: boolean;
    keepRoleAttr?: boolean;
  };
  removeUnusedNS: void;
  removeUselessDefs: void;
  removeUselessStrokeAndFill: {
    stroke?: boolean;
    fill?: boolean;
    removeNone?: boolean;
  };
  removeViewBox: void;
  removeXMLProcInst: void;
  sortAttrs: {
    order?: string[];
    xmlnsOrder?: 'front' | 'alphabetical';
  };
  sortDefsChildren: void;
};

type PresetDefaultOverrides = {
  [Name in keyof DefaultPlugins]?: DefaultPlugins[Name] | false;
};

export type BuiltinsWithOptionalParams = DefaultPlugins & {
  'preset-default': {
    floatPrecision?: number;
    /**
     * All default plugins can be customized or disabled here
     * for example
     * {
     *   sortAttrs: { xmlnsOrder: "alphabetical" },
     *   cleanupAttrs: false,
     * }
     */
    overrides?: PresetDefaultOverrides;
  };
  cleanupListOfValues: {
    floatPrecision?: number;
    leadingZero?: boolean;
    defaultPx?: boolean;
    convertToPx?: boolean;
  };
  convertOneStopGradients: void;
  convertStyleToAttrs: {
    keepImportant?: boolean;
  };
  prefixIds: {
    prefix?:
      | boolean
      | string
      | ((node: XastElement, info: PluginInfo) => string);
    delim?: string;
    prefixIds?: boolean;
    prefixClassNames?: boolean;
  };
  removeDimensions: void;
  removeOffCanvasPaths: void;
  removeRasterImages: void;
  removeScriptElement: void;
  removeStyleElement: void;
  removeXlink: {
    /**
     * By default this plugin ignores legacy elements that were deprecated or
     * removed in SVG 2. Set to true to force performing operations on those
     * too.
     *
     * @default false
     */
    includeLegacy: boolean;
  };
  removeXMLNS: void;
  reusePaths: void;
};

export type BuiltinsWithRequiredParams = {
  addAttributesToSVGElement: {
    attribute?: string | Record<string, null | string>;
    attributes?: Array<string | Record<string, null | string>>;
  };
  addClassesToSVGElement: {
    className?: string;
    classNames?: string[];
  };
  removeAttributesBySelector: any;
  removeAttrs: {
    elemSeparator?: string;
    preserveCurrentColor?: boolean;
    attrs: string | string[];
  };
  removeElementsByAttr: {
    id?: string | string[];
    class?: string | string[];
  };
};

type PluginsParams = BuiltinsWithOptionalParams & BuiltinsWithRequiredParams;

export type Plugin<Name extends keyof PluginsParams> = PluginDef<
  PluginsParams[Name]
>;
