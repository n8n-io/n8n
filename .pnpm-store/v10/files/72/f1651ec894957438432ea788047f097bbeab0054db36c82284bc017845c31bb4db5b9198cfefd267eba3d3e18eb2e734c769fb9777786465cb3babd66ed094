import { Tool } from '@ai-sdk/provider-utils';

export type ToolSet = Record<
  string,
  (Tool<never, never> | Tool<any, any> | Tool<any, never> | Tool<never, any>) &
    Pick<
      Tool<any, any>,
      | 'execute'
      | 'onInputAvailable'
      | 'onInputStart'
      | 'onInputDelta'
      | 'needsApproval'
    >
>;
