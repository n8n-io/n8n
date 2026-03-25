const require_binop = require('../channels/binop.cjs');
const require_last_value = require('../channels/last_value.cjs');

//#region src/graph/annotation.ts
/**
* Should not be instantiated directly. See {@link Annotation}.
*/
var AnnotationRoot = class {
	lc_graph_name = "AnnotationRoot";
	spec;
	constructor(s) {
		this.spec = s;
	}
};
/**
* Helper that instantiates channels within a StateGraph state.
*
* Can be used as a field in an {@link Annotation.Root} wrapper in one of two ways:
* 1. **Directly**: Creates a channel that stores the most recent value returned from a node.
* 2. **With a reducer**: Creates a channel that applies the reducer on a node's return value.
*
* @example
* ```ts
* import { StateGraph, Annotation } from "@langchain/langgraph";
*
* // Define a state with a single string key named "currentOutput"
* const SimpleAnnotation = Annotation.Root({
*   currentOutput: Annotation<string>,
* });
*
* const graphBuilder = new StateGraph(SimpleAnnotation);
*
* // A node in the graph that returns an object with a "currentOutput" key
* // replaces the value in the state. You can get the state type as shown below:
* const myNode = (state: typeof SimpleAnnotation.State) => {
*   return {
*     currentOutput: "some_new_value",
*   };
* }
*
* const graph = graphBuilder
*   .addNode("myNode", myNode)
*   ...
*   .compile();
* ```
*
* @example
* ```ts
* import { type BaseMessage, AIMessage } from "@langchain/core/messages";
* import { StateGraph, Annotation } from "@langchain/langgraph";
*
* // Define a state with a single key named "messages" that will
* // combine a returned BaseMessage or arrays of BaseMessages
* const AnnotationWithReducer = Annotation.Root({
*   messages: Annotation<BaseMessage[]>({
*     // Different types are allowed for updates
*     reducer: (left: BaseMessage[], right: BaseMessage | BaseMessage[]) => {
*       if (Array.isArray(right)) {
*         return left.concat(right);
*       }
*       return left.concat([right]);
*     },
*     default: () => [],
*   }),
* });
*
* const graphBuilder = new StateGraph(AnnotationWithReducer);
*
* // A node in the graph that returns an object with a "messages" key
* // will update the state by combining the existing value with the returned one.
* const myNode = (state: typeof AnnotationWithReducer.State) => {
*   return {
*     messages: [new AIMessage("Some new response")],
*   };
* };
*
* const graph = graphBuilder
*   .addNode("myNode", myNode)
*   ...
*   .compile();
* ```
* @namespace
* @property Root
* Helper function that instantiates a StateGraph state. See {@link Annotation} for usage.
*/
const Annotation = function(annotation) {
	if (annotation) return getChannel(annotation);
	else return new require_last_value.LastValue();
};
Annotation.Root = (sd) => new AnnotationRoot(sd);
function getChannel(reducer) {
	if (typeof reducer === "object" && reducer && "reducer" in reducer && reducer.reducer) return new require_binop.BinaryOperatorAggregate(reducer.reducer, reducer.default);
	if (typeof reducer === "object" && reducer && "value" in reducer && reducer.value) return new require_binop.BinaryOperatorAggregate(reducer.value, reducer.default);
	return new require_last_value.LastValue();
}

//#endregion
exports.Annotation = Annotation;
exports.AnnotationRoot = AnnotationRoot;
exports.getChannel = getChannel;
//# sourceMappingURL=annotation.cjs.map