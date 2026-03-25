import { BetaRunnableTool, Promisable } from '../../lib/tools/BetaRunnableTool';
import { BetaMemoryTool20250818Command, BetaToolResultContentBlockParam } from '../../resources/beta';

type Command = BetaMemoryTool20250818Command['command'];

export type MemoryToolHandlers = {
  [K in Command]: (
    command: Extract<BetaMemoryTool20250818Command, { command: K }>,
  ) => Promisable<string | Array<BetaToolResultContentBlockParam>>;
};

export function betaMemoryTool(
  handlers: MemoryToolHandlers,
): BetaRunnableTool<BetaMemoryTool20250818Command> {
  return {
    type: 'memory_20250818',
    name: 'memory',
    parse: (content) => content as BetaMemoryTool20250818Command,
    run: (args) => {
      const handler = handlers[args.command];
      if (!handler) {
        throw new Error(`${args.command} not implemented`);
      }

      return handler.bind(handlers)(args as any);
    },
  };
}
