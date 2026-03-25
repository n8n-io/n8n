import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import { sync } from "rimraf";

function config({ format, minify, input, ext = "js" }) {
  const dir = `dist/${format}/`;
  const minifierSuffix = minify ? ".min" : "";
  return {
    input: `./src/${input}.ts`,
    output: {
      name: "Comlink",
      file: `${dir}/${input}${minifierSuffix}.${ext}`,
      format,
      sourcemap: true,
    },
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
        compilerOptions: {
          declaration: true,
          declarationDir: ".",
          sourceMap: true,
          outDir: "dist",
        },
      }),
      minify
        ? terser({
            compress: true,
            mangle: true,
          })
        : undefined,
    ].filter(Boolean),
  };
}

sync("dist");

export default [
  { input: "comlink", format: "esm", minify: false, ext: "mjs" },
  { input: "comlink", format: "esm", minify: true, ext: "mjs" },
  { input: "comlink", format: "esm", minify: false },
  { input: "comlink", format: "esm", minify: true },
  { input: "comlink", format: "umd", minify: false },
  { input: "comlink", format: "umd", minify: true },
  { input: "node-adapter", format: "esm", minify: false, ext: "mjs" },
  { input: "node-adapter", format: "esm", minify: true, ext: "mjs" },
  { input: "node-adapter", format: "umd", minify: false },
  { input: "node-adapter", format: "umd", minify: true },
].map(config);
