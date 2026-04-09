var oe = Object.defineProperty;
var t = (u, n) => oe(u, "name", { value: n, configurable: !0 });

// ../node_modules/ts-dedent/esm/index.js
function r(u) {
  for (var n = [], e = 1; e < arguments.length; e++)
    n[e - 1] = arguments[e];
  var a = Array.from(typeof u == "string" ? [u] : u);
  a[a.length - 1] = a[a.length - 1].replace(/\r?\n([\t ]*)$/, "");
  var g = a.reduce(function(i, m) {
    var y = m.match(/\n([\t ]+|(?!\s).)/g);
    return y ? i.concat(y.map(function(E) {
      var l, d;
      return (d = (l = E.match(/[\t ]/g)) === null || l === void 0 ? void 0 : l.length) !== null && d !== void 0 ? d : 0;
    })) : i;
  }, []);
  if (g.length) {
    var h = new RegExp(`
[	 ]{` + Math.min.apply(Math, g) + "}", "g");
    a = a.map(function(i) {
      return i.replace(h, `
`);
    });
  }
  a[0] = a[0].replace(/^\r?\n/, "");
  var c = a[0];
  return n.forEach(function(i, m) {
    var y = c.match(/(?:^|\n)( *)$/), E = y ? y[1] : "", l = i;
    typeof i == "string" && i.includes(`
`) && (l = String(i).split(`
`).map(function(d, te) {
      return te === 0 ? d : "" + E + d;
    }).join(`
`)), c += l + a[m + 1];
  }), c;
}
t(r, "dedent");

// src/storybook-error.ts
function C({
  code: u,
  category: n
}) {
  let e = String(u).padStart(4, "0");
  return `SB_${n}_${e}`;
}
t(C, "parseErrorCode");
var p = class p extends Error {
  constructor(e) {
    super(p.getFullMessage(e));
    /**
     * Data associated with the error. Used to provide additional information in the error message or
     * to be passed to telemetry.
     */
    this.data = {};
    /** Flag used to easily determine if the error originates from Storybook. */
    this.fromStorybook = !0;
    this.category = e.category, this.documentation = e.documentation ?? !1, this.code = e.code;
  }
  get fullErrorCode() {
    return C({ code: this.code, category: this.category });
  }
  /** Overrides the default `Error.name` property in the format: SB_<CATEGORY>_<CODE>. */
  get name() {
    let e = this.constructor.name;
    return `${this.fullErrorCode} (${e})`;
  }
  /** Generates the error message along with additional documentation link (if applicable). */
  static getFullMessage({
    documentation: e,
    code: a,
    category: g,
    message: h
  }) {
    let c;
    return e === !0 ? c = `https://storybook.js.org/error/${C({ code: a, category: g })}` : typeof e == "string" ? c = e : Array.isArray(e) &&
    (c = `
${e.map((i) => `	- ${i}`).join(`
`)}`), `${h}${c != null ? `

More info: ${c}
` : ""}`;
  }
};
t(p, "StorybookError");
var o = p;

// src/preview-errors.ts
var se = /* @__PURE__ */ ((s) => (s.BLOCKS = "BLOCKS", s.DOCS_TOOLS = "DOCS-TOOLS", s.PREVIEW_CLIENT_LOGGER = "PREVIEW_CLIENT-LOGGER", s.PREVIEW_CHANNELS =
"PREVIEW_CHANNELS", s.PREVIEW_CORE_EVENTS = "PREVIEW_CORE-EVENTS", s.PREVIEW_INSTRUMENTER = "PREVIEW_INSTRUMENTER", s.PREVIEW_API = "PREVIEW\
_API", s.PREVIEW_REACT_DOM_SHIM = "PREVIEW_REACT-DOM-SHIM", s.PREVIEW_ROUTER = "PREVIEW_ROUTER", s.PREVIEW_THEMING = "PREVIEW_THEMING", s.RENDERER_HTML =
"RENDERER_HTML", s.RENDERER_PREACT = "RENDERER_PREACT", s.RENDERER_REACT = "RENDERER_REACT", s.RENDERER_SERVER = "RENDERER_SERVER", s.RENDERER_SVELTE =
"RENDERER_SVELTE", s.RENDERER_VUE = "RENDERER_VUE", s.RENDERER_VUE3 = "RENDERER_VUE3", s.RENDERER_WEB_COMPONENTS = "RENDERER_WEB-COMPONENTS",
s.FRAMEWORK_NEXTJS = "FRAMEWORK_NEXTJS", s.ADDON_VITEST = "ADDON_VITEST", s))(se || {}), f = class f extends o {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 1,
      message: r`
        Couldn't find story matching id '${e.storyId}' after HMR.
        - Did you just rename a story?
        - Did you remove it from your CSF file?
        - Are you sure a story with the id '${e.storyId}' exists?
        - Please check the values in the stories field of your main.js config and see if they would match your CSF File.
        - Also check the browser console and terminal for potential error messages.`
    });
    this.data = e;
  }
};
t(f, "MissingStoryAfterHmrError");
var D = f, R = class R extends o {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 2,
      documentation: "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#using-implicit-actions-during-rendering-is-deprecated-\
for-example-in-the-play-function",
      message: r`
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
};
t(R, "ImplicitActionsDuringRendering");
var j = R, b = class b extends o {
  constructor() {
    super({
      category: "PREVIEW_API",
      code: 3,
      message: r`
        Cannot call \`storyStore.extract()\` without calling \`storyStore.cacheAllCsfFiles()\` first.

        You probably meant to call \`await preview.extract()\` which does the above for you.`
    });
  }
};
t(b, "CalledExtractOnStoreError");
var L = b, I = class I extends o {
  constructor() {
    super({
      category: "PREVIEW_API",
      code: 4,
      message: r`
        Expected your framework's preset to export a \`renderToCanvas\` field.

        Perhaps it needs to be upgraded for Storybook 7.0?`,
      documentation: "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#mainjs-framework-field"
    });
  }
};
t(I, "MissingRenderToCanvasError");
var G = I, P = class P extends o {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 5,
      message: r`
        Called \`Preview.${e.methodName}()\` before initialization.
        
        The preview needs to load the story index before most methods can be called. If you want
        to call \`${e.methodName}\`, try \`await preview.initializationPromise;\` first.
        
        If you didn't call the above code, then likely it was called by an addon that needs to
        do the above.`
    });
    this.data = e;
  }
};
t(P, "CalledPreviewMethodBeforeInitializationError");
var Y = P, x = class x extends o {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 6,
      message: r`
        Error fetching \`/index.json\`:
        
        ${e.text}

        If you are in development, this likely indicates a problem with your Storybook process,
        check the terminal for errors.

        If you are in a deployed Storybook, there may have been an issue deploying the full Storybook
        build.`
    });
    this.data = e;
  }
};
t(x, "StoryIndexFetchError");
var M = x, T = class T extends o {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 7,
      message: r`
        Tried to render docs entry ${e.storyId} but it is a MDX file that has no CSF
        references, or autodocs for a CSF file that some doesn't refer to itself.
        
        This likely is an internal error in Storybook's indexing, or you've attached the
        \`attached-mdx\` tag to an MDX file that is not attached.`
    });
    this.data = e;
  }
};
t(T, "MdxFileWithNoCsfReferencesError");
var H = T, w = class w extends o {
  constructor() {
    super({
      category: "PREVIEW_API",
      code: 8,
      message: r`
        Couldn't find any stories in your Storybook.

        - Please check your stories field of your main.js config: does it match correctly?
        - Also check the browser console and terminal for error messages.`
    });
  }
};
t(w, "EmptyIndexError");
var F = w, k = class k extends o {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 9,
      message: r`
        Couldn't find story matching '${e.storySpecifier}'.

        - Are you sure a story with that id exists?
        - Please check your stories field of your main.js config.
        - Also check the browser console and terminal for error messages.`
    });
    this.data = e;
  }
};
t(k, "NoStoryMatchError");
var K = k, S = class S extends o {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 10,
      message: r`
        Couldn't find story matching id '${e.storyId}' after importing a CSF file.

        The file was indexed as if the story was there, but then after importing the file in the browser
        we didn't find the story. Possible reasons:
        - You are using a custom story indexer that is misbehaving.
        - You have a custom file loader that is removing or renaming exports.

        Please check your browser console and terminal for errors that may explain the issue.`
    });
    this.data = e;
  }
};
t(S, "MissingStoryFromCsfFileError");
var X = S, v = class v extends o {
  constructor() {
    super({
      category: "PREVIEW_API",
      code: 11,
      message: r`
        Cannot access the Story Store until the index is ready.

        It is not recommended to use methods directly on the Story Store anyway, in Storybook 9 we will
        remove access to the store entirely`
    });
  }
};
t(v, "StoryStoreAccessedBeforeInitializationError");
var U = v, _ = class _ extends o {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 12,
      message: r`
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
};
t(_, "MountMustBeDestructuredError");
var J = _, V = class V extends o {
  constructor(e) {
    super({
      category: "PREVIEW_API",
      code: 14,
      message: r`
        No render function available for storyId '${e.id}'
      `
    });
    this.data = e;
  }
};
t(V, "NoRenderFunctionError");
var q = V, N = class N extends o {
  constructor() {
    super({
      category: "PREVIEW_API",
      code: 15,
      message: r`
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
};
t(N, "NoStoryMountedError");
var z = N, A = class A extends o {
  constructor() {
    super({
      category: "FRAMEWORK_NEXTJS",
      code: 1,
      documentation: "https://storybook.js.org/docs/get-started/nextjs#faq",
      message: r`
      You are importing avif images, but you don't have sharp installed.

      You have to install sharp in order to use image optimization features in Next.js.
      `
    });
  }
};
t(A, "NextJsSharpError");
var B = A, W = class W extends o {
  constructor(e) {
    super({
      category: "FRAMEWORK_NEXTJS",
      code: 2,
      message: r`
        Tried to access router mocks from "${e.importType}" but they were not created yet. You might be running code in an unsupported environment.
      `
    });
    this.data = e;
  }
};
t(W, "NextjsRouterMocksNotAvailable");
var Q = W, $ = class $ extends o {
  constructor(e) {
    super({
      category: "DOCS-TOOLS",
      code: 1,
      documentation: "https://github.com/storybookjs/storybook/issues/26606",
      message: r`
        There was a failure when generating detailed ArgTypes in ${e.language} for:
        ${JSON.stringify(e.type, null, 2)} 
        
        Storybook will fall back to use a generic type description instead.

        This type is either not supported or it is a bug in the docgen generation in Storybook.
        If you think this is a bug, please detail it as much as possible in the Github issue.
      `
    });
    this.data = e;
  }
};
t($, "UnknownArgTypesError");
var Z = $, O = class O extends o {
  constructor(e) {
    super({
      category: "ADDON_VITEST",
      code: 1,
      // TODO: Add documentation about viewports support
      // documentation: '',
      message: r`
        Encountered an unsupported value "${e.value}" when setting the viewport ${e.dimension} dimension.
        
        The Storybook plugin only supports values in the following units:
        - px, vh, vw, em, rem and %.
        
        You can either change the viewport for this story to use one of the supported units or skip the test by adding '!test' to the story's tags per https://storybook.js.org/docs/writing-stories/tags
      `
    });
    this.data = e;
  }
};
t(O, "UnsupportedViewportDimensionError");
var ee = O;
export {
  L as CalledExtractOnStoreError,
  Y as CalledPreviewMethodBeforeInitializationError,
  se as Category,
  F as EmptyIndexError,
  j as ImplicitActionsDuringRendering,
  H as MdxFileWithNoCsfReferencesError,
  G as MissingRenderToCanvasError,
  D as MissingStoryAfterHmrError,
  X as MissingStoryFromCsfFileError,
  J as MountMustBeDestructuredError,
  B as NextJsSharpError,
  Q as NextjsRouterMocksNotAvailable,
  q as NoRenderFunctionError,
  K as NoStoryMatchError,
  z as NoStoryMountedError,
  M as StoryIndexFetchError,
  U as StoryStoreAccessedBeforeInitializationError,
  Z as UnknownArgTypesError,
  ee as UnsupportedViewportDimensionError
};
