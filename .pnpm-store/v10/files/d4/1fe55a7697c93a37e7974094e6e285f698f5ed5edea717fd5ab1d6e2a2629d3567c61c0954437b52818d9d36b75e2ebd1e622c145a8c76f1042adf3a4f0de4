import { VectorDBQAChain } from "../chains/vector_db_qa.js";
import { Tool } from "@langchain/core/tools";

//#region src/tools/vectorstore.ts
/**
* A tool for the VectorDBQA chain to interact with a Vector Store. It is
* used to answer questions about a specific topic. The input to this tool
* should be a fully formed question.
*/
var VectorStoreQATool = class extends Tool {
	static lc_name() {
		return "VectorStoreQATool";
	}
	vectorStore;
	llm;
	name;
	description;
	chain;
	constructor(name, description, fields) {
		super(...arguments);
		this.name = name;
		this.description = description;
		this.vectorStore = fields.vectorStore;
		this.llm = fields.llm;
		this.chain = VectorDBQAChain.fromLLM(this.llm, this.vectorStore);
	}
	/**
	* Returns a string that describes what the tool does.
	* @param name The name of the tool.
	* @param description A description of what the tool does.
	* @returns A string that describes what the tool does.
	*/
	static getDescription(name, description) {
		return `Useful for when you need to answer questions about ${name}. Whenever you need information about ${description} you should ALWAYS use this. Input should be a fully formed question.`;
	}
	/** @ignore */
	async _call(input) {
		return this.chain.run(input);
	}
};

//#endregion
export { VectorStoreQATool };
//# sourceMappingURL=vectorstore.js.map