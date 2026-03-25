import { describe, expect, it } from "vitest";
import { LOCAL_APPS } from "./local-apps.js";
import type { ModelData } from "./model-data.js";

describe("local-apps", () => {
	it("llama.cpp conversational", async () => {
		const { snippet: snippetFunc } = LOCAL_APPS["llama.cpp"];
		const model: ModelData = {
			id: "bartowski/Llama-3.2-3B-Instruct-GGUF",
			tags: ["conversational"],
			inference: "",
		};
		const snippet = snippetFunc(model);

		expect(snippet[0].content).toEqual(`# Load and run the model:
llama-server -hf bartowski/Llama-3.2-3B-Instruct-GGUF:{{QUANT_TAG}}`);
	});

	it("llama.cpp non-conversational", async () => {
		const { snippet: snippetFunc } = LOCAL_APPS["llama.cpp"];
		const model: ModelData = {
			id: "mlabonne/gemma-2b-GGUF",
			tags: [],
			inference: "",
		};
		const snippet = snippetFunc(model);

		expect(snippet[0].content).toEqual(`# Load and run the model:
llama-server -hf mlabonne/gemma-2b-GGUF:{{QUANT_TAG}}`);
	});

	it("vLLM conversational llm", async () => {
		const { snippet: snippetFunc } = LOCAL_APPS["vllm"];
		const model: ModelData = {
			id: "meta-llama/Llama-3.2-3B-Instruct",
			pipeline_tag: "text-generation",
			tags: ["conversational"],
			inference: "",
		};
		const snippet = snippetFunc(model);

		expect((snippet[0].content as string[]).join("\n")).toEqual(`# Load and run the model:
vllm serve "meta-llama/Llama-3.2-3B-Instruct"
# Call the server using curl:
curl -X POST "http://localhost:8000/v1/chat/completions" \\
	-H "Content-Type: application/json" \\
	--data '{
		"model": "meta-llama/Llama-3.2-3B-Instruct",
		"messages": [
			{
				"role": "user",
				"content": "What is the capital of France?"
			}
		]
	}'`);
	});

	it("vLLM non-conversational llm", async () => {
		const { snippet: snippetFunc } = LOCAL_APPS["vllm"];
		const model: ModelData = {
			id: "meta-llama/Llama-3.2-3B",
			tags: [""],
			inference: "",
		};
		const snippet = snippetFunc(model);

		expect((snippet[0].content as string[]).join("\n")).toEqual(`# Load and run the model:
vllm serve "meta-llama/Llama-3.2-3B"
# Call the server using curl:
curl -X POST "http://localhost:8000/v1/completions" \\
	-H "Content-Type: application/json" \\
	--data '{
		"model": "meta-llama/Llama-3.2-3B",
		"prompt": "Once upon a time,",
		"max_tokens": 512,
		"temperature": 0.5
	}'`);
	});

	it("vLLM conversational vlm", async () => {
		const { snippet: snippetFunc } = LOCAL_APPS["vllm"];
		const model: ModelData = {
			id: "meta-llama/Llama-3.2-11B-Vision-Instruct",
			pipeline_tag: "image-text-to-text",
			tags: ["conversational"],
			inference: "",
		};
		const snippet = snippetFunc(model);

		expect((snippet[0].content as string[]).join("\n")).toEqual(`# Load and run the model:
vllm serve "meta-llama/Llama-3.2-11B-Vision-Instruct"
# Call the server using curl:
curl -X POST "http://localhost:8000/v1/chat/completions" \\
	-H "Content-Type: application/json" \\
	--data '{
		"model": "meta-llama/Llama-3.2-11B-Vision-Instruct",
		"messages": [
			{
				"role": "user",
				"content": [
					{
						"type": "text",
						"text": "Describe this image in one sentence."
					},
					{
						"type": "image_url",
						"image_url": {
							"url": "https://cdn.britannica.com/61/93061-050-99147DCE/Statue-of-Liberty-Island-New-York-Bay.jpg"
						}
					}
				]
			}
		]
	}'`);
	});

	it("docker model runner", async () => {
		const { snippet: snippetFunc } = LOCAL_APPS["docker-model-runner"];
		const model: ModelData = {
			id: "bartowski/Llama-3.2-3B-Instruct-GGUF",
			tags: ["conversational"],
			inference: "",
		};
		const snippet = snippetFunc(model);

		expect(snippet).toEqual(`docker model run hf.co/bartowski/Llama-3.2-3B-Instruct-GGUF:{{QUANT_TAG}}`);
	});
});
