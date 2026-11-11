# AST & File Utilities Reference

Helpers available from `../utils/index.js`. Use these instead of writing custom AST traversal.

## ast-utils.ts

### Class/Interface detection

| Function | Returns | Use when |
|----------|---------|----------|
| `isNodeTypeClass(node)` | `boolean` | Check if class implements `INodeType` or extends `Node` |
| `isCredentialTypeClass(node)` | `boolean` | Check if class implements `ICredentialType` |

### Trigger detection

| Function | Returns | Use when |
|----------|---------|----------|
| `isTriggerNode(node, description)` | `boolean` | Default check for "is this node a trigger". True when `group` has `'trigger'` or the class name ends in `Trigger` |
| `isTriggerNodeClass(node)` | `boolean` | The rule checks the `…Trigger` naming convention, or no description object is available |
| `hasTriggerGroup(description)` | `boolean` | Only the `'trigger'` group counts. Returns false when `group` is not an array literal |

None of these checks the `poll()`, `trigger()`, or `webhook()` methods.

### Property finding

| Function | Returns | Use when |
|----------|---------|----------|
| `findClassProperty(node, name)` | `PropertyDefinition \| null` | Find a property on a class (e.g. `description`, `icon`). Does not find methods |
| `findNodeDescriptionObject(node)` | `ObjectExpression \| null` | Get the node `description` object. Also reads `this.description = {…}` in a constructor and looks through `as`/`satisfies` |
| `getPropertyKeyName(property)` | `string \| null` | Get the key name of an object property, class property, or method. `a`, `'a'`, and `['a']` give the same result |
| `findObjectProperty(obj, name)` | `Property \| null` | Find a property in an object literal (Identifier key) |
| `findJsonProperty(obj, name)` | `Property \| null` | Find a property with a Literal key (JSON-style `"key"`) |
| `findArrayLiteralProperty(obj, name)` | `Property \| null` | Find a property whose value is an ArrayExpression |

### Value extraction

| Function | Returns | Use when |
|----------|---------|----------|
| `getLiteralValue(node)` | `string \| boolean \| number \| null` | Extract primitive from a Literal node |
| `getStringLiteralValue(node)` | `string \| null` | Extract string specifically |
| `getBooleanLiteralValue(node)` | `boolean \| null` | Extract boolean specifically |
| `getModulePath(node)` | `string \| null` | Get import path from string literal or template literal |

### Array operations

| Function | Returns | Use when |
|----------|---------|----------|
| `hasArrayLiteralValue(arr, value)` | `boolean` | Check if array contains a specific string literal |
| `extractCredentialInfoFromArray(element)` | `{ name, testedBy } \| null` | Parse credential object from array element |
| `extractCredentialNameFromArray(element)` | `string \| null` | Get just the credential name from array element |

### Method matching

| Function | Returns | Use when |
|----------|---------|----------|
| `isThisHelpersAccess(node)` | `boolean` | Match `this.helpers` member expression |
| `isHelpersAccess(node)` | `boolean` | Match `helpers.x` or `<any chain>.helpers.x` |
| `isExecutionAccess(node)` | `boolean` | Match `$execution.x` or `<any chain>.$execution.x`, e.g. `this.getWorkflowDataProxy(0).$execution.resumeUrl` |
| `isThisMethodCall(node, method)` | `boolean` | Match `this.methodName(...)` calls |
| `isThisHelpersMethodCall(node, method)` | `boolean` | Match `this.helpers.methodName(...)` calls |

### Similarity

| Function | Returns | Use when |
|----------|---------|----------|
| `findSimilarStrings(target, candidates, maxDistance?)` | `string[]` | Suggest similar names (Levenshtein distance) |

## file-utils.ts

### Path operations

| Function | Use when |
|----------|----------|
| `isContainedWithin(child, parent)` | Check path is within a directory |
| `safeJoinPath(base, ...parts)` | Join paths with traversal prevention |

### Package.json

| Function | Returns | Use when |
|----------|---------|----------|
| `findPackageJson(startDir)` | `string \| null` | Walk up to find nearest package.json |
| `readPackageJsonN8n(startDir)` | `N8nPackageJson \| null` | Parse n8n config section |
| `readPackageJsonCredentials(startDir)` | `Set<string>` | Get credential names from package.json |
| `readPackageJsonNodes(startDir)` | `string[]` | Get resolved node file paths |

### File system

| Function | Use when |
|----------|----------|
| `validateIconPath(filePath, iconValue)` | Check icon file exists and is SVG |
| `extractCredentialNameFromFile(filePath)` | Parse credential class name from file |
| `fileExistsWithCaseSync(filePath)` | Case-sensitive existence check |
| `findSimilarSvgFiles(dir, name)` | Suggest similar SVG filenames |

### Credential verification

| Function | Use when |
|----------|----------|
| `areAllCredentialUsagesTestedByNodes(startDir)` | Check all credentials have testedBy |
