import jsdoc from "eslint-plugin-jsdoc";
import eslintjs from "@eslint/js";

const {configs: eslintConfigs} = eslintjs;

export default [
  jsdoc.configs["flat/recommended"],
  eslintConfigs["recommended"],
  {
    languageOptions: {
      // if we ever use more globals than this, pull in the `globals` package
      globals: {
        console: false
      }
    },
    rules: {
      "jsdoc/require-param-description": "off",
      "jsdoc/require-returns-description": "off",
      "jsdoc/tag-lines": ["error", "any", { startLines: 1 }],
      "no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }]
    },
  },
];
