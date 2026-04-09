import {
  src_default
} from "./chunk-BN55ESQF.js";
import "./chunk-N3ETBM74.js";
import "./chunk-6F4PWJZI.js";

// src/nuxt.ts
function nuxt_default(options = {}, nuxt) {
  var _a, _b, _c, _d, _e;
  const nuxtApp = (this == null ? void 0 : this.nuxt) || nuxt;
  if ((_a = nuxtApp == null ? void 0 : nuxtApp._version) == null ? void 0 : _a.startsWith("3.")) {
    options.compiler = "vue3";
    (_b = nuxtApp.options).typescript || (_b.typescript = {});
    (_c = nuxtApp.options.typescript).tsConfig || (_c.tsConfig = {});
    (_d = nuxtApp.options.typescript.tsConfig).compilerOptions || (_d.compilerOptions = {});
    (_e = nuxtApp.options.typescript.tsConfig.compilerOptions).types || (_e.types = []);
    nuxtApp.options.typescript.tsConfig.compilerOptions.types.push("unplugin-icons/types/vue");
  }
  nuxtApp.hook("webpack:config", (configs) => {
    configs.forEach((config) => {
      config.plugins = config.plugins || [];
      config.plugins.unshift(src_default.webpack(options));
    });
  });
  nuxtApp.hook("vite:extend", async (vite) => {
    vite.config.plugins = vite.config.plugins || [];
    vite.config.plugins.push(src_default.vite(options));
  });
}
export {
  nuxt_default as default
};
