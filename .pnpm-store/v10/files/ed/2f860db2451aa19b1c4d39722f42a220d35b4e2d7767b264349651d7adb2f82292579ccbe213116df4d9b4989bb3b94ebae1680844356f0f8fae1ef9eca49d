/* eslint-env node */
"use strict";

import globals from "globals";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const mozillaRecommended = require("eslint-plugin-mozilla");
const noUnsanitized = require("eslint-plugin-no-unsanitized");

export default [
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
      },
      globals: {
        ...globals.node,
      },
    },
    files: ["**/*.js"],
    plugins: {
      mozilla: mozillaRecommended,
      "no-unsanitized": noUnsanitized,
    },
    rules: {
      // Can't use everything because this isn't flat-config ready.
      ...mozillaRecommended.configs.recommended.rules,
      "no-inner-declarations": 2,

      "no-shadow": 2,

      "no-unused-vars": [
        2,
        {
          vars: "all",
          args: "none",
        },
      ],
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        it: "readonly",
        describe: "readonly",
        before: "readonly",
      },
    },
    rules: {
      "no-console": 0,
    },
  },
];
