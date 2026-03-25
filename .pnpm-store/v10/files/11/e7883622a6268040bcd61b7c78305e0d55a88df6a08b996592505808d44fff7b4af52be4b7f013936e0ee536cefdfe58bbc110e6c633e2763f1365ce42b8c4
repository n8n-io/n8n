import { DefaultToolCall } from "../types.messages.cjs";
import { BagTemplate as BagTemplate$1 } from "../types.template.cjs";
import { BaseStream } from "../ui/stream/base.cjs";
import { UseStream } from "../react/types.cjs";
import { useStream } from "../react/stream.cjs";
import { UIMessage } from "./types.cjs";
import * as React from "react";
import * as JsxRuntime from "react/jsx-runtime";
import { BagTemplate } from "@langchain/langgraph-sdk";

//#region src/react-ui/client.d.ts
declare const UseStreamContext: React.Context<{
  stream: BaseStream<Record<string, unknown>, DefaultToolCall, BagTemplate$1>;
  meta: unknown;
}>;
type GetMetaType<Bag extends BagTemplate> = Bag extends {
  MetaType: unknown;
} ? Bag["MetaType"] : unknown;
interface UseStreamContext<StateType extends Record<string, unknown> = Record<string, unknown>, Bag extends BagTemplate = BagTemplate> extends UseStream<StateType, Bag> {
  meta?: GetMetaType<Bag>;
}
declare function useStreamContext<StateType extends Record<string, unknown> = Record<string, unknown>, Bag extends BagTemplate = BagTemplate>(): UseStreamContext<StateType, Bag>;
interface ComponentTarget {
  comp: React.FunctionComponent | React.ComponentClass;
  target: HTMLElement;
}
declare class ComponentStore {
  private cache;
  private boundCache;
  private callbacks;
  respond(shadowRootId: string, comp: React.FunctionComponent | React.ComponentClass, targetElement: HTMLElement): void;
  getBoundStore(shadowRootId: string): {
    subscribe: (onStoreChange: () => void) => () => void;
    getSnapshot: () => ComponentTarget | undefined;
  };
}
declare const EXT_STORE_SYMBOL: unique symbol;
declare const REQUIRE_SYMBOL: unique symbol;
declare const REQUIRE_EXTRA_SYMBOL: unique symbol;
interface LoadExternalComponentProps extends Pick<React.HTMLAttributes<HTMLDivElement>, "style" | "className"> {
  stream: ReturnType<typeof useStream>;
  namespace?: string;
  message: UIMessage;
  meta?: unknown;
  fallback?: React.ReactNode | Record<string, React.ReactNode>;
  components?: Record<string, React.FunctionComponent | React.ComponentClass>;
}
declare function LoadExternalComponent({
  stream,
  namespace,
  message,
  meta,
  fallback,
  components,
  ...props
}: LoadExternalComponentProps): JsxRuntime.JSX.Element;
declare global {
  interface Window {
    [EXT_STORE_SYMBOL]: ComponentStore;
    [REQUIRE_SYMBOL]: (name: string) => unknown;
    [REQUIRE_EXTRA_SYMBOL]: Record<string, unknown>;
  }
}
declare function experimental_loadShare(name: string, module: unknown): void;
//#endregion
export { LoadExternalComponent, experimental_loadShare, useStreamContext };
//# sourceMappingURL=client.d.cts.map