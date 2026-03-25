import {
  StorybookError
} from "./chunk-JVRDBUUP.js";
import {
  dedent
} from "./chunk-JP7NCOJX.js";

// src/preview-errors.ts
var Category = /* @__PURE__ */ ((Category2) => (Category2.BLOCKS = "BLOCKS", Category2.DOCS_TOOLS = "DOCS-TOOLS", Category2.PREVIEW_CLIENT_LOGGER = "PREVIEW_CLIENT-LOGGER", Category2.PREVIEW_CHANNELS = "PREVIEW_CHANNELS", Category2.PREVIEW_CORE_EVENTS = "PREVIEW_CORE-EVENTS", Category2.PREVIEW_INSTRUMENTER = "PREVIEW_INSTRUMENTER", Category2.PREVIEW_API = "PREVIEW_API", Category2.PREVIEW_REACT_DOM_SHIM = "PREVIEW_REACT-DOM-SHIM", Category2.PREVIEW_ROUTER = "PREVIEW_ROUTER", Category2.PREVIEW_THEMING = "PREVIEW_THEMING", Category2.RENDERER_HTML = "RENDERER_HTML", Category2.RENDERER_PREACT = "RENDERER_PREACT", Category2.RENDERER_REACT = "RENDERER_REACT", Category2.RENDERER_SERVER = "RENDERER_SERVER", Category2.RENDERER_SVELTE = "RENDERER_SVELTE", Category2.RENDERER_VUE = "RENDERER_VUE", Category2.RENDERER_VUE3 = "RENDERER_VUE3", Category2.RENDERER_WEB_COMPONENTS = "RENDERER_WEB-COMPONENTS", Category2.FRAMEWORK_NEXTJS = "FRAMEWORK_NEXTJS", Category2.ADDON_VITEST = "ADDON_VITEST", Category2.ADDON_A11Y = "ADDON_A11Y", Category2))(Category || {}), MissingStoryAfterHmrError = class extends StorybookError {
  constructor(data) {
    super({
      name: "MissingStoryAfterHmrError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 1,
      message: dedent`
        Couldn't find story matching id '${data.storyId}' after HMR.
        - Did you just rename a story?
        - Did you remove it from your CSF file?
        - Are you sure a story with the id '${data.storyId}' exists?
        - Please check the values in the stories field of your main.js config and see if they would match your CSF File.
        - Also check the browser console and terminal for potential error messages.`
    });
    this.data = data;
  }
}, ImplicitActionsDuringRendering = class extends StorybookError {
  constructor(data) {
    super({
      name: "ImplicitActionsDuringRendering",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 2,
      documentation: "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#using-implicit-actions-during-rendering-is-deprecated-for-example-in-the-play-function",
      message: dedent`
        We detected that you use an implicit action arg while ${data.phase} of your story.  
        ${data.deprecated ? `
This is deprecated and won't work in Storybook 8 anymore.
` : ""}
        Please provide an explicit spy to your args like this:
          import { fn } from 'storybook/test';
          ... 
          args: {
           ${data.name}: fn()
          }`
    });
    this.data = data;
  }
}, CalledExtractOnStoreError = class extends StorybookError {
  constructor() {
    super({
      name: "CalledExtractOnStoreError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 3,
      message: dedent`
        Cannot call \`storyStore.extract()\` without calling \`storyStore.cacheAllCsfFiles()\` first.

        You probably meant to call \`await preview.extract()\` which does the above for you.`
    });
  }
}, MissingRenderToCanvasError = class extends StorybookError {
  constructor() {
    super({
      name: "MissingRenderToCanvasError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 4,
      message: dedent`
        Expected your framework's preset to export a \`renderToCanvas\` field.

        Perhaps it needs to be upgraded for Storybook 7.0?`,
      documentation: "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#mainjs-framework-field"
    });
  }
}, CalledPreviewMethodBeforeInitializationError = class extends StorybookError {
  constructor(data) {
    super({
      name: "CalledPreviewMethodBeforeInitializationError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 5,
      message: dedent`
        Called \`Preview.${data.methodName}()\` before initialization.
        
        The preview needs to load the story index before most methods can be called. If you want
        to call \`${data.methodName}\`, try \`await preview.initializationPromise;\` first.
        
        If you didn't call the above code, then likely it was called by an addon that needs to
        do the above.`
    });
    this.data = data;
  }
}, StoryIndexFetchError = class extends StorybookError {
  constructor(data) {
    super({
      name: "StoryIndexFetchError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 6,
      message: dedent`
        Error fetching \`/index.json\`:
        
        ${data.text}

        If you are in development, this likely indicates a problem with your Storybook process,
        check the terminal for errors.

        If you are in a deployed Storybook, there may have been an issue deploying the full Storybook
        build.`
    });
    this.data = data;
  }
}, MdxFileWithNoCsfReferencesError = class extends StorybookError {
  constructor(data) {
    super({
      name: "MdxFileWithNoCsfReferencesError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 7,
      message: dedent`
        Tried to render docs entry ${data.storyId} but it is a MDX file that has no CSF
        references, or autodocs for a CSF file that some doesn't refer to itself.
        
        This likely is an internal error in Storybook's indexing, or you've attached the
        \`attached-mdx\` tag to an MDX file that is not attached.`
    });
    this.data = data;
  }
}, EmptyIndexError = class extends StorybookError {
  constructor() {
    super({
      name: "EmptyIndexError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 8,
      message: dedent`
        Couldn't find any stories in your Storybook.

        - Please check your stories field of your main.js config: does it match correctly?
        - Also check the browser console and terminal for error messages.`
    });
  }
}, NoStoryMatchError = class extends StorybookError {
  constructor(data) {
    super({
      name: "NoStoryMatchError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 9,
      message: dedent`
        Couldn't find story matching '${data.storySpecifier}'.

        - Are you sure a story with that id exists?
        - Please check your stories field of your main.js config.
        - Also check the browser console and terminal for error messages.`
    });
    this.data = data;
  }
}, MissingStoryFromCsfFileError = class extends StorybookError {
  constructor(data) {
    super({
      name: "MissingStoryFromCsfFileError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 10,
      message: dedent`
        Couldn't find story matching id '${data.storyId}' after importing a CSF file.

        The file was indexed as if the story was there, but then after importing the file in the browser
        we didn't find the story. Possible reasons:
        - You are using a custom story indexer that is misbehaving.
        - You have a custom file loader that is removing or renaming exports.

        Please check your browser console and terminal for errors that may explain the issue.`
    });
    this.data = data;
  }
}, StoryStoreAccessedBeforeInitializationError = class extends StorybookError {
  constructor() {
    super({
      name: "StoryStoreAccessedBeforeInitializationError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 11,
      message: dedent`
        Cannot access the Story Store until the index is ready.

        It is not recommended to use methods directly on the Story Store anyway, in Storybook 9 we will
        remove access to the store entirely`
    });
  }
}, MountMustBeDestructuredError = class extends StorybookError {
  // name: 'MountMustBeDestructuredError';
  constructor(data) {
    super({
      name: "MountMustBeDestructuredError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 12,
      message: dedent`
      Incorrect use of mount in the play function.
      
      To use mount in the play function, you must satisfy the following two requirements: 
      
      1. You *must* destructure the mount property from the \`context\` (the argument passed to your play function). 
         This makes sure that Storybook does not start rendering the story before the play function begins.
      
      2. Your Storybook framework or builder must be configured to transpile to ES2017 or newer. 
         This is because destructuring statements and async/await usages are otherwise transpiled away, 
         which prevents Storybook from recognizing your usage of \`mount\`.
      
      Note that Angular is not supported. As async/await is transpiled to support the zone.js polyfill. 
      
      More info: https://storybook.js.org/docs/writing-tests/interaction-testing?ref=error#run-code-before-the-component-gets-rendered
      
      Received the following play function:
      ${data.playFunction}`
    });
    this.data = data;
  }
}, NoRenderFunctionError = class extends StorybookError {
  constructor(data) {
    super({
      name: "NoRenderFunctionError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 14,
      message: dedent`
        No render function available for storyId '${data.id}'
      `
    });
    this.data = data;
  }
}, NoStoryMountedError = class extends StorybookError {
  constructor() {
    super({
      name: "NoStoryMountedError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 15,
      message: dedent`
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
}, StatusTypeIdMismatchError = class extends StorybookError {
  constructor(data) {
    super({
      name: "StatusTypeIdMismatchError",
      category: "PREVIEW_API" /* PREVIEW_API */,
      code: 16,
      message: `Status has typeId "${data.status.typeId}" but was added to store with typeId "${data.typeId}". Full status: ${JSON.stringify(
        data.status,
        null,
        2
      )}`
    });
    this.data = data;
  }
}, NextJsSharpError = class extends StorybookError {
  constructor() {
    super({
      name: "NextJsSharpError",
      category: "FRAMEWORK_NEXTJS" /* FRAMEWORK_NEXTJS */,
      code: 1,
      documentation: "https://storybook.js.org/docs/get-started/nextjs#faq",
      message: dedent`
      You are importing avif images, but you don't have sharp installed.

      You have to install sharp in order to use image optimization features in Next.js.
      `
    });
  }
}, NextjsRouterMocksNotAvailable = class extends StorybookError {
  constructor(data) {
    super({
      name: "NextjsRouterMocksNotAvailable",
      category: "FRAMEWORK_NEXTJS" /* FRAMEWORK_NEXTJS */,
      code: 2,
      message: dedent`
        Tried to access router mocks from "${data.importType}" but they were not created yet. You might be running code in an unsupported environment.
      `
    });
    this.data = data;
  }
}, UnknownArgTypesError = class extends StorybookError {
  constructor(data) {
    super({
      name: "UnknownArgTypesError",
      category: "DOCS-TOOLS" /* DOCS_TOOLS */,
      code: 1,
      documentation: "https://github.com/storybookjs/storybook/issues/26606",
      message: dedent`
        There was a failure when generating detailed ArgTypes in ${data.language} for:
        ${JSON.stringify(data.type, null, 2)} 
        
        Storybook will fall back to use a generic type description instead.

        This type is either not supported or it is a bug in the docgen generation in Storybook.
        If you think this is a bug, please detail it as much as possible in the Github issue.
      `
    });
    this.data = data;
  }
}, UnsupportedViewportDimensionError = class extends StorybookError {
  constructor(data) {
    super({
      name: "UnsupportedViewportDimensionError",
      category: "ADDON_VITEST" /* ADDON_VITEST */,
      code: 1,
      // TODO: Add documentation about viewports support
      // documentation: '',
      message: dedent`
        Encountered an unsupported value "${data.value}" when setting the viewport ${data.dimension} dimension.
        
        The Storybook plugin only supports values in the following units:
        - px, vh, vw, em, rem and %.
        
        You can either change the viewport for this story to use one of the supported units or skip the test by adding '!test' to the story's tags per https://storybook.js.org/docs/writing-stories/tags
      `
    });
    this.data = data;
  }
}, ElementA11yParameterError = class extends StorybookError {
  constructor() {
    super({
      name: "ElementA11yParameterError",
      category: "ADDON_A11Y" /* ADDON_A11Y */,
      code: 1,
      documentation: "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#a11y-addon-replace-element-parameter-with-context-parameter",
      message: 'The "element" parameter in parameters.a11y has been removed. Use "context" instead.'
    });
  }
};

export {
  Category,
  MissingStoryAfterHmrError,
  ImplicitActionsDuringRendering,
  CalledExtractOnStoreError,
  MissingRenderToCanvasError,
  CalledPreviewMethodBeforeInitializationError,
  StoryIndexFetchError,
  MdxFileWithNoCsfReferencesError,
  EmptyIndexError,
  NoStoryMatchError,
  MissingStoryFromCsfFileError,
  StoryStoreAccessedBeforeInitializationError,
  MountMustBeDestructuredError,
  NoRenderFunctionError,
  NoStoryMountedError,
  StatusTypeIdMismatchError,
  NextJsSharpError,
  NextjsRouterMocksNotAvailable,
  UnknownArgTypesError,
  UnsupportedViewportDimensionError,
  ElementA11yParameterError
};
