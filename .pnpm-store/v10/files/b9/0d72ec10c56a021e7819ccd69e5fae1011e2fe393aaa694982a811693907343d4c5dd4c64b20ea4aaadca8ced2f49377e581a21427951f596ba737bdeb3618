import { RemoveUIMessage, UIMessage } from "../types.cjs";
import { ComponentPropsWithoutRef, ElementType } from "react";

//#region src/react-ui/server/server.d.ts
interface MessageLike {
  id?: string;
}
/**
 * Helper to send and persist UI messages. Accepts a map of component names to React components
 * as type argument to provide type safety. Will also write to the `options?.stateKey` state.
 *
 * @param config LangGraphRunnableConfig
 * @param options
 * @returns
 */
declare const typedUi: <Decl extends Record<string, ElementType>>(config: {
  writer?: ((chunk: unknown) => void) | undefined;
  runId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  tags?: string[] | undefined;
  runName?: string | undefined;
  configurable?: {
    [key: string]: unknown;
    __pregel_send?: ((writes_: [string, unknown][]) => void) | undefined;
  } | undefined;
}, options?: {
  /** The key to write the UI messages to. Defaults to `ui`. */
  stateKey?: string | undefined;
} | undefined) => {
  push: {
    <K extends keyof Decl & string>(message: {
      id?: string | undefined;
      name: K;
      props: { [K_1 in keyof Decl]: ComponentPropsWithoutRef<Decl[K_1]> }[K];
      metadata?: Record<string, unknown> | undefined;
    }, options?: {
      message?: MessageLike | undefined;
      merge?: boolean | undefined;
    } | undefined): UIMessage<K, { [K_1 in keyof Decl]: ComponentPropsWithoutRef<Decl[K_1]> }[K]>;
    <K extends keyof Decl & string>(message: {
      id?: string | undefined;
      name: K;
      props: Partial<{ [K_1 in keyof Decl]: ComponentPropsWithoutRef<Decl[K_1]> }[K]>;
      metadata?: Record<string, unknown> | undefined;
    }, options: {
      message?: MessageLike | undefined;
      merge: true;
    }): UIMessage<K, Partial<{ [K_1 in keyof Decl]: ComponentPropsWithoutRef<Decl[K_1]> }[K]>>;
  };
  delete: (id: string) => RemoveUIMessage;
  items: (RemoveUIMessage | UIMessage<string, Record<string, unknown>>)[];
};
//#endregion
export { typedUi };
//# sourceMappingURL=server.d.cts.map