module.exports = {
  plugins: ["prefer-arrow", "import", "prettier", "unused-imports", "jsdoc"],
  extends: [
    "eslint:recommended",
    "plugin:import/recommended",
    "plugin:prettier/recommended",
    "prettier",
    "plugin:jsdoc/recommended",
  ],
  rules: {
    "jsdoc/require-jsdoc": [
      "error",
      {
        contexts: [
          "TSTypeAliasDeclaration",
          "TSInterfaceDeclaration",
          "TSMethodSignature",
          // "TSPropertySignature",
          "TSDeclareFunction",
          "TSEnumDeclaration",
        ],
        require: {
          ArrowFunctionExpression: true,
          ClassDeclaration: true,
          ClassExpression: true,
          FunctionDeclaration: true,
          FunctionExpression: true,
          MethodDefinition: true,
        },
      },
    ],
    "jsdoc/require-param-type": "off",
    "jsdoc/require-returns-type": "off",
    "prettier/prettier": "error",
    "import/extensions": "off",
    "import/no-unresolved": ["error", { caseSensitiveStrict: true }],
    "import/prefer-default-export": "off",
    "import/no-duplicates": "error",
    complexity: ["error", 8],
    "max-lines": ["error", 200],
    "max-depth": ["error", 3],
    "max-params": ["error", 4],
    eqeqeq: ["error", "smart"],
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
        optionalDependencies: false,
        peerDependencies: false,
      },
    ],
    "no-shadow": ["error", { hoist: "all" }],
    "prefer-const": "error",
    "padding-line-between-statements": [
      "error",
      {
        blankLine: "always",
        prev: "*",
        next: "return",
      },
    ],
    "prefer-arrow/prefer-arrow-functions": [
      "error",
      {
        disallowPrototype: true,
        singleReturnOnly: false,
        classPropertiesAllowed: false,
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "lodash",
            message: "Please use lodash/{module} import instead",
          },
          {
            name: ".",
            message: "Please use explicit import file",
          },
        ],
      },
    ],
    curly: ["error", "all"],
    "arrow-body-style": ["error", "as-needed"],
  },
  settings: {
    jsdoc: {
      ignorePrivate: true,
      ignoreInternal: true,
    },
  },
  root: true,
  env: {
    es6: true,
    node: true,
    jest: true,
    browser: true,
  },
  parserOptions: {
    ecmaVersion: 9,
    sourceType: "module",
  },
  overrides: [
    {
      files: ["**/*.ts?(x)"],
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:prettier/recommended",
      ],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "tsconfig.json",
      },
      settings: { "import/resolver": { typescript: {} } },
      rules: {
        "@typescript-eslint/prefer-optional-chain": "error",
        "no-shadow": "off",
        "@typescript-eslint/no-shadow": "error",
        "@typescript-eslint/prefer-nullish-coalescing": "error",
        "@typescript-eslint/strict-boolean-expressions": "error",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-member-accessibility": "off",
        "@typescript-eslint/camelcase": "off",
        "unused-imports/no-unused-imports": "error",
        "@typescript-eslint/interface-name-prefix": "off",
        "@typescript-eslint/explicit-module-boundary-types": "error",
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-unused-vars": "error",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
        "@typescript-eslint/no-unnecessary-condition": "error",
        "@typescript-eslint/no-unnecessary-type-arguments": "error",
        "@typescript-eslint/prefer-string-starts-ends-with": "error",
        "@typescript-eslint/switch-exhaustiveness-check": "error",
        // plugin:prettier/recommended turns off arrow-body-style so it is turned back on here
        // But a bug can occur and prettier can provide an invalid code (missing closing parenthesis)
        // More details here: https://github.com/prettier/eslint-plugin-prettier#arrow-body-style-and-prefer-arrow-callback-issue
        "arrow-body-style": ["error", "as-needed"],
      },
    },
    {
      files: ["**/*.test.ts", "scripts/*.ts"],
      rules: {
        "max-lines": ["off"],
        "jsdoc/require-jsdoc": ["off"],
      },
    },
  ],
};
