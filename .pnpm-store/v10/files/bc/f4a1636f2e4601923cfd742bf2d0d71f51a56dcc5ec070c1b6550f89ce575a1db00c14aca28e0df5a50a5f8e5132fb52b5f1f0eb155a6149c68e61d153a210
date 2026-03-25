import {
  __spreadProps,
  __spreadValues
} from "./chunk-KLNSLHAC.js";

// src/index.ts
import { createUnplugin } from "unplugin";

// src/core/options.ts
import process from "process";
import { getPackageInfo, isPackageExists } from "local-pkg";
import createDebugger from "debug";
var debug = createDebugger("unplugin-icons:options");
async function resolveOptions(options) {
  const {
    scale = 1.2,
    defaultStyle = "",
    defaultClass = "",
    compiler = await guessCompiler(),
    jsx = guessJSX(),
    customCollections = {},
    iconCustomizer = () => {
    },
    transform,
    autoInstall = false,
    collectionsNodeResolvePath = process.cwd()
  } = options;
  const webComponents = Object.assign({
    autoDefine: false,
    iconPrefix: "icon"
  }, options.webComponents);
  debug("compiler", compiler);
  return {
    scale,
    defaultStyle,
    defaultClass,
    customCollections,
    iconCustomizer,
    compiler,
    jsx,
    webComponents,
    transform,
    autoInstall,
    collectionsNodeResolvePath
  };
}
async function guessCompiler() {
  return await getVueVersion() || (isPackageExists("@svgr/core") ? "jsx" : "vue3");
}
function guessJSX() {
  if (isPackageExists("preact"))
    return "preact";
  return "react";
}
async function getVueVersion() {
  var _a;
  try {
    const result = await getPackageInfo("vue");
    if (!result || !result.version)
      return null;
    return ((_a = result.version) == null ? void 0 : _a.startsWith("2.")) ? "vue2" : "vue3";
  } catch (e) {
    return null;
  }
}

// src/core/loader.ts
import { loadNodeIcon } from "@iconify/utils/lib/loader/node-loader";

// src/core/compilers/astro.ts
var AstroCompiler = (svg) => {
  const svgWithProps = svg.replace("<svg", "<svg {...props}");
  return `---
  interface Props extends astroHTML.JSX.SVGAttributes {};
  const props = Astro.props;
---
${svgWithProps}`;
};

// src/core/compilers/jsx.ts
import { importModule } from "local-pkg";
import { camelize } from "@iconify/utils/lib/misc/strings";
var JSXCompiler = async (svg, collection, icon, options) => {
  var _a;
  const svgrCore = await importModule("@svgr/core");
  const svgr = svgrCore.transform || (svgrCore.default ? (_a = svgrCore.default.transform) != null ? _a : svgrCore.default : svgrCore.default) || svgrCore;
  let res = await svgr(
    svg,
    {
      plugins: ["@svgr/plugin-jsx"]
    },
    { componentName: camelize(`${collection}-${icon}`) }
  );
  if (options.jsx !== "react")
    res = res.replace('import * as React from "react";', "");
  return res;
};

// src/core/compilers/marko.ts
var MarkoCompiler = (svg) => {
  const openTagEnd = svg.indexOf(">", svg.indexOf("<svg "));
  const closeTagStart = svg.lastIndexOf("</svg");
  const openTag = `${svg.slice(0, openTagEnd)} ...input>`;
  const content = `$!{\`${escapeTemplateLiteral(svg.slice(openTagEnd + 1, closeTagStart))}\`}`;
  const closeTag = svg.slice(closeTagStart);
  return `${openTag}${content}${closeTag}`;
};
function escapeTemplateLiteral(str) {
  return str.replace(/\\.|[$`]/g, (m) => {
    switch (m) {
      case "$":
        return "&#36";
      case "`":
        return "&#96;";
      default:
        return m;
    }
  });
}

// src/core/compilers/none.ts
var NoneCompiler = (svg) => {
  return svg;
};

// src/core/compilers/qwik.ts
import { importModule as importModule2 } from "local-pkg";
import { camelize as camelize2 } from "@iconify/utils/lib/misc/strings";
var QwikCompiler = async (svg, collection, icon, options) => {
  const defaultOptions = {
    importSource: "@builder.io/qwik",
    runtime: "automatic",
    componentName: camelize2(`${collection}-${icon}`)
  };
  const mergedOptions = Object.assign({}, defaultOptions, options);
  const svgx = await importModule2("@svgx/core");
  const toJsxComponent = svgx.toJsxComponent;
  const res = toJsxComponent(svg, __spreadProps(__spreadValues({}, mergedOptions), {
    defaultExport: true
  }));
  return res;
};

// src/core/compilers/raw.ts
var RawCompiler = (svg) => {
  return `export default ${JSON.stringify(svg)}`;
};

// src/core/compilers/solid.ts
var SolidCompiler = (svg) => {
  const svgWithProps = svg.replace(/([{}])/g, "{'$1'}").replace(new RegExp("(?<=<svg[\\s\\S]*?)(>)", "i"), "{...props}>");
  return `export default (props = {}) => ${svgWithProps}`;
};

// src/core/compilers/svelte.ts
var svelteRunes;
var SvelteCompiler = async (svg) => {
  if (svelteRunes == null) {
    try {
      const { VERSION } = await import("svelte/compiler");
      svelteRunes = Number(VERSION.split(".")[0]) >= 5;
    } catch (e) {
      svelteRunes = false;
    }
  }
  const openTagEnd = svg.indexOf(">", svg.indexOf("<svg "));
  const closeTagStart = svg.lastIndexOf("</svg");
  let sfc = `${svg.slice(0, openTagEnd)} {...${svelteRunes ? "p" : "$$props"}}>`;
  if (svelteRunes)
    sfc += svg.slice(openTagEnd + 1, closeTagStart);
  else
    sfc += `{@html \`${escapeSvelte(svg.slice(openTagEnd + 1, closeTagStart))}\`}`;
  sfc += svg.slice(closeTagStart);
  return svelteRunes ? `<script>const{...p}=$props()</script>${sfc}` : sfc;
};
function escapeSvelte(str) {
  return str.replace(/{/g, "&#123;").replace(/}/g, "&#125;").replace(/`/g, "&#96;").replace(/\\([trn])/g, " ");
}

// src/core/compilers/vue2.ts
import { importModule as importModule3 } from "local-pkg";

// src/core/svgId.ts
var randIdFn = "const __randId = () => Math.random().toString(36).substr(2, 10);";
function handleSVGId(svg) {
  const hasID = /="url\(#/.test(svg);
  const idMap = {};
  let injectScripts = "";
  if (hasID) {
    svg = svg.replace(/\b([\w-]+?)="url\(#(.+?)\)"/g, (_, s, id) => {
      idMap[id] = `'${id}':'uicons-'+__randId()`;
      return `:${s}="'url(#'+idMap['${id}']+')'"`;
    }).replace(/\bid="(.+?)"/g, (full, id) => {
      if (idMap[id])
        return `:id="idMap['${id}']"`;
      return full;
    });
    injectScripts = `${randIdFn}const idMap = {${Object.values(idMap).join(",")}};`;
  }
  return {
    hasID,
    svg,
    injectScripts
  };
}

// src/core/compilers/vue2.ts
var Vue2Compiler = async (svg, collection, icon) => {
  const { compile } = await importModule3("vue-template-compiler");
  const transpileMod = await importModule3("vue-template-es2015-compiler");
  const transpile = transpileMod.default || transpileMod;
  const { injectScripts, svg: handled } = handleSVGId(svg);
  const { render } = compile(handled);
  const toFunction = (code2) => {
    return `function () {${code2}}`;
  };
  let code = transpile(`var __render__ = ${toFunction(render)}
`, {});
  code = code.replace(/\s__(render|staticRenderFns)__\s/g, " $1 ");
  code += `
/* vite-plugin-components disabled */
export default {
  render: render,
  ${injectScripts ? `data() {${injectScripts};return { idMap }},` : ""}
  name: '${collection}-${icon}',
}
`;
  return code;
};

// src/core/compilers/vue3.ts
import { importModule as importModule4 } from "local-pkg";
var Vue3Compiler = async (svg, collection, icon) => {
  const { compileTemplate } = await importModule4("@vue/compiler-sfc");
  const { injectScripts, svg: handled } = handleSVGId(svg);
  let { code } = compileTemplate({
    source: handled,
    id: `${collection}:${icon}`,
    filename: `${collection}-${icon}.vue`
  });
  code = code.replace(/^export /gm, "");
  code += `

export default { name: '${collection}-${icon}', render${injectScripts ? `, data() {${injectScripts};return { idMap }}` : ""} }`;
  code += "\n/* vite-plugin-components disabled */";
  return code;
};

// src/core/compilers/web-components.ts
import { camelize as camelize3 } from "@iconify/utils/lib/misc/strings";
var WebComponentsCompiler = (svg, collection, icon, { webComponents: options }) => {
  let id = `${collection}-${icon}`;
  if (options.iconPrefix)
    id = `${options.iconPrefix}-${id}`;
  const name = camelize3(id);
  let code = `export default class ${name} extends HTMLElement {`;
  if (options.shadow) {
    code += `constructor() {
      super()
      this.attachShadow({ mode: 'open' }).innerHTML = ${JSON.stringify(svg)}
    }`;
  } else {
    code += `connectedCallback() { this.innerHTML = ${JSON.stringify(svg)} }`;
  }
  code += "}";
  if (options.autoDefine)
    code += `
customElements.define('${id}', ${name})`;
  return code;
};

// src/core/compilers/index.ts
var compilers = {
  "astro": AstroCompiler,
  "jsx": JSXCompiler,
  "marko": MarkoCompiler,
  "none": NoneCompiler,
  "raw": RawCompiler,
  "solid": SolidCompiler,
  "svelte": SvelteCompiler,
  "vue2": Vue2Compiler,
  "vue3": Vue3Compiler,
  "web-components": WebComponentsCompiler,
  "qwik": QwikCompiler
};

// src/core/loader.ts
var URL_PREFIXES = ["/~icons/", "~icons/", "virtual:icons/", "virtual/icons/"];
var iconPathRE = new RegExp(`${URL_PREFIXES.map((v) => `^${v}`).join("|")}`);
function isIconPath(path) {
  return iconPathRE.test(path);
}
function normalizeIconPath(path) {
  return path.replace(iconPathRE, URL_PREFIXES[0]);
}
function resolveIconsPath(path) {
  if (!isIconPath(path))
    return null;
  path = path.replace(iconPathRE, "");
  const query = {};
  const queryIndex = path.indexOf("?");
  if (queryIndex !== -1) {
    const queryRaw = path.slice(queryIndex + 1);
    path = path.slice(0, queryIndex);
    new URLSearchParams(queryRaw).forEach((value, key) => {
      if (key === "raw")
        query.raw = value === "" || value === "true" ? "true" : "false";
      else
        query[key] = value;
    });
  }
  path = path.replace(/\.\w+$/, "");
  const [collection, icon] = path.split("/");
  return {
    collection,
    icon,
    query
  };
}
async function generateComponent({ collection, icon, query }, options) {
  const warn = `${collection}/${icon}`;
  const {
    scale,
    defaultStyle,
    defaultClass,
    customCollections,
    iconCustomizer: providedIconCustomizer,
    transform,
    autoInstall = false,
    collectionsNodeResolvePath
  } = options;
  const iconifyLoaderOptions = {
    addXmlNs: false,
    scale,
    customCollections,
    autoInstall,
    defaultClass,
    defaultStyle,
    cwd: collectionsNodeResolvePath,
    // there is no need to warn since we throw an error below
    warn: void 0,
    customizations: {
      transform,
      async iconCustomizer(collection2, icon2, props) {
        await (providedIconCustomizer == null ? void 0 : providedIconCustomizer(collection2, icon2, props));
        Object.keys(query).forEach((p) => {
          const v = query[p];
          if (p !== "raw" && v !== void 0 && v !== null)
            props[p] = v;
        });
      }
    }
  };
  const svg = await loadNodeIcon(collection, icon, iconifyLoaderOptions);
  if (!svg)
    throw new Error(`Icon \`${warn}\` not found`);
  const _compiler = query.raw === "true" ? "raw" : options.compiler;
  if (_compiler) {
    const compiler = typeof _compiler === "string" ? compilers[_compiler] : await _compiler.compiler;
    if (compiler)
      return compiler(svg, collection, icon, options);
  }
  throw new Error(`Unknown compiler: ${_compiler}`);
}
async function generateComponentFromPath(path, options) {
  const resolved = resolveIconsPath(path);
  if (!resolved)
    return null;
  return generateComponent(resolved, options);
}

// src/index.ts
var unplugin = createUnplugin((options = {}) => {
  const resolved = resolveOptions(options);
  return {
    name: "unplugin-icons",
    enforce: "pre",
    resolveId(id) {
      var _a;
      if (isIconPath(id)) {
        const normalizedId = normalizeIconPath(id);
        const queryIndex = normalizedId.indexOf("?");
        const res = `${(queryIndex > -1 ? normalizedId.slice(0, queryIndex) : normalizedId).replace(/\.\w+$/i, "").replace(/^\//, "")}${queryIndex > -1 ? `?${normalizedId.slice(queryIndex + 1)}` : ""}`;
        const resolved2 = resolveIconsPath(res);
        const compiler = ((_a = resolved2 == null ? void 0 : resolved2.query) == null ? void 0 : _a.raw) === "true" ? "raw" : options.compiler;
        if (compiler && typeof compiler !== "string") {
          const ext = compiler.extension;
          if (ext)
            return `${res}.${ext.startsWith(".") ? ext.slice(1) : ext}`;
        } else {
          switch (compiler) {
            case "astro":
              return `${res}.astro`;
            case "jsx":
              return `${res}.jsx`;
            case "qwik":
              return `${res}.jsx`;
            case "marko":
              return `${res}.marko`;
            case "svelte":
              return `${res}.svelte`;
            case "solid":
              return `${res}.tsx`;
          }
        }
        return res;
      }
      return null;
    },
    loadInclude(id) {
      return isIconPath(id);
    },
    async load(id) {
      const config = await resolved;
      const code = await generateComponentFromPath(id, config) || null;
      if (code) {
        return {
          code,
          map: { version: 3, mappings: "", sources: [] }
        };
      }
    },
    rollup: {
      api: {
        config: options
      }
    }
  };
});
var src_default = unplugin;

export {
  src_default
};
