### A base TSConfig for working with Node 14.

Add the package to your `"devDependencies"`:

```sh
npm install --save-dev @tsconfig/node14
yarn add --dev @tsconfig/node14
```

Add to your `tsconfig.json`:

```json
"extends": "@tsconfig/node14/tsconfig.json"
```

---

The `tsconfig.json`: 

```jsonc
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Node 14",

  "compilerOptions": {
    "lib": ["es2020"],
    "module": "commonjs",
    "target": "es2020",

    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  }
}

```

You can find the [code here](https://github.com/tsconfig/bases/blob/master/bases/node14.json).
