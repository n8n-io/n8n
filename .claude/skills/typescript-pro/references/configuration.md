# TypeScript Configuration

## Strict Mode Configuration

```json
{
  "compilerOptions": {
    // Strict type checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Additional checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,

    // Module resolution
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,

    // Emit
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "importHelpers": true,

    // Interop
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    // Target
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    // Skip checking
    "skipLibCheck": true
  }
}
```

## Project References

```json
// Root tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/frontend" },
    { "path": "./packages/backend" }
  ]
}

// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"]
}

// packages/frontend/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../shared" }
  ],
  "include": ["src/**/*"]
}
```

## Module Resolution Strategies

```json
// Node16/NodeNext (recommended for Node.js)
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true
  }
}

// Bundler (for bundlers like Vite, esbuild)
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "moduleDetection": "force"
  }
}

// Classic (legacy, avoid)
{
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node"
  }
}
```

## Path Mapping

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"],
      "@shared/*": ["../shared/src/*"],
      "@types": ["src/types/index.ts"]
    }
  }
}
```

```typescript
// Usage with path mapping
import { Button } from '@components/Button';
import { formatDate } from '@utils/date';
import type { User } from '@types';
```

## Incremental Compilation

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo",
    "composite": true
  }
}
```

## Declaration Files

```json
{
  "compilerOptions": {
    // Generate .d.ts files
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": false,

    // Bundle declarations
    "declarationDir": "./types",

    // For libraries
    "stripInternal": true
  }
}
```

```typescript
// Using JSDoc for .d.ts generation
/**
 * Creates a user
 * @param name - User's name
 * @param email - User's email
 * @returns The created user
 * @example
 * ```ts
 * const user = createUser('John', 'john@example.com');
 * ```
 */
export function createUser(name: string, email: string): User {
  return { id: generateId(), name, email };
}
```

## Build Optimization

```json
{
  "compilerOptions": {
    // Performance
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,

    // Faster builds
    "incremental": true,
    "assumeChangesOnlyAffectDirectDependencies": true,

    // Smaller output
    "removeComments": true,
    "importHelpers": true,

    // Tree shaking support
    "module": "ESNext",
    "target": "ES2020"
  }
}
```

## Multiple Configurations

```json
// tsconfig.json (base)
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022"
  }
}

// tsconfig.build.json (production)
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "sourceMap": false,
    "removeComments": true,
    "declaration": true
  },
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}

// tsconfig.test.json (testing)
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"],
    "esModuleInterop": true
  },
  "include": ["src/**/*.test.ts", "src/**/*.spec.ts"]
}
```

## Framework-Specific Configs

```json
// React + Vite
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true
  }
}

// Next.js
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

// Node.js + Express
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

## Custom Type Definitions

```typescript
// src/types/global.d.ts
declare global {
  interface Window {
    myApp: {
      version: string;
      config: AppConfig;
    };
  }

  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      API_KEY: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};

// src/types/modules.d.ts
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module 'untyped-library' {
  export function doSomething(value: string): number;
}
```

## Compiler API Usage

```typescript
// programmatic compilation
import ts from 'typescript';

function compile(fileNames: string[], options: ts.CompilerOptions): void {
  const program = ts.createProgram(fileNames, options);
  const emitResult = program.emit();

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start!
      );
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      );
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      );
    } else {
      console.log(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      );
    }
  });

  const exitCode = emitResult.emitSkipped ? 1 : 0;
  console.log(`Process exiting with code '${exitCode}'.`);
  process.exit(exitCode);
}

compile(['src/index.ts'], {
  noEmitOnError: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  strict: true
});
```

## Performance Monitoring

```json
{
  "compilerOptions": {
    "diagnostics": true,
    "extendedDiagnostics": true,
    "generateCpuProfile": "profile.cpuprofile",
    "explainFiles": true
  }
}
```

```bash
# Run with diagnostics
tsc --diagnostics

# Extended diagnostics
tsc --extendedDiagnostics

# Generate trace
tsc --generateTrace trace

# Analyze with @typescript/analyze-trace
npx @typescript/analyze-trace trace
```

## Quick Reference

| Option | Purpose |
|--------|---------|
| `strict` | Enable all strict checks |
| `composite` | Enable project references |
| `incremental` | Enable incremental compilation |
| `skipLibCheck` | Skip .d.ts checking for faster builds |
| `esModuleInterop` | Better CommonJS interop |
| `moduleResolution` | How modules are resolved |
| `paths` | Path mapping for imports |
| `declaration` | Generate .d.ts files |
| `sourceMap` | Generate source maps |
| `noEmit` | Don't emit output (type check only) |
| `isolatedModules` | Each file can be transpiled separately |
| `allowImportingTsExtensions` | Import .ts files directly |
