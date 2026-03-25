import { ThreadState } from "../schema.js";
import { Message } from "../types.messages.js";

//#region src/ui/branching.d.ts
interface Node<StateType = any> {
  type: "node";
  value: ThreadState<StateType>;
  path: string[];
}
interface Fork<StateType = any> {
  type: "fork";
  items: Array<Sequence<StateType>>;
}
interface Sequence<StateType = any> {
  type: "sequence";
  items: Array<Node<StateType> | Fork<StateType>>;
}
type BranchByCheckpoint = Record<string, {
  branch: string | undefined;
  branchOptions: string[] | undefined;
}>;
declare function getBranchContext<StateType extends Record<string, unknown>>(branch: string, history: ThreadState<StateType>[] | undefined): {
  branchTree: Sequence<any>;
  flatHistory: ThreadState<any>[];
  branchByCheckpoint: BranchByCheckpoint;
  threadHead: ThreadState<any> | undefined;
};
declare function getMessagesMetadataMap<StateType extends Record<string, unknown>>(options: {
  initialValues: StateType | null | undefined;
  history: ThreadState<StateType>[] | null | undefined;
  getMessages: (values: StateType) => Message[];
  branchContext: {
    threadHead: ThreadState<StateType> | undefined;
    branchByCheckpoint: BranchByCheckpoint;
  };
}): {
  messageId: string;
  firstSeenState: ThreadState<StateType> | undefined;
  branch: string | undefined;
  branchOptions: string[] | undefined;
}[];
//#endregion
export { Sequence, getBranchContext, getMessagesMetadataMap };
//# sourceMappingURL=branching.d.ts.map