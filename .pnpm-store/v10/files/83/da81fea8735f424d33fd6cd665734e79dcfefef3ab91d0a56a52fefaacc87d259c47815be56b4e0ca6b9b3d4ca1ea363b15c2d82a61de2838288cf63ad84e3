## TypeScript for SPEX

Complete TypeScript 3.x declarations for the [spex] module.

### Inclusion

Typescript should be able to pick up the definitions without any manual configuration.

### Usage

```ts
import * as spexLib from "spex";

const spex:spexLib.ISpex = spexLib(Promise);

type BatchError = spexLib.errors.BatchError;

spex.batch([1, 2, 3])
    .then(data => {
        var r = data[0].anything;
    })
    .catch(error => {
        // error type is either TypeError or BatchError
    });
```

[spex]:https://github.com/vitaly-t/spex
