// vite.config.mts
import { defineConfig } from "file:///Users/shireenmissi/workspace/n8n/node_modules/.pnpm/vite@5.4.6_@types+node@18.16.16_sass@1.64.1_terser@5.16.1/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
import vue from "file:///Users/shireenmissi/workspace/n8n/node_modules/.pnpm/@vitejs+plugin-vue@5.1.4_vite@5.4.6_@types+node@18.16.16_sass@1.64.1_terser@5.16.1__vue@3.4.21_typescript@5.6.2_/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import icons from "file:///Users/shireenmissi/workspace/n8n/node_modules/.pnpm/unplugin-icons@0.19.0_@vue+compiler-sfc@3.4.21_vue-template-compiler@2.7.14/node_modules/unplugin-icons/dist/vite.js";
import dts from "file:///Users/shireenmissi/workspace/n8n/node_modules/.pnpm/vite-plugin-dts@3.9.1_@types+node@18.16.16_rollup@4.22.2_typescript@5.6.2_vite@5.4.6_@types+n_rcaikbew5ptk64olpe4bf2iruu/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/shireenmissi/workspace/n8n/packages/@n8n/chat";
var includeVue = process.env.INCLUDE_VUE === "true";
var srcPath = resolve(__vite_injected_original_dirname, "src");
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    icons({
      compiler: "vue3",
      autoInstall: true
    }),
    dts()
  ],
  resolve: {
    alias: {
      "@": srcPath,
      "@n8n/chat": srcPath,
      lodash: "lodash-es"
    }
  },
  define: {
    "process.env.NODE_ENV": process.env.NODE_ENV ? `"${process.env.NODE_ENV}"` : '"development"'
  },
  build: {
    emptyOutDir: !includeVue,
    lib: {
      entry: resolve(__vite_injected_original_dirname, "src", "index.ts"),
      name: "N8nChat",
      fileName: (format) => includeVue ? `chat.bundle.${format}.js` : `chat.${format}.js`
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: includeVue ? [] : ["vue"],
      output: {
        exports: "named",
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: includeVue ? {} : {
          vue: "Vue"
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubXRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL3NoaXJlZW5taXNzaS93b3Jrc3BhY2UvbjhuL3BhY2thZ2VzL0BuOG4vY2hhdFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3NoaXJlZW5taXNzaS93b3Jrc3BhY2UvbjhuL3BhY2thZ2VzL0BuOG4vY2hhdC92aXRlLmNvbmZpZy5tdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3NoaXJlZW5taXNzaS93b3Jrc3BhY2UvbjhuL3BhY2thZ2VzL0BuOG4vY2hhdC92aXRlLmNvbmZpZy5tdHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJztcbmltcG9ydCBpY29ucyBmcm9tICd1bnBsdWdpbi1pY29ucy92aXRlJztcbmltcG9ydCBkdHMgZnJvbSAndml0ZS1wbHVnaW4tZHRzJztcblxuY29uc3QgaW5jbHVkZVZ1ZSA9IHByb2Nlc3MuZW52LklOQ0xVREVfVlVFID09PSAndHJ1ZSc7XG5jb25zdCBzcmNQYXRoID0gcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnKTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG5cdHBsdWdpbnM6IFtcblx0XHR2dWUoKSxcblx0XHRpY29ucyh7XG5cdFx0XHRjb21waWxlcjogJ3Z1ZTMnLFxuXHRcdFx0YXV0b0luc3RhbGw6IHRydWUsXG5cdFx0fSksXG5cdFx0ZHRzKCksXG5cdF0sXG5cdHJlc29sdmU6IHtcblx0XHRhbGlhczoge1xuXHRcdFx0J0AnOiBzcmNQYXRoLFxuXHRcdFx0J0BuOG4vY2hhdCc6IHNyY1BhdGgsXG5cdFx0XHRsb2Rhc2g6ICdsb2Rhc2gtZXMnLFxuXHRcdH0sXG5cdH0sXG5cdGRlZmluZToge1xuXHRcdCdwcm9jZXNzLmVudi5OT0RFX0VOVic6IHByb2Nlc3MuZW52Lk5PREVfRU5WID8gYFwiJHtwcm9jZXNzLmVudi5OT0RFX0VOVn1cImAgOiAnXCJkZXZlbG9wbWVudFwiJyxcblx0fSxcblx0YnVpbGQ6IHtcblx0XHRlbXB0eU91dERpcjogIWluY2x1ZGVWdWUsXG5cdFx0bGliOiB7XG5cdFx0XHRlbnRyeTogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMnLCAnaW5kZXgudHMnKSxcblx0XHRcdG5hbWU6ICdOOG5DaGF0Jyxcblx0XHRcdGZpbGVOYW1lOiAoZm9ybWF0KSA9PiAoaW5jbHVkZVZ1ZSA/IGBjaGF0LmJ1bmRsZS4ke2Zvcm1hdH0uanNgIDogYGNoYXQuJHtmb3JtYXR9LmpzYCksXG5cdFx0fSxcblx0XHRyb2xsdXBPcHRpb25zOiB7XG5cdFx0XHQvLyBtYWtlIHN1cmUgdG8gZXh0ZXJuYWxpemUgZGVwcyB0aGF0IHNob3VsZG4ndCBiZSBidW5kbGVkXG5cdFx0XHQvLyBpbnRvIHlvdXIgbGlicmFyeVxuXHRcdFx0ZXh0ZXJuYWw6IGluY2x1ZGVWdWUgPyBbXSA6IFsndnVlJ10sXG5cdFx0XHRvdXRwdXQ6IHtcblx0XHRcdFx0ZXhwb3J0czogJ25hbWVkJyxcblx0XHRcdFx0Ly8gUHJvdmlkZSBnbG9iYWwgdmFyaWFibGVzIHRvIHVzZSBpbiB0aGUgVU1EIGJ1aWxkXG5cdFx0XHRcdC8vIGZvciBleHRlcm5hbGl6ZWQgZGVwc1xuXHRcdFx0XHRnbG9iYWxzOiBpbmNsdWRlVnVlXG5cdFx0XHRcdFx0PyB7fVxuXHRcdFx0XHRcdDoge1xuXHRcdFx0XHRcdFx0XHR2dWU6ICdWdWUnLFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0fSxcblx0fSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVixTQUFTLG9CQUFvQjtBQUM3VyxTQUFTLGVBQWU7QUFDeEIsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sV0FBVztBQUNsQixPQUFPLFNBQVM7QUFKaEIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTSxhQUFhLFFBQVEsSUFBSSxnQkFBZ0I7QUFDL0MsSUFBTSxVQUFVLFFBQVEsa0NBQVcsS0FBSztBQUd4QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMzQixTQUFTO0FBQUEsSUFDUixJQUFJO0FBQUEsSUFDSixNQUFNO0FBQUEsTUFDTCxVQUFVO0FBQUEsTUFDVixhQUFhO0FBQUEsSUFDZCxDQUFDO0FBQUEsSUFDRCxJQUFJO0FBQUEsRUFDTDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1IsT0FBTztBQUFBLE1BQ04sS0FBSztBQUFBLE1BQ0wsYUFBYTtBQUFBLE1BQ2IsUUFBUTtBQUFBLElBQ1Q7QUFBQSxFQUNEO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDUCx3QkFBd0IsUUFBUSxJQUFJLFdBQVcsSUFBSSxRQUFRLElBQUksUUFBUSxNQUFNO0FBQUEsRUFDOUU7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNOLGFBQWEsQ0FBQztBQUFBLElBQ2QsS0FBSztBQUFBLE1BQ0osT0FBTyxRQUFRLGtDQUFXLE9BQU8sVUFBVTtBQUFBLE1BQzNDLE1BQU07QUFBQSxNQUNOLFVBQVUsQ0FBQyxXQUFZLGFBQWEsZUFBZSxNQUFNLFFBQVEsUUFBUSxNQUFNO0FBQUEsSUFDaEY7QUFBQSxJQUNBLGVBQWU7QUFBQTtBQUFBO0FBQUEsTUFHZCxVQUFVLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSztBQUFBLE1BQ2xDLFFBQVE7QUFBQSxRQUNQLFNBQVM7QUFBQTtBQUFBO0FBQUEsUUFHVCxTQUFTLGFBQ04sQ0FBQyxJQUNEO0FBQUEsVUFDQSxLQUFLO0FBQUEsUUFDTjtBQUFBLE1BQ0g7QUFBQSxJQUNEO0FBQUEsRUFDRDtBQUNELENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
