import { isAsyncIterable } from '../is-async-iterable';
import { ToolExecutionOptions, ToolExecuteFunction } from './tool';

export async function* executeTool<INPUT, OUTPUT>({
  execute,
  input,
  options,
}: {
  execute: ToolExecuteFunction<INPUT, OUTPUT>;
  input: INPUT;
  options: ToolExecutionOptions;
}): AsyncGenerator<
  { type: 'preliminary'; output: OUTPUT } | { type: 'final'; output: OUTPUT }
> {
  const result = execute(input, options);

  if (isAsyncIterable(result)) {
    let lastOutput: OUTPUT | undefined;
    for await (const output of result) {
      lastOutput = output;
      yield { type: 'preliminary', output };
    }
    yield { type: 'final', output: lastOutput! };
  } else {
    yield { type: 'final', output: await result };
  }
}
