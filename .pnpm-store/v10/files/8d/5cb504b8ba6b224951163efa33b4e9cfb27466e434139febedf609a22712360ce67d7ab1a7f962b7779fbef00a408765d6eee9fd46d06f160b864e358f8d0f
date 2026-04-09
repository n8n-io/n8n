import { tool, Tool, ToolExecuteFunction } from './types/tool';
import { FlexibleSchema } from './schema';

export type ProviderToolFactory<INPUT, ARGS extends object> = <OUTPUT>(
  options: ARGS & {
    execute?: ToolExecuteFunction<INPUT, OUTPUT>;
    needsApproval?: Tool<INPUT, OUTPUT>['needsApproval'];
    toModelOutput?: Tool<INPUT, OUTPUT>['toModelOutput'];
    onInputStart?: Tool<INPUT, OUTPUT>['onInputStart'];
    onInputDelta?: Tool<INPUT, OUTPUT>['onInputDelta'];
    onInputAvailable?: Tool<INPUT, OUTPUT>['onInputAvailable'];
  },
) => Tool<INPUT, OUTPUT>;

export function createProviderToolFactory<INPUT, ARGS extends object>({
  id,
  inputSchema,
}: {
  id: `${string}.${string}`;
  inputSchema: FlexibleSchema<INPUT>;
}): ProviderToolFactory<INPUT, ARGS> {
  return <OUTPUT>({
    execute,
    outputSchema,
    needsApproval,
    toModelOutput,
    onInputStart,
    onInputDelta,
    onInputAvailable,
    ...args
  }: ARGS & {
    execute?: ToolExecuteFunction<INPUT, OUTPUT>;
    outputSchema?: FlexibleSchema<OUTPUT>;
    needsApproval?: Tool<INPUT, OUTPUT>['needsApproval'];
    toModelOutput?: Tool<INPUT, OUTPUT>['toModelOutput'];
    onInputStart?: Tool<INPUT, OUTPUT>['onInputStart'];
    onInputDelta?: Tool<INPUT, OUTPUT>['onInputDelta'];
    onInputAvailable?: Tool<INPUT, OUTPUT>['onInputAvailable'];
  }): Tool<INPUT, OUTPUT> =>
    tool({
      type: 'provider',
      id,
      args,
      inputSchema,
      outputSchema,
      execute,
      needsApproval,
      toModelOutput,
      onInputStart,
      onInputDelta,
      onInputAvailable,
    });
}

export type ProviderToolFactoryWithOutputSchema<
  INPUT,
  OUTPUT,
  ARGS extends object,
> = (
  options: ARGS & {
    execute?: ToolExecuteFunction<INPUT, OUTPUT>;
    needsApproval?: Tool<INPUT, OUTPUT>['needsApproval'];
    toModelOutput?: Tool<INPUT, OUTPUT>['toModelOutput'];
    onInputStart?: Tool<INPUT, OUTPUT>['onInputStart'];
    onInputDelta?: Tool<INPUT, OUTPUT>['onInputDelta'];
    onInputAvailable?: Tool<INPUT, OUTPUT>['onInputAvailable'];
  },
) => Tool<INPUT, OUTPUT>;

export function createProviderToolFactoryWithOutputSchema<
  INPUT,
  OUTPUT,
  ARGS extends object,
>({
  id,
  inputSchema,
  outputSchema,
  supportsDeferredResults,
}: {
  id: `${string}.${string}`;
  inputSchema: FlexibleSchema<INPUT>;
  outputSchema: FlexibleSchema<OUTPUT>;
  /**
   * Whether this provider-executed tool supports deferred results.
   *
   * When true, the tool result may not be returned in the same turn as the
   * tool call (e.g., when using programmatic tool calling where a server tool
   * triggers a client-executed tool, and the server tool's result is deferred
   * until the client tool is resolved).
   *
   * @default false
   */
  supportsDeferredResults?: boolean;
}): ProviderToolFactoryWithOutputSchema<INPUT, OUTPUT, ARGS> {
  return ({
    execute,
    needsApproval,
    toModelOutput,
    onInputStart,
    onInputDelta,
    onInputAvailable,
    ...args
  }: ARGS & {
    execute?: ToolExecuteFunction<INPUT, OUTPUT>;
    needsApproval?: Tool<INPUT, OUTPUT>['needsApproval'];
    toModelOutput?: Tool<INPUT, OUTPUT>['toModelOutput'];
    onInputStart?: Tool<INPUT, OUTPUT>['onInputStart'];
    onInputDelta?: Tool<INPUT, OUTPUT>['onInputDelta'];
    onInputAvailable?: Tool<INPUT, OUTPUT>['onInputAvailable'];
  }): Tool<INPUT, OUTPUT> =>
    tool({
      type: 'provider',
      id,
      args,
      inputSchema,
      outputSchema,
      execute,
      needsApproval,
      toModelOutput,
      onInputStart,
      onInputDelta,
      onInputAvailable,
      supportsDeferredResults,
    });
}
