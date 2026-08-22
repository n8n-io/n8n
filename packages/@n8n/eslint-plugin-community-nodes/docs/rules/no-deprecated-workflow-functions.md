# Disallow usage of deprecated functions and types from n8n-workflow package (`@n8n/community-nodes/no-deprecated-workflow-functions`)

💼 This rule is enabled in the following configs: ✅ `recommended`, ☑️ `recommendedWithoutN8nCloudSupport`.

💡 This rule is manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

<!-- end auto-generated rule header -->

## Rule Details

Prevents usage of deprecated functions from n8n-workflow package and suggests modern alternatives.

A node reaches these helpers through its execution context, which it can hold in
several ways — all of them are reported:

```typescript
this.helpers.request(options); // execute() bound to the context
context.helpers.requestOAuth2.call(context, ...); // context passed into a transport helper
this.executeFunctions.helpers.request(options); // context stored on a class field
const { helpers } = this; // destructured off the context
```

> [!NOTE]
> The rule runs without type information, so it cannot tell which object a
> `helpers` property belongs to. Apart from `this.helpers`, it therefore only
> reports in files that import an execution context interface
> (`IExecuteFunctions`, `ILoadOptionsFunctions`, …) from `n8n-workflow`. The
> check is file-scoped rather than binding-scoped: in such a file, an unrelated
> `someClient.helpers.request()` would also be reported. Silence the rare false
> positive with `// eslint-disable-next-line`.

## Examples

### ❌ Incorrect

```typescript
import { IRequestOptions } from 'n8n-workflow';

export class MyNode implements INodeType {
  async execute(this: IExecuteFunctions) {
    // Using deprecated request helper function
    const response = await this.helpers.request({
      method: 'GET',
      url: 'https://api.example.com/data',
    });

    // Using deprecated type
    const options: IRequestOptions = {
      method: 'POST',
      url: 'https://api.example.com/data',
    };

    return [this.helpers.returnJsonArray([response])];
  }
}
```

### ✅ Correct

```typescript
import { IHttpRequestOptions } from 'n8n-workflow';

export class MyNode implements INodeType {
  async execute(this: IExecuteFunctions) {
    // Using modern httpRequest helper function
    const response = await this.helpers.httpRequest({
      method: 'GET',
      url: 'https://api.example.com/data',
    });

    // Using modern type
    const options: IHttpRequestOptions = {
      method: 'POST',
      url: 'https://api.example.com/data',
    };

    return [this.helpers.returnJsonArray([response])];
  }
}
```
