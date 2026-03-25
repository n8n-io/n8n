import fs from "fs";
import dts from "rollup-plugin-dts";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

const licenseHeaderES3 = fs.readFileSync("src/license_header.es3.txt", { encoding: "utf8" }),
  licenseHeaderES6 = fs.readFileSync("src/license_header.es6.txt", { encoding: "utf8" });

export default [
  {
    input: "src/sha.ts",
    output: {
      name: "jsSHA",
      banner: licenseHeaderES3,
      format: "umd",
      sourcemap: true,
      dir: "dist",
      entryFileNames: "[name].js",
    },
    plugins: [
      typescript({ lib: ["es6"], declaration: true, declarationDir: "dist/types", target: "es3" }),
      terser({
        output: { comments: /BSD/ },
        mangle: {
          properties: { keep_quoted: true, reserved: ["jsSHA", "getHash", "setHMACKey", "getHMAC", "update"] },
        },
      }),
    ],
  },
  {
    input: "src/sha.ts",
    output: {
      name: "jsSHA",
      banner: licenseHeaderES6,
      format: "es",
      sourcemap: true,
      file: "dist/sha.mjs",
    },
    plugins: [
      typescript({ lib: ["es6"], target: "es6" }),
      terser({
        output: { comments: /BSD/ },
        mangle: {
          properties: { keep_quoted: true, reserved: ["jsSHA", "getHash", "setHMACKey", "getHMAC", "update"] },
        },
      }),
    ],
  },
  {
    input: "dist/types/src/sha.d.ts",
    output: [{ file: "dist/sha.d.ts", format: "umd" }],
    plugins: [dts()],
  },
  {
    input: "src/sha1.ts",
    output: {
      name: "jsSHA",
      banner: licenseHeaderES3,
      format: "umd",
      file: "dist/sha1.js",
    },
    plugins: [
      typescript({ lib: ["es6"], target: "es3" }),
      terser({
        output: { comments: /BSD/ },
        mangle: {
          properties: { keep_quoted: true, reserved: ["jsSHA", "getHash", "setHMACKey", "getHMAC", "update"] },
        },
      }),
    ],
  },
  {
    input: "src/sha1.ts",
    output: {
      name: "jsSHA",
      banner: licenseHeaderES6,
      format: "es",
      file: "dist/sha1.mjs",
    },
    plugins: [
      typescript({ lib: ["es6"], target: "es6" }),
      terser({
        output: { comments: /BSD/ },
        mangle: {
          properties: { keep_quoted: true, reserved: ["jsSHA", "getHash", "setHMACKey", "getHMAC", "update"] },
        },
      }),
    ],
  },
  {
    input: "dist/types/src/sha1.d.ts",
    output: [{ file: "dist/sha1.d.ts", format: "umd" }],
    plugins: [dts()],
  },
  {
    input: "src/sha256.ts",
    output: {
      name: "jsSHA",
      banner: licenseHeaderES3,
      format: "umd",
      file: "dist/sha256.js",
    },
    plugins: [
      typescript({ lib: ["es6"], target: "es3" }),
      terser({
        output: { comments: /BSD/ },
        mangle: {
          properties: { keep_quoted: true, reserved: ["jsSHA", "getHash", "setHMACKey", "getHMAC", "update"] },
        },
      }),
    ],
  },
  {
    input: "src/sha256.ts",
    output: {
      name: "jsSHA",
      banner: licenseHeaderES6,
      format: "es",
      file: "dist/sha256.mjs",
    },
    plugins: [
      typescript({ lib: ["es6"], target: "es6" }),
      terser({
        output: { comments: /BSD/ },
        mangle: {
          properties: { keep_quoted: true, reserved: ["jsSHA", "getHash", "setHMACKey", "getHMAC", "update"] },
        },
      }),
    ],
  },
  {
    input: "dist/types/src/sha256.d.ts",
    output: [{ file: "dist/sha256.d.ts", format: "umd" }],
    plugins: [dts()],
  },
  {
    input: "src/sha512.ts",
    output: {
      name: "jsSHA",
      banner: licenseHeaderES3,
      format: "umd",
      file: "dist/sha512.js",
    },
    plugins: [
      typescript({ lib: ["es6"], target: "es3" }),
      terser({
        output: { comments: /BSD/ },
        mangle: {
          properties: { keep_quoted: true, reserved: ["jsSHA", "getHash", "setHMACKey", "getHMAC", "update"] },
        },
      }),
    ],
  },
  {
    input: "src/sha512.ts",
    output: {
      name: "jsSHA",
      banner: licenseHeaderES6,
      format: "es",
      file: "dist/sha512.mjs",
    },
    plugins: [
      typescript({ lib: ["es6"], target: "es6" }),
      terser({
        output: { comments: /BSD/ },
        mangle: {
          properties: { keep_quoted: true, reserved: ["jsSHA", "getHash", "setHMACKey", "getHMAC", "update"] },
        },
      }),
    ],
  },
  {
    input: "dist/types/src/sha512.d.ts",
    output: [{ file: "dist/sha512.d.ts", format: "umd" }],
    plugins: [dts()],
  },
  {
    input: "src/sha3.ts",
    output: {
      name: "jsSHA",
      banner: licenseHeaderES3,
      format: "umd",
      file: "dist/sha3.js",
    },
    plugins: [
      typescript({ lib: ["es6"], target: "es3" }),
      terser({
        output: { comments: /BSD/ },
        mangle: {
          properties: { keep_quoted: true, reserved: ["jsSHA", "getHash", "setHMACKey", "getHMAC", "update"] },
        },
      }),
    ],
  },
  {
    input: "src/sha3.ts",
    output: {
      name: "jsSHA",
      banner: licenseHeaderES6,
      format: "es",
      file: "dist/sha3.mjs",
    },
    plugins: [
      typescript({ lib: ["es6"], target: "es6" }),
      terser({
        output: { comments: /BSD/ },
        mangle: {
          properties: { keep_quoted: true, reserved: ["jsSHA", "getHash", "setHMACKey", "getHMAC", "update"] },
        },
      }),
    ],
  },
  {
    input: "dist/types/src/sha3.d.ts",
    output: [{ file: "dist/sha3.d.ts", format: "umd" }],
    plugins: [dts()],
  },
];
