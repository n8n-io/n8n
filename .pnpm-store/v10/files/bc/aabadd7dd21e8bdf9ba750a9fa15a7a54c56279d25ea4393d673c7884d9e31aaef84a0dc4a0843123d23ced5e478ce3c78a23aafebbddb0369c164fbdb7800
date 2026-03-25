### A base TSConfig for working with Node 12.

Add the package to your `"devDependencies"`:

```sh
npm install --save-dev @tsconfig/node12
yarn add --dev @tsconfig/node12
```

Add to your `tsconfig.json`:

```json
"extends": "@tsconfig/node12/tsconfig.json"
```

---

The `tsconfig.json`: 

```jsonc
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Node 12",

  "compilerOptions": {
    "lib": ["es2019", "es2020.promise", "es2020.bigint", "es2020.string"],
    "module": "commonjs",
    "target": "es2019",

    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  }
}

```

You can find the [code here](https://github.com/tsconfig/bases/blob/master/bases/node12.json).
