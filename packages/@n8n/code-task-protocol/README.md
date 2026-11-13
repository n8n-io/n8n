# @n8n/code-task-protocol

The format of the input and result files of a code task. n8n writes the
input file. The code runtime in the sandbox reads it and writes the result
file. n8n reads the result file.

| File | Written by | Read by | Content |
| --- | --- | --- | --- |
| `task.json` | n8n (task builder) | Runtime | Code, mode and the execution data of the task |
| `result.json` | Runtime | n8n | The return value or the user error, and the console entries |

The sandbox service does not read the files. n8n gets the result file inline
in the `done` event of the task. When the result file is too large, n8n
downloads it through the outputs route.

## Versions

n8n and the runtime come from the same n8n release. Each file has a
`version` field. Increase `CODE_TASK_PROTOCOL_VERSION` on every change that an
older reader cannot read. A reader rejects a file with another version.

## Usage

```ts
import { parseCodeTaskInput } from '@n8n/code-task-protocol';

const parsed = parseCodeTaskInput(JSON.parse(content));
if (!parsed.ok) throw parsed.error;
```

## Development

```bash
pnpm build
pnpm test
pnpm lint
```
