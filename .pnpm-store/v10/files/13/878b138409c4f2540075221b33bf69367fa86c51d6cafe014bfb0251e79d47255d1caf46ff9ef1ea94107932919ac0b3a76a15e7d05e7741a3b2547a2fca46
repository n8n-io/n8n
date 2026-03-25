"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const local_apps_js_1 = require("./local-apps.js");
(0, vitest_1.describe)("local-apps", () => {
    (0, vitest_1.it)("llama.cpp conversational", async () => {
        const { snippet: snippetFunc } = local_apps_js_1.LOCAL_APPS["llama.cpp"];
        const model = {
            id: "bartowski/Llama-3.2-3B-Instruct-GGUF",
            tags: ["conversational"],
            inference: "",
        };
        const snippet = snippetFunc(model);
        (0, vitest_1.expect)(snippet[0].content).toEqual(`# Load and run the model:
llama-server -hf bartowski/Llama-3.2-3B-Instruct-GGUF:{{QUANT_TAG}}`);
    });
    (0, vitest_1.it)("llama.cpp non-conversational", async () => {
        const { snippet: snippetFunc } = local_apps_js_1.LOCAL_APPS["llama.cpp"];
        const model = {
            id: "mlabonne/gemma-2b-GGUF",
            tags: [],
            inference: "",
        };
        const snippet = snippetFunc(model);
        (0, vitest_1.expect)(snippet[0].content).toEqual(`# Load and run the model:
llama-server -hf mlabonne/gemma-2b-GGUF:{{QUANT_TAG}}`);
    });
    (0, vitest_1.it)("vLLM conversational llm", async () => {
        const { snippet: snippetFunc } = local_apps_js_1.LOCAL_APPS["vllm"];
        const model = {
            id: "meta-llama/Llama-3.2-3B-Instruct",
            pipeline_tag: "text-generation",
            tags: ["conversational"],
            inference: "",
        };
        const snippet = snippetFunc(model);
        (0, vitest_1.expect)(snippet[0].content.join("\n")).toEqual(`# Load and run the model:
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
    (0, vitest_1.it)("vLLM non-conversational llm", async () => {
        const { snippet: snippetFunc } = local_apps_js_1.LOCAL_APPS["vllm"];
        const model = {
            id: "meta-llama/Llama-3.2-3B",
            tags: [""],
            inference: "",
        };
        const snippet = snippetFunc(model);
        (0, vitest_1.expect)(snippet[0].content.join("\n")).toEqual(`# Load and run the model:
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
    (0, vitest_1.it)("vLLM conversational vlm", async () => {
        const { snippet: snippetFunc } = local_apps_js_1.LOCAL_APPS["vllm"];
        const model = {
            id: "meta-llama/Llama-3.2-11B-Vision-Instruct",
            pipeline_tag: "image-text-to-text",
            tags: ["conversational"],
            inference: "",
        };
        const snippet = snippetFunc(model);
        (0, vitest_1.expect)(snippet[0].content.join("\n")).toEqual(`# Load and run the model:
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
    (0, vitest_1.it)("docker model runner", async () => {
        const { snippet: snippetFunc } = local_apps_js_1.LOCAL_APPS["docker-model-runner"];
        const model = {
            id: "bartowski/Llama-3.2-3B-Instruct-GGUF",
            tags: ["conversational"],
            inference: "",
        };
        const snippet = snippetFunc(model);
        (0, vitest_1.expect)(snippet).toEqual(`docker model run hf.co/bartowski/Llama-3.2-3B-Instruct-GGUF:{{QUANT_TAG}}`);
    });
});
