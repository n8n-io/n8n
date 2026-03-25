import { ThreadState } from "../schema.js";

//#region src/ui/branching.d.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Node<StateType = any> {
  type: "node";
  value: ThreadState<StateType>;
  path: string[];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Fork<StateType = any> {
  type: "fork";
  items: Array<Sequence<StateType>>;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Sequence<StateType = any> {
  type: "sequence";
  items: Array<Node<StateType> | Fork<StateType>>;
}
//#endregion
export { Sequence };
//# sourceMappingURL=branching.d.ts.map