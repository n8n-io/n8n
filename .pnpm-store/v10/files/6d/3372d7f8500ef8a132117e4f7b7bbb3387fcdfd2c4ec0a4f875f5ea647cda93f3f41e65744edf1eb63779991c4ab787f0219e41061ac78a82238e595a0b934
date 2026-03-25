# @jest/types

This package contains shared types of Jest's packages.

If you are looking for types of [Jest globals](https://jestjs.io/docs/api), you can import them from `@jest/globals` package:

```ts
import {describe, expect, it} from '@jest/globals';

describe('my tests', () => {
  it('works', () => {
    expect(1).toBe(1);
  });
});
```

If you prefer to omit imports, a similar result can be achieved installing the [@types/jest](https://npmjs.com/package/@types/jest) package. Note that this is a third party library maintained at [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/jest) and may not cover the latest Jest features.

Another use-case for `@types/jest` is a typed Jest config as those types are not provided by Jest out of the box:

```ts
// jest.config.ts
import {Config} from '@jest/types';

const config: Config.InitialOptions = {
  // some typed config
};

export default config;
```
