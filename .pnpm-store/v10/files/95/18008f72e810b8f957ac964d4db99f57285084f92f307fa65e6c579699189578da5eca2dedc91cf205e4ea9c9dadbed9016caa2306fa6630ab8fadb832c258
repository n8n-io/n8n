# LangChain google-vertexai

This package contains resources to access Google AI/ML models
and other Google services via Vertex AI. Authorization to these
services use service account credentials stored on the local
file system or provided through the Google Cloud Platform
environment it is running on.

If you are running this on a platform where the credentials cannot
be provided this way, consider using the @langchain/google-vertexai-web
package _instead_. You do not need to use both packages. See the
section on **Authorization** below.

## Installation

```bash
$ pnpm install @langchain/google-vertexai
```

## Authorization

Authorization is done through a Google Cloud Service Account.

To handle service accounts, this package uses the `google-auth-library`
package, and you may wish to consult the documentation for that library
about how it does so. But in short, classes in this package will use
credentials from the first of the following that apply:

1. An API Key that is passed to the constructor using the `apiKey` attribute
2. Credentials that are passed to the constructor using the `authInfo` attribute
3. An API Key that is set in the environment variable `API_KEY`
4. The Service Account credentials that are saved in a file. The path to
   this file is set in the `GOOGLE_APPLICATION_CREDENTIALS` environment
   variable.
5. If you are running on a Google Cloud Platform resource, or if you have
   logged in using `gcloud auth application-default login`, then the
   default credentials.

## Tool Schema Limitations

When using tools with Gemini models through Vertex AI, be aware of the following Zod schema limitations:

### Unsupported Schema Features

1. **Discriminated Unions** - `.discriminatedUnion()` is not supported

   ```typescript
   // ❌ This will throw an error
   z.discriminatedUnion("type", [
     z.object({ type: z.literal("a"), value: z.string() }),
     z.object({ type: z.literal("b"), value: z.number() }),
   ]);

   // ✅ Use a flat object with optional fields instead
   z.object({
     type: z.enum(["a", "b"]),
     stringValue: z.string().optional(),
     numberValue: z.number().optional(),
   });
   ```

2. **Union Types** - `z.union()` is not supported

   ```typescript
   // ❌ This will throw an error
   z.union([z.string(), z.number()]);

   // ✅ Consider using separate optional fields
   z.object({
     stringValue: z.string().optional(),
     numberValue: z.number().optional(),
   });
   ```

3. **Positive Refinement** - `.positive()` is automatically converted

   ```typescript
   // ⚠️ This is automatically converted to .min(0.01)
   z.number().positive();

   // ✅ Prefer using .min() directly
   z.number().min(0.01);
   ```

### Error Messages

If you use unsupported schema features, you'll receive descriptive error messages:

- For union types: `"Gemini cannot handle union types (discriminatedUnion, anyOf, oneOf)"`
- For tool conversion failures: `"Failed to convert tool '[toolName]' schema for Gemini"`

### Best Practices

1. Use simple, flat object structures when possible
2. Replace discriminated unions with enums and optional fields
3. Use `.min()` instead of `.positive()` for number constraints
4. Test your tool schemas before deploying to production
