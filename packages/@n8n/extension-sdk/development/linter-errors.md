# Linter Errors Report

**Generated:** 2025-07-31T06:57:09.710Z
**Total Issues:** 5 (0 errors, 5 warnings)
**Files:** 2

## create-json-schema.ts (eslint)

**File Path:** `/Users/jeremyparker/Desktop/Claude Coding Projects/n8n/packages/@n8n/extension-sdk/scripts/create-json-schema.ts`
**Issues:** 3

⚠️ **Line 0:1** - This rule requires the `strictNullChecks` compiler option to be turned on to function correctly. `[@typescript-eslint/no-unnecessary-boolean-literal-compare]`

⚠️ **Line 0:1** - This rule requires the `strictNullChecks` compiler option to be turned on to function correctly. `[@typescript-eslint/prefer-nullish-coalescing]`

⚠️ **Line 16:1** - Promises must be awaited, end with a call to .catch, end with a call to .then with a rejection handler or be explicitly marked as ignored with the `void` operator. `[@typescript-eslint/no-floating-promises]`

---

## tsup.config.ts (eslint)

**File Path:** `/Users/jeremyparker/Desktop/Claude Coding Projects/n8n/packages/@n8n/extension-sdk/tsup.config.ts`
**Issues:** 2

⚠️ **Line 0:1** - This rule requires the `strictNullChecks` compiler option to be turned on to function correctly. `[@typescript-eslint/no-unnecessary-boolean-literal-compare]`

⚠️ **Line 0:1** - This rule requires the `strictNullChecks` compiler option to be turned on to function correctly. `[@typescript-eslint/prefer-nullish-coalescing]`

---

## 💡 Ignore File Configuration

Some linting issues may be in files that shouldn't be linted. **Important:** Only modify ignore files (.ruffignore, .eslintignore, etc.) if there are genuine files that are inappropriate for linting (generated files, vendor dependencies, etc.). Do not use ignore files as a quick fix for linter errors that should be resolved in the code itself. Consider updating your ignore files:

**General patterns (both `.ruffignore` and `.eslintignore`):**
```
dist/
.vite/
```

---

