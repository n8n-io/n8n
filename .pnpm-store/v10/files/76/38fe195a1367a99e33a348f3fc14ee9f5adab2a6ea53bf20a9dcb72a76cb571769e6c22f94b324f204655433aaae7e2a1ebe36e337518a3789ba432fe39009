
//#region src/tools/codeInterpreter.ts
/**
* Converts container options to the API format.
*/
function convertContainer(container) {
	if (typeof container === "string") return container;
	return {
		type: "auto",
		file_ids: container?.fileIds,
		memory_limit: container?.memoryLimit
	};
}
/**
* Creates a Code Interpreter tool that allows models to write and run Python code
* in a sandboxed environment to solve complex problems.
*
* Use Code Interpreter for:
* - **Data analysis**: Processing files with diverse data and formatting
* - **File generation**: Creating files with data and images of graphs
* - **Iterative coding**: Writing and running code iteratively to solve problems
* - **Visual intelligence**: Cropping, zooming, rotating, and transforming images
*
* The tool runs in a container, which is a fully sandboxed virtual machine.
* Containers can be created automatically (auto mode) or explicitly via the
* `/v1/containers` endpoint.
*
* @see {@link https://platform.openai.com/docs/guides/tools-code-interpreter | OpenAI Code Interpreter Documentation}
*
* @param options - Configuration options for the Code Interpreter tool
* @returns A Code Interpreter tool definition to be passed to the OpenAI Responses API
*
* @example
* ```typescript
* import { ChatOpenAI, tools } from "@langchain/openai";
*
* const model = new ChatOpenAI({ model: "gpt-4.1" });
*
* // Basic usage with auto container (default 1GB memory)
* const response = await model.invoke(
*   "Solve the equation 3x + 11 = 14",
*   { tools: [tools.codeInterpreter()] }
* );
*
* // With increased memory limit for larger computations
* const response = await model.invoke(
*   "Analyze this large dataset and create visualizations",
*   {
*     tools: [tools.codeInterpreter({
*       container: { memoryLimit: "4g" }
*     })]
*   }
* );
*
* // With specific files available to the code
* const response = await model.invoke(
*   "Process the uploaded CSV file",
*   {
*     tools: [tools.codeInterpreter({
*       container: {
*         memoryLimit: "4g",
*         fileIds: ["file-abc123", "file-def456"]
*       }
*     })]
*   }
* );
*
* // Using an explicit container ID (created via /v1/containers)
* const response = await model.invoke(
*   "Continue working with the data",
*   {
*     tools: [tools.codeInterpreter({
*       container: "cntr_abc123"
*     })]
*   }
* );
* ```
*
* @remarks
* - Containers expire after 20 minutes of inactivity
* - While called "Code Interpreter", the model knows it as the "python tool"
* - For explicit prompting, ask for "the python tool" in your prompts
* - Files in model input are automatically uploaded to the container
* - Generated files are returned as `container_file_citation` annotations
*/
function codeInterpreter(options) {
	return {
		type: "code_interpreter",
		container: convertContainer(options?.container)
	};
}

//#endregion
exports.codeInterpreter = codeInterpreter;
//# sourceMappingURL=codeInterpreter.cjs.map