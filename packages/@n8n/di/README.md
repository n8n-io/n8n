## @n8n/di

`@n8n/di` is a dependency injection (DI) container library, based on [`typedi`](https://github.com/typestack/typedi).

n8n no longer uses `typedi` because:

- `typedi` is no longer officially maintained
- Need for future-proofing, e.g. stage-3 decorators
- Small enough that it is worth the maintenance burden
- Easier to customize, e.g. to simplify unit tests

### Usage

```typescript
// from https://github.com/typestack/typedi/blob/develop/README.md
import { Container, Service } from 'typedi';

@Service()
class ExampleInjectedService {
  printMessage() {
    console.log('I am alive!');
  }
}

@Service()
class ExampleService {
  constructor(
    // because we annotated ExampleInjectedService with the @Service()
    // decorator TypeDI will automatically inject an instance of
    // ExampleInjectedService here when the ExampleService class is requested
    // from TypeDI.
    public injectedService: ExampleInjectedService
  ) {}
}

const serviceInstance = Container.get(ExampleService);
// we request an instance of ExampleService from TypeDI

serviceInstance.injectedService.printMessage();
// logs "I am alive!" to the console
```

Requires enabling these flags in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```
