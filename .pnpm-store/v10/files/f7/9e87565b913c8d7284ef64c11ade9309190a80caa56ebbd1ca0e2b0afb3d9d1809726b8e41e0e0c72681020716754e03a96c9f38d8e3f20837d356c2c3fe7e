"use strict";
var Y = Object.create;
var p = Object.defineProperty;
var H = Object.getOwnPropertyDescriptor;
var K = Object.getOwnPropertyNames;
var U = Object.getPrototypeOf, X = Object.prototype.hasOwnProperty;
var r = (t, o) => p(t, "name", { value: o, configurable: !0 });
var B = (t, o) => () => (o || t((o = { exports: {} }).exports, o), o.exports), J = (t, o) => {
  for (var e in o)
    p(t, e, { get: o[e], enumerable: !0 });
}, D = (t, o, e, i) => {
  if (o && typeof o == "object" || typeof o == "function")
    for (let u of K(o))
      !X.call(t, u) && u !== e && p(t, u, { get: () => o[u], enumerable: !(i = H(o, u)) || i.enumerable });
  return t;
};
var z = (t, o, e) => (e = t != null ? Y(U(t)) : {}, D(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  o || !t || !t.__esModule ? p(e, "default", { value: t, enumerable: !0 }) : e,
  t
)), q = (t) => D(p({}, "__esModule", { value: !0 }), t);

// ../node_modules/ts-dedent/dist/index.js
var M = B((E) => {
  "use strict";
  Object.defineProperty(E, "__esModule", { value: !0 });
  E.dedent = void 0;
  function j(t) {
    for (var o = [], e = 1; e < arguments.length; e++)
      o[e - 1] = arguments[e];
    var i = Array.from(typeof t == "string" ? [t] : t);
    i[i.length - 1] = i[i.length - 1].replace(/\r?\n([\t ]*)$/, "");
    var u = i.reduce(function(c, m) {
      var g = m.match(/\n([\t ]+|(?!\s).)/g);
      return g ? c.concat(g.map(function(f) {
        var l, y;
        return (y = (l = f.match(/[\t ]/g)) === null || l === void 0 ? void 0 : l.length) !== null && y !== void 0 ? y : 0;
      })) : c;
    }, []);
    if (u.length) {
      var h = new RegExp(`
[	 ]{` + Math.min.apply(Math, u) + "}", "g");
      i = i.map(function(c) {
        return c.replace(h, `
`);
      });
    }
    i[0] = i[0].replace(/^\r?\n/, "");
    var d = i[0];
    return o.forEach(function(c, m) {
      var g = d.match(/(?:^|\n)( *)$/), f = g ? g[1] : "", l = c;
      typeof c == "string" && c.includes(`
`) && (l = String(c).split(`
`).map(function(y, G) {
        return G === 0 ? y : "" + f + y;
      }).join(`
`)), d += l + i[m + 1];
    }), d;
  }
  r(j, "dedent");
  E.dedent = j;
  E.default = j;
});

// src/preview-errors.ts
var Q = {};
J(Q, {
  CalledExtractOnStoreError: () => I,
  CalledPreviewMethodBeforeInitializationError: () => P,
  Category: () => F,
  EmptyIndexError: () => w,
  ImplicitActionsDuringRendering: () => b,
  MdxFileWithNoCsfReferencesError: () => S,
  MissingRenderToCanvasError: () => _,
  MissingStoryAfterHmrError: () => R,
  MissingStoryFromCsfFileError: () => k,
  MountMustBeDestructuredError: () => N,
  NextJsSharpError: () => W,
  NextjsRouterMocksNotAvailable: () => O,
  NoRenderFunctionError: () => V,
  NoStoryMatchError: () => T,
  NoStoryMountedError: () => A,
  StoryIndexFetchError: () => x,
  StoryStoreAccessedBeforeInitializationError: () => v,
  UnknownArgTypesError: () => $,
  UnsupportedViewportDimensionError: () => C
});
module.exports = q(Q);
var a = z(M(), 1);

// src/storybook-error.ts
function L({
  code: t,
  category: o
}) {
  let e = String(t).padStart(4, "0");
  return `SB_${o}_${e}`;
}
r(L, "parseErrorCode");
var s = class t extends Error {
  constructor(e) {
    super(t.getFullMessage(e));
    /**
     * Data associated with the error. Used to provide additional information in the error message or
     * to be passed to telemetry.
     */
    this.data = {};
    /** Flag used to easily determine if the error originates from Storybook. */
    this.fromStorybook = !0;
    this.category = e.category, this.documentation = e.documentation ?? !1, this.code = e.code;
  }
  static {
    r(this, "StorybookError");
  }
  get fullErrorCode() {
    return L({ code: this.code, category: this.category });
  }
  /** Overrides the default `Error.name` property in the format: SB_<CATEGORY>_<CODE>. */
  get name() {
    let e = this.constructor.name;
    return `${this.fullErrorCode} (${e})`;
  }
  /** Generates the error message along with additional documentation link (if applicable). */
  static getFullMessage({
    documentation: e,
    code: i,
    category: u,
    message: h
  }) {
    let d;
    return e === !0 ? d = `https://storybook.js.org/error/${L({ code: i, category: u })}` : typeof e == "string" ? d = e : Array.isArray(e) &&
    (d = `
${e.map((c) => `	- ${c}`).join(`
`)}`), `${h}${d != null ? `

More info: ${d}
` : ""}`;
  }
};

// src/preview-errors.ts
var F = /* @__PURE__ */ ((n) => (n.BLOCKS = "BLOCKS", n.DOCS_TOOLS = "DOCS-TOOLS", n.PREVIEW_CLIENT_LOGGER = "PREVIEW_CLIENT-LOGGER", n.PREVIEW_CHANNELS =
"PREVIEW_CHANNELS", n.PREVIEW_CORE_EVENTS = "PREVIEW_CORE-EVENTS", n.PREVIEW_INSTRUMENTER = "PREVIEW_INSTRUMENTER", n.PREVIEW_API = "PREVIEW\
_API", n.PREVIEW_REACT_DOM_SHIM = "PREVIEW_REACT-DOM-SHIM", n.PREVIEW_ROUTER = "PREVIEW_ROUTER", n.PREVIEW_THEMING = "PREVIEW_THEMING", n.RENDERER_HTML =
"RENDERER_HTML", n.RENDERER_PREACT = "RENDERER_PREACT", n.RENDERER_REACT = "RENDERER_REACT", n.RENDERER_SERVER = "RENDERER_SERVER", n.RENDERER_SVELTE =
"RENDERER_SVELTE", n.RENDERER_VUE = "RENDERER_VUE", n.RENDERER_VUE3 = "RENDERER_VUE3", n.RENDERER_WEB_COMPONENTS = "RENDERER_WEB-COMPONENTS",
n.FRAMEWORK_NEXTJS = "FRAMEWORK_NEXTJS", n.ADDON_VITEST = "ADDON_VITEST", n))(F || {}), R = class extends s {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 1,
      message: a.dedent`
        Couldn't find story matching id '${e.storyId}' after HMR.
        - Did you just rename a story?
        - Did you remove it from your CSF file?
        - Are you sure a story with the id '${e.storyId}' exists?
        - Please check the values in the stories field of your main.js config and see if they would match your CSF File.
        - Also check the browser console and terminal for potential error messages.`
    });
    this.data = e;
  }
  static {
    r(this, "MissingStoryAfterHmrError");
  }
}, b = class extends s {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 2,
      documentation: "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#using-implicit-actions-during-rendering-is-deprecated-\
for-example-in-the-play-function",
      message: a.dedent`
        We detected that you use an implicit action arg while ${e.phase} of your story.  
        ${e.deprecated ? `
This is deprecated and won't work in Storybook 8 anymore.
` : ""}
        Please provide an explicit spy to your args like this:
          import { fn } from '@storybook/test';
          ... 
          args: {
           ${e.name}: fn()
          }`
    });
    this.data = e;
  }
  static {
    r(this, "ImplicitActionsDuringRendering");
  }
}, I = class extends s {
  static {
    r(this, "CalledExtractOnStoreError");
  }
  constructor() {
    super({
      category: "PREVIEW_API",
      code: 3,
      message: a.dedent`
        Cannot call \`storyStore.extract()\` without calling \`storyStore.cacheAllCsfFiles()\` first.

        You probably meant to call \`await preview.extract()\` which does the above for you.`
    });
  }
}, _ = class extends s {
  static {
    r(this, "MissingRenderToCanvasError");
  }
  constructor() {
    super({
      category: "PREVIEW_API",
      code: 4,
      message: a.dedent`
        Expected your framework's preset to export a \`renderToCanvas\` field.

        Perhaps it needs to be upgraded for Storybook 7.0?`,
      documentation: "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#mainjs-framework-field"
    });
  }
}, P = class extends s {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 5,
      message: a.dedent`
        Called \`Preview.${e.methodName}()\` before initialization.
        
        The preview needs to load the story index before most methods can be called. If you want
        to call \`${e.methodName}\`, try \`await preview.initializationPromise;\` first.
        
        If you didn't call the above code, then likely it was called by an addon that needs to
        do the above.`
    });
    this.data = e;
  }
  static {
    r(this, "CalledPreviewMethodBeforeInitializationError");
  }
}, x = class extends s {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 6,
      message: a.dedent`
        Error fetching \`/index.json\`:
        
        ${e.text}

        If you are in development, this likely indicates a problem with your Storybook process,
        check the terminal for errors.

        If you are in a deployed Storybook, there may have been an issue deploying the full Storybook
        build.`
    });
    this.data = e;
  }
  static {
    r(this, "StoryIndexFetchError");
  }
}, S = class extends s {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 7,
      message: a.dedent`
        Tried to render docs entry ${e.storyId} but it is a MDX file that has no CSF
        references, or autodocs for a CSF file that some doesn't refer to itself.
        
        This likely is an internal error in Storybook's indexing, or you've attached the
        \`attached-mdx\` tag to an MDX file that is not attached.`
    });
    this.data = e;
  }
  static {
    r(this, "MdxFileWithNoCsfReferencesError");
  }
}, w = class extends s {
  static {
    r(this, "EmptyIndexError");
  }
  constructor() {
    super({
      category: "PREVIEW_API",
      code: 8,
      message: a.dedent`
        Couldn't find any stories in your Storybook.

        - Please check your stories field of your main.js config: does it match correctly?
        - Also check the browser console and terminal for error messages.`
    });
  }
}, T = class extends s {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 9,
      message: a.dedent`
        Couldn't find story matching '${e.storySpecifier}'.

        - Are you sure a story with that id exists?
        - Please check your stories field of your main.js config.
        - Also check the browser console and terminal for error messages.`
    });
    this.data = e;
  }
  static {
    r(this, "NoStoryMatchError");
  }
}, k = class extends s {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 10,
      message: a.dedent`
        Couldn't find story matching id '${e.storyId}' after importing a CSF file.

        The file was indexed as if the story was there, but then after importing the file in the browser
        we didn't find the story. Possible reasons:
        - You are using a custom story indexer that is misbehaving.
        - You have a custom file loader that is removing or renaming exports.

        Please check your browser console and terminal for errors that may explain the issue.`
    });
    this.data = e;
  }
  static {
    r(this, "MissingStoryFromCsfFileError");
  }
}, v = class extends s {
  static {
    r(this, "StoryStoreAccessedBeforeInitializationError");
  }
  constructor() {
    super({
      category: "PREVIEW_API",
      code: 11,
      message: a.dedent`
        Cannot access the Story Store until the index is ready.

        It is not recommended to use methods directly on the Story Store anyway, in Storybook 9 we will
        remove access to the store entirely`
    });
  }
}, N = class extends s {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 12,
      message: a.dedent`
      Incorrect use of mount in the play function.
      
      To use mount in the play function, you must satisfy the following two requirements: 
      
      1. You *must* destructure the mount property from the \`context\` (the argument passed to your play function). 
         This makes sure that Storybook does not start rendering the story before the play function begins.
      
      2. Your Storybook framework or builder must be configured to transpile to ES2017 or newer. 
         This is because destructuring statements and async/await usages are otherwise transpiled away, 
         which prevents Storybook from recognizing your usage of \`mount\`.
      
      Note that Angular is not supported. As async/await is transpiled to support the zone.js polyfill. 
      
      More info: https://storybook.js.org/docs/writing-tests/interaction-testing#run-code-before-the-component-gets-rendered
      
      Received the following play function:
      ${e.playFunction}`
    });
    this.data = e;
  }
  static {
    r(this, "MountMustBeDestructuredError");
  }
}, V = class extends s {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 14,
      message: a.dedent`
        No render function available for storyId '${e.id}'
      `
    });
    this.data = e;
  }
  static {
    r(this, "NoRenderFunctionError");
  }
}, A = class extends s {
  static {
    r(this, "NoStoryMountedError");
  }
  constructor() {
    super({
      category: "PREVIEW_API",
      code: 15,
      message: a.dedent`
        No component is mounted in your story.
        
        This usually occurs when you destructure mount in the play function, but forget to call it.
        
        For example:

        async play({ mount, canvasElement }) {
          // 👈 mount should be called: await mount(); 
          const canvas = within(canvasElement);
          const button = await canvas.findByRole('button');
          await userEvent.click(button);
        };

        Make sure to either remove it or call mount in your play function.
      `
    });
  }
}, W = class extends s {
  static {
    r(this, "NextJsSharpError");
  }
  constructor() {
    super({
      category: "FRAMEWORK_NEXTJS",
      code: 1,
      documentation: "https://storybook.js.org/docs/get-started/nextjs#faq",
      message: a.dedent`
      You are importing avif images, but you don't have sharp installed.

      You have to install sharp in order to use image optimization features in Next.js.
      `
    });
  }
}, O = class extends s {
  constructor(e) {
    super({
      category: "FRAMEWORK_NEXTJS",
      code: 2,
      message: a.dedent`
        Tried to access router mocks from "${e.importType}" but they were not created yet. You might be running code in an unsupported environment.
      `
    });
    this.data = e;
  }
  static {
    r(this, "NextjsRouterMocksNotAvailable");
  }
}, $ = class extends s {
  constructor(e) {
    super({
      category: "DOCS-TOOLS",
      code: 1,
      documentation: "https://github.com/storybookjs/storybook/issues/26606",
      message: a.dedent`
        There was a failure when generating detailed ArgTypes in ${e.language} for:
        ${JSON.stringify(e.type, null, 2)} 
        
        Storybook will fall back to use a generic type description instead.

        This type is either not supported or it is a bug in the docgen generation in Storybook.
        If you think this is a bug, please detail it as much as possible in the Github issue.
      `
    });
    this.data = e;
  }
  static {
    r(this, "UnknownArgTypesError");
  }
}, C = class extends s {
  constructor(e) {
    super({
      category: "ADDON_VITEST",
      code: 1,
      // TODO: Add documentation about viewports support
      // documentation: '',
      message: a.dedent`
        Encountered an unsupported value "${e.value}" when setting the viewport ${e.dimension} dimension.
        
        The Storybook plugin only supports values in the following units:
        - px, vh, vw, em, rem and %.
        
        You can either change the viewport for this story to use one of the supported units or skip the test by adding '!test' to the story's tags per https://storybook.js.org/docs/writing-stories/tags
      `
    });
    this.data = e;
  }
  static {
    r(this, "UnsupportedViewportDimensionError");
  }
};
