//#region src/react-ui/types.d.ts
interface UIMessage<TName extends string = string, TProps extends Record<string, unknown> = Record<string, unknown>> {
  type: "ui";
  id: string;
  name: TName;
  props: TProps;
  metadata?: {
    merge?: boolean;
    run_id?: string;
    name?: string;
    tags?: string[];
    message_id?: string;
    [key: string]: unknown;
  };
}
interface RemoveUIMessage {
  type: "remove-ui";
  id: string;
}
declare function isUIMessage(message: unknown): message is UIMessage;
declare function isRemoveUIMessage(message: unknown): message is RemoveUIMessage;
declare function uiMessageReducer(state: UIMessage[], update: UIMessage | RemoveUIMessage | (UIMessage | RemoveUIMessage)[]): UIMessage<string, Record<string, unknown>>[];
//#endregion
export { RemoveUIMessage, UIMessage, isRemoveUIMessage, isUIMessage, uiMessageReducer };
//# sourceMappingURL=types.d.cts.map