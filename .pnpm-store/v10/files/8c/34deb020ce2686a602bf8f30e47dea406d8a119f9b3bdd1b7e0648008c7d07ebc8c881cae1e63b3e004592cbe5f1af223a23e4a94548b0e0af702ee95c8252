// Type definitions for axe-core
// Project: https://github.com/dequelabs/axe-core
// Definitions by: Marcy Sutton <https://github.com/marcysutton>

declare namespace axe {
  type ImpactValue = 'minor' | 'moderate' | 'serious' | 'critical' | null;

  type TagValue = string;

  type ReporterVersion = 'v1' | 'v2' | 'raw' | 'raw-env' | 'no-passes';

  type RunOnlyType = 'rule' | 'rules' | 'tag' | 'tags';

  type resultGroups = 'inapplicable' | 'passes' | 'incomplete' | 'violations';

  type AriaAttrsType =
    | 'boolean'
    | 'nmtoken'
    | 'mntokens'
    | 'idref'
    | 'idrefs'
    | 'string'
    | 'decimal'
    | 'int';

  type AriaRolesType = 'abstract' | 'widget' | 'structure' | 'landmark';

  type DpubRolesType =
    | 'section'
    | 'landmark'
    | 'link'
    | 'listitem'
    | 'img'
    | 'navigation'
    | 'note'
    | 'separator'
    | 'none'
    | 'sectionhead';

  type HtmlContentTypes =
    | 'flow'
    | 'sectioning'
    | 'heading'
    | 'phrasing'
    | 'embedded'
    | 'interactive';

  // Array of length 2 or greater
  type MultiArray<T> = [T, T, ...T[]];

  // Selectors within a frame
  type BaseSelector = string;

  type ShadowDomSelector = MultiArray<BaseSelector>;
  type CrossTreeSelector = BaseSelector | ShadowDomSelector;
  type LabelledShadowDomSelector = { fromShadowDom: ShadowDomSelector };

  // Cross-frame selectors
  type FramesSelector = Array<CrossTreeSelector | LabelledShadowDomSelector>;
  type UnlabelledFrameSelector = CrossTreeSelector[];
  type LabelledFramesSelector = { fromFrames: MultiArray<FramesSelector[0]> };
  /**
   * @deprecated Use UnlabelledFrameSelector instead
   */
  type CrossFrameSelector = UnlabelledFrameSelector;

  // Context options
  type Selector =
    | Node
    | BaseSelector
    | LabelledShadowDomSelector
    | LabelledFramesSelector;
  type SelectorList = Array<Selector | FramesSelector> | NodeList;
  type ContextObject =
    | {
        include: Selector | SelectorList;
        exclude?: Selector | SelectorList;
      }
    | {
        exclude: Selector | SelectorList;
        include?: Selector | SelectorList;
      };
  type ElementContext = Selector | SelectorList | ContextObject;

  type SerialSelector =
    | BaseSelector
    | LabelledShadowDomSelector
    | LabelledFramesSelector;
  type SerialFrameSelector = SerialSelector | FramesSelector;
  type SerialSelectorList = Array<SerialFrameSelector>;

  type SerialContextObject =
    | {
        include: SerialSelector | SerialSelectorList;
        exclude?: SerialSelector | SerialSelectorList;
      }
    | {
        exclude: SerialSelector | SerialSelectorList;
        include?: SerialSelector | SerialSelectorList;
      };

  interface FrameContextObject {
    include: UnlabelledFrameSelector[];
    exclude: UnlabelledFrameSelector[];
  }

  type RunCallback<T = AxeResults> = (error: Error, results: T) => void;

  interface TestEngine {
    name: string;
    version: string;
  }
  interface TestRunner {
    name: string;
  }
  interface TestEnvironment {
    userAgent: string;
    windowWidth: number;
    windowHeight: number;
    orientationAngle?: number;
    orientationType?: string;
  }
  interface RunOnly {
    type: RunOnlyType;
    values: TagValue[] | string[];
  }
  interface RuleObject {
    [key: string]: {
      enabled: boolean;
    };
  }
  interface RunOptions {
    runOnly?: RunOnly | TagValue[] | string[] | string;
    rules?: RuleObject;
    reporter?: ReporterVersion;
    resultTypes?: resultGroups[];
    selectors?: boolean;
    ancestry?: boolean;
    xpath?: boolean;
    absolutePaths?: boolean;
    iframes?: boolean;
    elementRef?: boolean;
    frameWaitTime?: number;
    preload?: boolean;
    performanceTimer?: boolean;
    pingWaitTime?: number;
  }
  interface AxeResults extends EnvironmentData {
    toolOptions: RunOptions;
    passes: Result[];
    violations: Result[];
    incomplete: Result[];
    inapplicable: Result[];
  }
  interface Result {
    description: string;
    help: string;
    helpUrl: string;
    id: string;
    impact?: ImpactValue;
    tags: TagValue[];
    nodes: NodeResult[];
  }
  interface NodeResult {
    html: string;
    impact?: ImpactValue;
    target: string[];
    xpath?: string[];
    ancestry?: string[];
    any: CheckResult[];
    all: CheckResult[];
    none: CheckResult[];
    failureSummary?: string;
    element?: HTMLElement;
  }
  interface CheckResult {
    id: string;
    impact: string;
    message: string;
    data: any;
    relatedNodes?: RelatedNode[];
  }
  interface RelatedNode {
    target: string[];
    html: string;
  }
  interface RuleLocale {
    [key: string]: {
      description: string;
      help: string;
    };
  }
  interface CheckMessages {
    pass: string | { [key: string]: string };
    fail: string | { [key: string]: string };
    incomplete: string | { [key: string]: string };
  }
  interface CheckLocale {
    [key: string]: CheckMessages;
  }
  interface Locale {
    lang?: string;
    rules?: RuleLocale;
    checks?: CheckLocale;
  }
  interface AriaAttrs {
    type: AriaAttrsType;
    values?: string[];
    allowEmpty?: boolean;
    global?: boolean;
    unsupported?: boolean;
  }
  interface AriaRoles {
    type: AriaRolesType | DpubRolesType;
    requiredContext?: string[];
    requiredOwned?: string[];
    requiredAttrs?: string[];
    allowedAttrs?: string[];
    nameFromContent?: boolean;
    unsupported?: boolean;
  }
  interface HtmlElmsVariant {
    contentTypes?: HtmlContentTypes[];
    allowedRoles: boolean | string[];
    noAriaAttrs?: boolean;
    shadowRoot?: boolean;
    implicitAttrs?: { [key: string]: string };
    namingMethods?: string[];
  }
  interface HtmlElms extends HtmlElmsVariant {
    variant?: { [key: string]: HtmlElmsVariant };
  }
  interface Standards {
    ariaAttrs?: { [key: string]: AriaAttrs };
    ariaRoles?: { [key: string]: AriaRoles };
    htmlElms?: { [key: string]: HtmlElms };
    cssColors?: { [key: string]: number[] };
  }
  interface Spec {
    branding?: string | Branding;
    reporter?: ReporterVersion | string | AxeReporter;
    checks?: Check[];
    rules?: Rule[];
    standards?: Standards;
    locale?: Locale;
    disableOtherRules?: boolean;
    axeVersion?: string;
    noHtml?: boolean;
    allowedOrigins?: string[];
    // Deprecated - do not use.
    ver?: string;
  }
  /**
   * @deprecated Use branding: string instead to set the application key in help URLs
   */
  interface Branding {
    brand?: string;
    application?: string;
  }
  interface Check {
    id: string;
    evaluate?: Function | string;
    after?: Function | string;
    options?: any;
    matches?: string;
    enabled?: boolean;
    metadata?: {
      impact?: ImpactValue;
      messages?: CheckMessages;
    };
  }
  interface Rule {
    id: string;
    selector?: string;
    impact?: ImpactValue;
    excludeHidden?: boolean;
    enabled?: boolean;
    pageLevel?: boolean;
    any?: string[];
    all?: string[];
    none?: string[];
    tags?: string[];
    matches?: string;
    reviewOnFail?: boolean;
    metadata?: Omit<RuleMetadata, 'ruleId'>;
  }
  interface AxePlugin {
    id: string;
    run(...args: any[]): any;
    commands: {
      id: string;
      callback(...args: any[]): void;
    }[];
    cleanup?(callback: Function): void;
  }
  interface RuleMetadata {
    ruleId: string;
    description: string;
    help: string;
    helpUrl: string;
    tags: string[];
    actIds?: string[];
  }
  interface SerialDqElement {
    source: string;
    nodeIndexes: number[];
    selector: UnlabelledFrameSelector;
    xpath: string[];
    ancestry: UnlabelledFrameSelector;
  }
  interface PartialRuleResult {
    id: string;
    result: 'inapplicable';
    pageLevel: boolean;
    impact: null;
    nodes: Array<Record<string, unknown>>;
  }
  interface PartialResult {
    frames: SerialDqElement[];
    results: PartialRuleResult[];
    environmentData?: EnvironmentData;
  }
  type PartialResults = Array<PartialResult | null>;
  interface FrameContext {
    frameSelector: CrossTreeSelector;
    frameContext: FrameContextObject;
  }

  interface RawNodeResult<T extends 'passed' | 'failed' | 'incomplete'> {
    any: CheckResult[];
    all: CheckResult[];
    none: CheckResult[];
    impact: ImpactValue | null;
    result: T;
  }

  interface RawResult extends Omit<Result, 'nodes'> {
    inapplicable: [];
    passes: RawNodeResult<'passed'>[];
    incomplete: RawNodeResult<'incomplete'>[];
    violations: RawNodeResult<'failed'>[];
    pageLevel: boolean;
    result: 'failed' | 'passed' | 'incomplete' | 'inapplicable';
  }

  type AxeReporter<T = unknown> = (
    rawResults: RawResult[],
    option: RunOptions,
    callback: (report: T) => void
  ) => void;

  interface VirtualNode {
    actualNode?: Node;
    shadowId?: string;
    children?: VirtualNode[];
    parent?: VirtualNode;
    attr(attr: string): string | null;
    hasAttr(attr: string): boolean;
    props: { [key: string]: unknown };
  }

  interface Utils {
    getFrameContexts: (
      context?: ElementContext,
      options?: RunOptions
    ) => FrameContext[];
    shadowSelect: (selector: CrossTreeSelector) => Element | null;
    shadowSelectAll: (selector: CrossTreeSelector) => Element[];
    getStandards(): Required<Standards>;
  }

  interface EnvironmentData {
    testEngine: TestEngine;
    testRunner: TestRunner;
    testEnvironment: TestEnvironment;
    url: string;
    timestamp: string;
  }

  let version: string;
  let plugins: any;
  let utils: Utils;

  /**
   * Source string to use as an injected script in Selenium
   */
  let source: string;

  /**
   * Object for axe Results
   */
  var AxeResults: AxeResults;

  /**
   * Runs a number of rules against the provided HTML page and returns the resulting issue list
   *
   * @param   {ElementContext} context  Optional The `Context` specification object @see Context
   * @param   {RunOptions}     options  Optional Options passed into rules or checks, temporarily modifying them.
   * @param   {RunCallback}    callback Optional The function to invoke when analysis is complete.
   * @returns {Promise<AxeResults>|void} If the callback was not defined, axe will return a Promise.
   */
  function run<T = AxeResults>(context?: ElementContext): Promise<T>;
  function run<T = AxeResults>(options: RunOptions): Promise<T>;
  function run<T = AxeResults>(
    callback: (error: Error, results: T) => void
  ): void;
  function run<T = AxeResults>(
    context: ElementContext,
    callback: RunCallback<T>
  ): void;
  function run<T = AxeResults>(
    options: RunOptions,
    callback: RunCallback<T>
  ): void;
  function run<T = AxeResults>(
    context: ElementContext,
    options: RunOptions
  ): Promise<T>;
  function run<T = AxeResults>(
    context: ElementContext,
    options: RunOptions,
    callback: RunCallback<T>
  ): void;

  /**
   * Method for configuring the data format used by axe. Helpful for adding new
   * rules, which must be registered with the library to execute.
   * @param  {Spec}       Spec Object with valid `branding`, `reporter`, `checks` and `rules` data
   */
  function configure(spec: Spec): void;

  /**
   * Run axe in the current window only
   * @param   {ElementContext} context  Optional The `Context` specification object @see Context
   * @param   {RunOptions}     options  Optional Options passed into rules or checks, temporarily modifying them.
   * @returns {Promise<PartialResult>}  Partial result, for use in axe.finishRun.
   */
  function runPartial(
    context: ElementContext,
    options: RunOptions
  ): Promise<PartialResult>;

  /**
   * Create a report from axe.runPartial results
   * @param   {PartialResult[]}     partialResults  Results from axe.runPartial, calls in different frames on the page.
   * @param   {RunOptions}     options  Optional Options passed into rules or checks, temporarily modifying them.
   */
  function finishRun(
    partialResults: PartialResults,
    options: RunOptions
  ): Promise<AxeResults>;

  /**
   * Searches and returns rules that contain a tag in the list of tags.
   * @param  {Array}  tags  Optional array of tags
   * @return {Array}  Array of rules
   */
  function getRules(tags?: string[]): RuleMetadata[];

  /**
   * Restores the default axe configuration
   */
  function reset(): void;

  /**
   * Function to register a plugin configuration in document and its subframes
   * @param  {Object}    plugin    A plugin configuration object
   */
  function registerPlugin(plugin: AxePlugin): void;

  /**
   * Function to clean up plugin configuration in document and its subframes
   */
  function cleanup(): void;

  /**
   * Set up alternative frame communication
   */
  function frameMessenger(frameMessenger: FrameMessenger): void;

  /**
   * Setup axe-core so axe.common functions can work properly.
   */
  function setup(node?: Element | Document): VirtualNode;

  /**
   * Clean up axe-core tree and caches. `axe.run` will call this function at the end of the run so there's no need to call it yourself afterwards.
   */
  function teardown(): void;

  /**
   * Check if a reporter is registered
   */
  function hasReporter(reporterName: string): boolean;

  /**
   * Get a reporter based the name it is registered with
   */
  function getReporter<T>(reporterName: string): AxeReporter<T>;

  /**
   * Register a new reporter, optionally setting it as the default
   */
  function addReporter<T>(
    reporterName: string,
    reporter: AxeReporter<T>,
    isDefault?: boolean
  ): void;

  // axe.frameMessenger
  type FrameMessenger = {
    open: (topicHandler: TopicHandler) => Close | void;
    post: (
      frameWindow: Window,
      data: TopicData,
      replyHandler: ReplyHandler
    ) => boolean | void;
  };
  type Close = Function;
  type TopicHandler = (data: TopicData, responder: Responder) => void;
  type ReplyHandler = (
    message: any | Error,
    keepalive: boolean,
    responder: Responder
  ) => void;
  type Responder = (
    message: any | Error,
    keepalive?: boolean,
    replyHandler?: ReplyHandler
  ) => void;
  type TopicData = { topic: string } & ReplyData;
  type ReplyData = { channelId: string; message: any; keepalive: boolean };
}

export = axe;
