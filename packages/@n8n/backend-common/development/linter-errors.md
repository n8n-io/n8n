# Linter Errors Report

**Generated:** 2025-08-03T01:27:22.910Z
**Total Issues:** 17 (0 errors, 17 warnings)
**Files:** 2

## logger.test.ts (eslint)

**File Path:** `/Users/jeremyparker/Desktop/Claude Coding Projects/n8n/packages/@n8n/backend-common/src/logging/__tests__/logger.test.ts`
**Issues:** 15

⚠️ **Line 1:34** - Unsafe return of a value of type `any`. `[@typescript-eslint/no-unsafe-return]`

⚠️ **Line 3:2** - Object Literal Property name `LoggerProxy` must match one of the following formats: camelCase, snake_case, UPPER_CASE `[@typescript-eslint/naming-convention]`

⚠️ **Line 99:17** - Use `jsonParse()` from `n8n-workflow` or surround the `JSON.parse()` call with a try/catch block. `[n8n-local-rules/no-uncaught-json-parse]`

⚠️ **Line 99:17** - Unsafe return of a value of type `any`. `[@typescript-eslint/no-unsafe-return]`

⚠️ **Line 100:10** - Unsafe assignment of an `any` value. `[@typescript-eslint/no-unsafe-assignment]`

⚠️ **Line 100:25** - Use `jsonParse()` from `n8n-workflow` or surround the `JSON.parse()` call with a try/catch block. `[n8n-local-rules/no-uncaught-json-parse]`

⚠️ **Line 107:6** - Unsafe assignment of an `any` value. `[@typescript-eslint/no-unsafe-assignment]`

⚠️ **Line 164:17** - Use `jsonParse()` from `n8n-workflow` or surround the `JSON.parse()` call with a try/catch block. `[n8n-local-rules/no-uncaught-json-parse]`

⚠️ **Line 164:17** - Unsafe return of a value of type `any`. `[@typescript-eslint/no-unsafe-return]`

⚠️ **Line 165:10** - Unsafe assignment of an `any` value. `[@typescript-eslint/no-unsafe-assignment]`

⚠️ **Line 165:25** - Use `jsonParse()` from `n8n-workflow` or surround the `JSON.parse()` call with a try/catch block. `[n8n-local-rules/no-uncaught-json-parse]`

⚠️ **Line 213:17** - Use `jsonParse()` from `n8n-workflow` or surround the `JSON.parse()` call with a try/catch block. `[n8n-local-rules/no-uncaught-json-parse]`

⚠️ **Line 213:17** - Unsafe return of a value of type `any`. `[@typescript-eslint/no-unsafe-return]`

⚠️ **Line 214:10** - Unsafe assignment of an `any` value. `[@typescript-eslint/no-unsafe-assignment]`

⚠️ **Line 214:25** - Use `jsonParse()` from `n8n-workflow` or surround the `JSON.parse()` call with a try/catch block. `[n8n-local-rules/no-uncaught-json-parse]`

---

## module-registry.test.ts (eslint)

**File Path:** `/Users/jeremyparker/Desktop/Claude Coding Projects/n8n/packages/@n8n/backend-common/src/modules/__tests__/module-registry.test.ts`
**Issues:** 2

⚠️ **Line 159:10** - Avoid referencing unbound methods which may cause unintentional scoping of `this`.
If your function does not access `this`, you can annotate it with `this: void`, or consider using an arrow function instead. `[@typescript-eslint/unbound-method]`

⚠️ **Line 184:34** - Unsafe argument of type `any` assigned to a parameter of type `"external-secrets" | "insights"`. `[@typescript-eslint/no-unsafe-argument]`

---

