import { Edge, Node, RunnableConfig, RunnableIOSchema, RunnableInterface } from "./types.cjs";

//#region src/runnables/graph.d.ts
declare class Graph {
  nodes: Record<string, Node>;
  edges: Edge[];
  constructor(params?: {
    nodes: Record<string, Node>;
    edges: Edge[];
  });
  toJSON(): Record<string, any>;
  addNode(data: RunnableInterface | RunnableIOSchema, id?: string, metadata?: Record<string, any>): Node;
  removeNode(node: Node): void;
  addEdge(source: Node, target: Node, data?: string, conditional?: boolean): Edge;
  firstNode(): Node | undefined;
  lastNode(): Node | undefined;
  /**
   * Add all nodes and edges from another graph.
   * Note this doesn't check for duplicates, nor does it connect the graphs.
   */
  extend(graph: Graph, prefix?: string): ({
    id: string;
    data: RunnableIOSchema | RunnableInterface<any, any, RunnableConfig<Record<string, any>>>;
  } | undefined)[];
  trimFirstNode(): void;
  trimLastNode(): void;
  /**
   * Return a new graph with all nodes re-identified,
   * using their unique, readable names where possible.
   */
  reid(): Graph;
  drawMermaid(params?: {
    withStyles?: boolean;
    curveStyle?: string;
    nodeColors?: Record<string, string>;
    wrapLabelNWords?: number;
  }): string;
  drawMermaidPng(params?: {
    withStyles?: boolean;
    curveStyle?: string;
    nodeColors?: Record<string, string>;
    wrapLabelNWords?: number;
    backgroundColor?: string;
  }): Promise<Blob>;
}
//#endregion
export { Edge, Graph, Node };
//# sourceMappingURL=graph.d.cts.map