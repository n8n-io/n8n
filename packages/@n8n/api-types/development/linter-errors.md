# Linter Errors Report

**Generated:** 2025-08-01T19:35:02.143Z
**Total Issues:** 6 (0 errors, 6 warnings)
**Files:** 3

## user.schema.ts (eslint)

**File Path:** `/Users/jeremyparker/Desktop/Claude Coding Projects/n8n/packages/@n8n/api-types/src/schemas/user.schema.ts`
**Issues:** 4

⚠️ **Line 7:2** - Object Literal Property name `Owner` must match one of the following formats: camelCase, snake_case, UPPER_CASE `[@typescript-eslint/naming-convention]`

⚠️ **Line 8:2** - Object Literal Property name `Member` must match one of the following formats: camelCase, snake_case, UPPER_CASE `[@typescript-eslint/naming-convention]`

⚠️ **Line 9:2** - Object Literal Property name `Admin` must match one of the following formats: camelCase, snake_case, UPPER_CASE `[@typescript-eslint/naming-convention]`

⚠️ **Line 10:2** - Object Literal Property name `Default` must match one of the following formats: camelCase, snake_case, UPPER_CASE `[@typescript-eslint/naming-convention]`

---

## saml-acs.dto.ts (eslint)

**File Path:** `/Users/jeremyparker/Desktop/Claude Coding Projects/n8n/packages/@n8n/api-types/src/dto/saml/saml-acs.dto.ts`
**Issues:** 1

⚠️ **Line 5:2** - Object Literal Property name `RelayState` must match one of the following formats: camelCase, snake_case, UPPER_CASE `[@typescript-eslint/naming-convention]`

---

## hot-reload.ts (eslint)

**File Path:** `/Users/jeremyparker/Desktop/Claude Coding Projects/n8n/packages/@n8n/api-types/src/push/hot-reload.ts`
**Issues:** 1

⚠️ **Line 18:8** - The `{}` ("empty object") type allows any non-nullish value, including literals like `0` and `""`.
- If that's what you want, disable this lint rule with an inline comment or configure the 'allowObjectTypes' rule option.
- If you want a type meaning "any object", you probably want `object` instead.
- If you want a type meaning "any value", you probably want `unknown` instead. `[@typescript-eslint/no-empty-object-type]`

---

