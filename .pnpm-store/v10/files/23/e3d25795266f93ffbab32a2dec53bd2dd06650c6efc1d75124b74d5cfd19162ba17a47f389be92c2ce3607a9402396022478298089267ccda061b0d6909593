**💛 You can help the author become a full-time open-source maintainer by [sponsoring him on GitHub](https://github.com/sponsors/egoist).**

---

# load-tsconfig

[![npm version](https://badgen.net/npm/v/load-tsconfig)](https://npm.im/load-tsconfig) [![npm downloads](https://badgen.net/npm/dm/load-tsconfig)](https://npm.im/load-tsconfig)

> Load `tsconfig.json`, light-weight and dependency-free.

## Install

```bash
npm i load-tsconfig
```

## Usage

```ts
import { loadTsConfig } from "load-tsconfig"

const loaded = loadTsConfig(".")

// loaded is null when no tsconfig is found, or:
// loaded.path -> the path to the tsconfig file
// loaded.data -> the merged tsconfig
// loaded.files -> all discovered tsconfig files (via "extends")
```

By default it loads `./tsconfig.json`, but you can use a custom filename:

```ts
loadTsConfig(".", "tsconfig.build.json")
```

Full type documentation: https://paka.dev/npm/load-tsconfig

## Sponsors

[![sponsors](https://sponsors-images.egoist.sh/sponsors.svg)](https://github.com/sponsors/egoist)

## License

MIT &copy; [EGOIST](https://github.com/sponsors/egoist)
