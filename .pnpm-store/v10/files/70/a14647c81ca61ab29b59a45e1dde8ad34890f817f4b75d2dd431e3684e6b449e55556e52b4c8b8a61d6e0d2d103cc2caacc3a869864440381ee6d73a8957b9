import { __export } from "../_virtual/rolldown_runtime.js";
import { Serializable } from "@langchain/core/load/serializable";

//#region src/graphs/document.ts
var document_exports = {};
__export(document_exports, {
	GraphDocument: () => GraphDocument,
	Node: () => Node,
	Relationship: () => Relationship
});
var Node = class extends Serializable {
	id;
	type;
	properties;
	lc_namespace = [
		"langchain",
		"graph",
		"document_node"
	];
	constructor({ id, type = "Node", properties = {} }) {
		super();
		this.id = id;
		this.type = type;
		this.properties = properties;
	}
};
var Relationship = class extends Serializable {
	source;
	target;
	type;
	properties;
	lc_namespace = [
		"langchain",
		"graph",
		"document_relationship"
	];
	constructor({ source, target, type, properties = {} }) {
		super();
		this.source = source;
		this.target = target;
		this.type = type;
		this.properties = properties;
	}
};
var GraphDocument = class extends Serializable {
	nodes;
	relationships;
	source;
	lc_namespace = [
		"langchain",
		"graph",
		"graph_document"
	];
	constructor({ nodes, relationships, source }) {
		super({
			nodes,
			relationships,
			source
		});
		this.nodes = nodes;
		this.relationships = relationships;
		this.source = source;
	}
};

//#endregion
export { GraphDocument, Node, Relationship, document_exports };
//# sourceMappingURL=document.js.map