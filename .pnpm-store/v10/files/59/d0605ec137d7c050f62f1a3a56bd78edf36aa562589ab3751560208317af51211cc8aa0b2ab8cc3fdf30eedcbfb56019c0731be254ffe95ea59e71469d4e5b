import { describe, expect, it } from "vitest";
import { llama_cpp_python } from "./model-libraries-snippets.js";
describe("model-libraries-snippets", () => {
    it("llama_cpp_python conversational", async () => {
        const model = {
            id: "bartowski/Llama-3.2-3B-Instruct-GGUF",
            pipeline_tag: "text-generation",
            tags: ["conversational"],
            inference: "",
        };
        const snippet = llama_cpp_python(model);
        expect(snippet.join("\n")).toEqual(`# !pip install llama-cpp-python

from llama_cpp import Llama

llm = Llama.from_pretrained(
	repo_id="bartowski/Llama-3.2-3B-Instruct-GGUF",
	filename="{{GGUF_FILE}}",
)

llm.create_chat_completion(
	messages = [
		{
			"role": "user",
			"content": "What is the capital of France?"
		}
	]
)`);
    });
    it("llama_cpp_python non-conversational", async () => {
        const model = {
            id: "mlabonne/gemma-2b-GGUF",
            tags: [""],
            inference: "",
        };
        const snippet = llama_cpp_python(model);
        expect(snippet.join("\n")).toEqual(`# !pip install llama-cpp-python

from llama_cpp import Llama

llm = Llama.from_pretrained(
	repo_id="mlabonne/gemma-2b-GGUF",
	filename="{{GGUF_FILE}}",
)

output = llm(
	"Once upon a time,",
	max_tokens=512,
	echo=True
)
print(output)`);
    });
});
