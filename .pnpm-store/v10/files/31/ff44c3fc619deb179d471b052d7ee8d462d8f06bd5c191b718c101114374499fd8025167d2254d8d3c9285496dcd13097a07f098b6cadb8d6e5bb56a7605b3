const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_load_serializable = require_rolldown_runtime.__toESM(require("@langchain/core/load/serializable"));

//#region src/graphs/document.ts
var document_exports = {};
require_rolldown_runtime.__export(document_exports, {
	GraphDocument: () => GraphDocument,
	Node: () => Node,
	Relationship: () => Relationship
});
var Node = class extends __langchain_core_load_serializable.Serializable {
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
var Relationship = class extends __langchain_core_load_serializable.Serializable {
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
var GraphDocument = class extends __langchain_core_load_serializable.Serializable {
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
exports.GraphDocument = GraphDocument;
exports.Node = Node;
exports.Relationship = Relationship;
Object.defineProperty(exports, 'document_exports', {
  enumerable: true,
  get: function () {
    return document_exports;
  }
});
//# sourceMappingURL=document.cjs.map