import { Serializable } from "@langchain/core/load/serializable";
import { Document } from "@langchain/core/documents";

//#region src/graphs/document.d.ts
declare class Node extends Serializable {
  id: string | number;
  type: string;
  properties: Record<string, any>;
  lc_namespace: string[];
  constructor({
    id,
    type,
    properties
  }: {
    id: string | number;
    type: string;
    properties?: Record<string, any>;
  });
}
declare class Relationship extends Serializable {
  source: Node;
  target: Node;
  type: string;
  properties: Record<string, any>;
  lc_namespace: string[];
  constructor({
    source,
    target,
    type,
    properties
  }: {
    source: Node;
    target: Node;
    type: string;
    properties?: Record<string, any>;
  });
}
declare class GraphDocument extends Serializable {
  nodes: Node[];
  relationships: Relationship[];
  source: Document;
  lc_namespace: string[];
  constructor({
    nodes,
    relationships,
    source
  }: {
    nodes: Node[];
    relationships: Relationship[];
    source: Document;
  });
}
//#endregion
export { GraphDocument, Node, Relationship };
//# sourceMappingURL=document.d.cts.map