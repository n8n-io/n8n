# types.ts

> Shared TypeScript definitions for Octokit projects

[![@latest](https://img.shields.io/npm/v/@octokit/types.svg)](https://www.npmjs.com/package/@octokit/types)
[![Build Status](https://github.com/octokit/types.ts/workflows/Test/badge.svg)](https://github.com/octokit/types.ts/actions?workflow=Test)

<!-- toc -->

- [Usage](#usage)
- [Examples](#examples)
  - [Get parameter and response data types for a REST API endpoint](#get-parameter-and-response-data-types-for-a-rest-api-endpoint)
  - [Get response types from endpoint methods](#get-response-types-from-endpoint-methods)
- [Contributing](#contributing)
- [License](#license)

<!-- tocstop -->

## Usage

See all exported types at https://octokit.github.io/types.ts

## Examples

### Get parameter and response data types for a REST API endpoint

```ts
import { Endpoints } from "@octokit/types";

type listUserReposParameters =
  Endpoints["GET /repos/{owner}/{repo}"]["parameters"];
type listUserReposResponse = Endpoints["GET /repos/{owner}/{repo}"]["response"];

async function listRepos(
  options: listUserReposParameters,
): listUserReposResponse["data"] {
  // ...
}
```

### Get response types from endpoint methods

```ts
import {
  GetResponseTypeFromEndpointMethod,
  GetResponseDataTypeFromEndpointMethod,
} from "@octokit/types";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit();
type CreateLabelResponseType = GetResponseTypeFromEndpointMethod<
  typeof octokit.issues.createLabel
>;
type CreateLabelResponseDataType = GetResponseDataTypeFromEndpointMethod<
  typeof octokit.issues.createLabel
>;
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE)
