import { createRequire as B } from "node:module";
import x from "@rollup/plugin-inject";
import j from "node-stdlib-browser";
import { handleCircularDependancyWarning as O } from "node-stdlib-browser/helpers/rollup/plugin";
import T from "node-stdlib-browser/helpers/esbuild/plugin";
const v = (s, l) => c(s) === c(l), o = (s, l) => s ? s === !0 ? !0 : s === l : !1, $ = (s) => s.startsWith("node:"), w = (s) => {
  const l = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${l}$`);
}, c = (s) => s.replace(/^node:/, ""), g = {
  buffer: [
    "import __buffer_polyfill from 'vite-plugin-node-polyfills/shims/buffer'",
    "globalThis.Buffer = globalThis.Buffer || __buffer_polyfill"
  ],
  global: [
    "import __global_polyfill from 'vite-plugin-node-polyfills/shims/global'",
    "globalThis.global = globalThis.global || __global_polyfill"
  ],
  process: [
    "import __process_polyfill from 'vite-plugin-node-polyfills/shims/process'",
    "globalThis.process = globalThis.process || __process_polyfill"
  ]
}, D = (s = {}) => {
  const l = {
    include: [],
    exclude: [],
    overrides: {},
    protocolImports: !0,
    ...s,
    globals: {
      Buffer: !0,
      global: !0,
      process: !0,
      ...s.globals
    }
  }, h = (e) => l.include.length > 0 ? !l.include.some((r) => v(e, r)) : l.exclude.some((r) => v(e, r)), y = (e) => {
    if (o(l.globals.Buffer, "dev") && /^buffer$/.test(e))
      return "vite-plugin-node-polyfills/shims/buffer";
    if (o(l.globals.global, "dev") && /^global$/.test(e))
      return "vite-plugin-node-polyfills/shims/global";
    if (o(l.globals.process, "dev") && /^process$/.test(e))
      return "vite-plugin-node-polyfills/shims/process";
    if (e in l.overrides)
      return l.overrides[e];
  }, p = Object.entries(j).reduce((e, [r, i]) => (!l.protocolImports && $(r) || h(r) || (e[r] = y(c(r)) || i), e), {}), f = B(import.meta.url), u = [
    ...o(l.globals.Buffer, "dev") ? [f.resolve("vite-plugin-node-polyfills/shims/buffer")] : [],
    ...o(l.globals.global, "dev") ? [f.resolve("vite-plugin-node-polyfills/shims/global")] : [],
    ...o(l.globals.process, "dev") ? [f.resolve("vite-plugin-node-polyfills/shims/process")] : []
  ], b = [
    ...o(l.globals.Buffer, "dev") ? g.buffer : [],
    ...o(l.globals.global, "dev") ? g.global : [],
    ...o(l.globals.process, "dev") ? g.process : [],
    ""
  ].join(`
`);
  return {
    name: "vite-plugin-node-polyfills",
    config(e, r) {
      const i = r.command === "serve", d = !!this?.meta?.rolldownVersion, m = {
        ...i && o(l.globals.Buffer, "dev") ? { Buffer: "Buffer" } : {},
        ...i && o(l.globals.global, "dev") ? { global: "global" } : {},
        ...i && o(l.globals.process, "dev") ? { process: "process" } : {}
      }, a = {
        // https://github.com/niksy/node-stdlib-browser/blob/3e7cd7f3d115ac5c4593b550e7d8c4a82a0d4ac4/README.md#vite
        ...o(l.globals.Buffer, "build") ? { Buffer: "vite-plugin-node-polyfills/shims/buffer" } : {},
        ...o(l.globals.global, "build") ? { global: "vite-plugin-node-polyfills/shims/global" } : {},
        ...o(l.globals.process, "build") ? { process: "vite-plugin-node-polyfills/shims/process" } : {}
      };
      return {
        build: {
          rollupOptions: {
            onwarn: (t, n) => {
              O(t, () => {
                if (e.build?.rollupOptions?.onwarn)
                  return e.build.rollupOptions.onwarn(t, n);
                n(t);
              });
            },
            ...Object.keys(a).length > 0 ? d ? { inject: a } : { plugins: [x(a)] } : {}
          }
        },
        esbuild: {
          // In dev, the global polyfills need to be injected as a banner in order for isolated scripts (such as Vue SFCs) to have access to them.
          banner: i ? b : void 0
        },
        optimizeDeps: {
          exclude: [
            ...u
          ],
          ...d ? {
            rollupOptions: {
              define: m,
              resolve: {
                // https://github.com/niksy/node-stdlib-browser/blob/3e7cd7f3d115ac5c4593b550e7d8c4a82a0d4ac4/README.md?plain=1#L150
                alias: {
                  ...p
                }
              },
              plugins: [
                {
                  name: "vite-plugin-node-polyfills:optimizer",
                  banner: i ? b : void 0
                }
              ]
            }
          } : {
            esbuildOptions: {
              banner: i ? { js: b } : void 0,
              define: m,
              inject: [
                ...u
              ],
              plugins: [
                T(p),
                // Supress the 'injected path "..." cannot be marked as external' error in Vite 4 (emitted by esbuild).
                // https://github.com/evanw/esbuild/blob/edede3c49ad6adddc6ea5b3c78c6ea7507e03020/internal/bundler/bundler.go#L1469
                {
                  name: "vite-plugin-node-polyfills-shims-resolver",
                  setup(t) {
                    for (const n of u) {
                      const _ = w(n);
                      t.onResolve({ filter: _ }, () => ({
                        // https://github.com/evanw/esbuild/blob/edede3c49ad6adddc6ea5b3c78c6ea7507e03020/internal/bundler/bundler.go#L1468
                        external: !1,
                        path: n
                      }));
                    }
                  }
                }
              ]
            }
          }
        },
        resolve: {
          // https://github.com/niksy/node-stdlib-browser/blob/3e7cd7f3d115ac5c4593b550e7d8c4a82a0d4ac4/README.md?plain=1#L150
          alias: {
            ...p
          }
        }
      };
    }
  };
};
export {
  D as nodePolyfills
};
//# sourceMappingURL=index.js.map
