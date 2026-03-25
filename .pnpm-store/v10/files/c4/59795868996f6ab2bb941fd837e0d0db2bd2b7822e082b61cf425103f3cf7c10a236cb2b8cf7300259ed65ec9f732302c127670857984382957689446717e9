import { Command } from "../types.cjs";
import { BagTemplate } from "../types.template.cjs";
import { GetConfigurableType, GetUpdateType, UseStreamTransport } from "../ui/types.cjs";

//#region src/react/stream.custom.d.ts
interface FetchStreamTransportOptions {
  /**
   * The URL of the API to use.
   */
  apiUrl: string;
  /**
   * Default headers to send with requests.
   */
  defaultHeaders?: HeadersInit;
  /**
   * Specify a custom fetch implementation.
   */
  fetch?: typeof fetch | ((...args: any[]) => any);
  /**
   * Callback that is called before the request is made.
   */
  onRequest?: (url: string, init: RequestInit) => Promise<RequestInit> | RequestInit;
}
declare class FetchStreamTransport<StateType extends Record<string, unknown> = Record<string, unknown>, Bag extends BagTemplate = BagTemplate> implements UseStreamTransport<StateType, Bag> {
  private readonly options;
  constructor(options: FetchStreamTransportOptions);
  stream(payload: {
    input: GetUpdateType<Bag, StateType> | null | undefined;
    context: GetConfigurableType<Bag> | undefined;
    command: Command | undefined;
    signal: AbortSignal;
  }): Promise<AsyncGenerator<{
    id?: string;
    event: string;
    data: unknown;
  }>>;
}
//#endregion
export { FetchStreamTransport };
//# sourceMappingURL=stream.custom.d.cts.map