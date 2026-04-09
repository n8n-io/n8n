import { Agent } from './agent';

/**
 * Infer the type of the tools of an agent.
 */
export type InferAgentTools<AGENT> =
  AGENT extends Agent<any, infer TOOLS, any> ? TOOLS : never;
