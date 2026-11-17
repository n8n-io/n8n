# @n8n/code-task-contract

The format of the input and result files of a code task. n8n writes the
input file. The code runtime in the sandbox reads it and writes the result
file. n8n reads the result file.

| File | Written by | Read by | Content |
| --- | --- | --- | --- |
| `task.json` | n8n (task builder) | Runtime | Code, mode and the execution data of the task |
| `result.json` | Runtime | n8n | The return value or the user error, the console entries, and the changes to the custom data and static data |

The sandbox service does not read the files. n8n gets the result file inline
in the `done` event of the task. When the result file is too large, n8n
downloads it through the outputs route.

## Usage

```ts
import { parseCodeTaskInput } from '@n8n/code-task-contract';

const parsed = parseCodeTaskInput(JSON.parse(content));
if (!parsed.ok) throw parsed.error;
```

## Development

```bash
pnpm build
pnpm test
pnpm lint
```
