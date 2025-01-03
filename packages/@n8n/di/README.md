## @n8n/di

`@n8n/di` is a lightweight dependency injection (DI) container designed to manage and resolve dependencies in a clean and efficient manner.

### Usage

To use `@n8n/di` in your project, simply import the `Service` decorator and the `Container` instance:

```typescript
import { Service, Container } from '@n8n/di';

@Service()
class MyService {
  // Your service implementation
}

const instance = Container.get(MyService);
```

Note: In your `tsconfig.json`, ensure that the `emitDecoratorMetadata` and `experimentalDecorators` options are enabled:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```


### Why Replace `typedi`?

While `typedi` has served us well in the past, the decision to replace it was driven by the need for a more maintainable, future-proof, and tailored solution. `@n8n/di` addresses these needs while maintaining a respectful acknowledgment of the contributions `typedi` has made to the ecosystem.

1. **Maintenance and Future-Proofing**: While `typedi` has been a reliable DI solution, it is currently unmaintained, and its future compatibility with modern JavaScript/TypeScript features, such as stage-3 decorators, is uncertain. `@n8n/di` was developed to ensure long-term maintainability and compatibility with evolving language standards.

2. **Simplified API**: `@n8n/di` focuses on providing a minimal and straightforward API that meets the specific needs of the n8n project. It avoids the complexity and overhead of features that are not required, making it easier to use and understand.

3. **Enhanced Testing Support**: One of the key motivations behind `@n8n/di` is to improve the testing experience. The package includes utilities that simplify the creation of service instances during tests by allowing developers to mock dependencies easily. This reduces the need for repetitive `mock()` calls and makes test setups more concise and maintainable.

4. **Custom-Tailored for n8n**: `@n8n/di` is specifically designed to align with the architectural patterns and requirements of the n8n project. By building a custom DI solution, we can ensure that it integrates seamlessly with our codebase and supports our development workflow effectively.
