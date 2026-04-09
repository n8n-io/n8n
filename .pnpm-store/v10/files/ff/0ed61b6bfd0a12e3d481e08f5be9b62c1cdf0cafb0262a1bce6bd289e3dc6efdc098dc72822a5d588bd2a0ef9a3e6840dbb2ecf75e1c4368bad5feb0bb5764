import { parseGGUFQuantLabel } from "./gguf.js";
import { stringifyMessages } from "./snippets/common.js";
import { getModelInputSnippet } from "./snippets/inputs.js";
function isAwqModel(model) {
    return model.config?.quantization_config?.quant_method === "awq";
}
function isGptqModel(model) {
    return model.config?.quantization_config?.quant_method === "gptq";
}
function isAqlmModel(model) {
    return model.config?.quantization_config?.quant_method === "aqlm";
}
function isMarlinModel(model) {
    return model.config?.quantization_config?.quant_method === "marlin";
}
function isTransformersModel(model) {
    return model.tags.includes("transformers");
}
function isTgiModel(model) {
    return model.tags.includes("text-generation-inference");
}
function isLlamaCppGgufModel(model) {
    return !!model.gguf?.context_length;
}
function isVllmModel(model) {
    return ((isAwqModel(model) ||
        isGptqModel(model) ||
        isAqlmModel(model) ||
        isMarlinModel(model) ||
        isLlamaCppGgufModel(model) ||
        isTransformersModel(model)) &&
        (model.pipeline_tag === "text-generation" || model.pipeline_tag === "image-text-to-text"));
}
function isDockerModelRunnerModel(model) {
    return isLlamaCppGgufModel(model) || isVllmModel(model);
}
function isAmdRyzenModel(model) {
    return model.tags.includes("ryzenai-hybrid") || model.tags.includes("ryzenai-npu");
}
function isMlxModel(model) {
    return model.tags.includes("mlx");
}
function getQuantTag(filepath) {
    const defaultTag = ":{{QUANT_TAG}}";
    if (!filepath) {
        return defaultTag;
    }
    const quantLabel = parseGGUFQuantLabel(filepath);
    return quantLabel ? `:${quantLabel}` : defaultTag;
}
const snippetLlamacpp = (model, filepath) => {
    const serverCommand = (binary) => {
        const snippet = [
            "# Start a local OpenAI-compatible server with a web UI:",
            `${binary} -hf ${model.id}${getQuantTag(filepath)}`,
        ];
        return snippet.join("\n");
    };
    const cliCommand = (binary) => {
        const snippet = ["# Run inference directly in the terminal:", `${binary} -hf ${model.id}${getQuantTag(filepath)}`];
        return snippet.join("\n");
    };
    return [
        {
            title: "Install from brew",
            setup: "brew install llama.cpp",
            content: [serverCommand("llama-server"), cliCommand("llama-cli")],
        },
        {
            title: "Install from WinGet (Windows)",
            setup: "winget install llama.cpp",
            content: [serverCommand("llama-server"), cliCommand("llama-cli")],
        },
        {
            title: "Use pre-built binary",
            setup: [
                // prettier-ignore
                "# Download pre-built binary from:",
                "# https://github.com/ggerganov/llama.cpp/releases",
            ].join("\n"),
            content: [serverCommand("./llama-server"), cliCommand("./llama-cli")],
        },
        {
            title: "Build from source code",
            setup: [
                "git clone https://github.com/ggerganov/llama.cpp.git",
                "cd llama.cpp",
                "cmake -B build",
                "cmake --build build -j --target llama-server llama-cli",
            ].join("\n"),
            content: [serverCommand("./build/bin/llama-server"), cliCommand("./build/bin/llama-cli")],
        },
        {
            title: "Use Docker",
            content: snippetDockerModelRunner(model, filepath),
        },
    ];
};
const snippetNodeLlamaCppCli = (model, filepath) => {
    const tagName = getQuantTag(filepath);
    return [
        {
            title: "Chat with the model",
            content: `npx -y node-llama-cpp chat hf:${model.id}${tagName}`,
        },
        {
            title: "Estimate the model compatibility with your hardware",
            content: `npx -y node-llama-cpp inspect estimate hf:${model.id}${tagName}`,
        },
    ];
};
const snippetOllama = (model, filepath) => {
    return `ollama run hf.co/${model.id}${getQuantTag(filepath)}`;
};
const snippetLocalAI = (model, filepath) => {
    const command = (binary) => ["# Load and run the model:", `${binary} huggingface://${model.id}/${filepath ?? "{{GGUF_FILE}}"}`].join("\n");
    return [
        {
            title: "Install from binary",
            setup: "curl https://localai.io/install.sh | sh",
            content: command("local-ai run"),
        },
        {
            title: "Use Docker images",
            setup: [
                // prettier-ignore
                "# Pull the image:",
                "docker pull localai/localai:latest-cpu",
            ].join("\n"),
            content: command("docker run -p 8080:8080 --name localai -v $PWD/models:/build/models localai/localai:latest-cpu"),
        },
    ];
};
const snippetVllm = (model) => {
    const messages = getModelInputSnippet(model);
    const isMistral = model.tags.includes("mistral-common");
    const mistralFlags = isMistral
        ? " --tokenizer_mode mistral --config_format mistral --load_format mistral --tool-call-parser mistral --enable-auto-tool-choice"
        : "";
    const setup = isMistral
        ? [
            "# Install vLLM from pip:",
            "pip install vllm",
            "# Install mistral-common:",
            "pip install --upgrade mistral-common",
        ].join("\n")
        : ["# Install vLLM from pip:", "pip install vllm"].join("\n");
    const serverCommand = `# Start the vLLM server:
vllm serve "${model.id}"${mistralFlags}`;
    const runCommandInstruct = `# Call the server using curl (OpenAI-compatible API):
curl -X POST "http://localhost:8000/v1/chat/completions" \\
	-H "Content-Type: application/json" \\
	--data '{
		"model": "${model.id}",
		"messages": ${stringifyMessages(messages, {
        indent: "\t\t",
        attributeKeyQuotes: true,
        customContentEscaper: (str) => str.replace(/'/g, "'\\''"),
    })}
	}'`;
    const runCommandNonInstruct = `# Call the server using curl (OpenAI-compatible API):
curl -X POST "http://localhost:8000/v1/completions" \\
	-H "Content-Type: application/json" \\
	--data '{
		"model": "${model.id}",
		"prompt": "Once upon a time,",
		"max_tokens": 512,
		"temperature": 0.5
	}'`;
    const runCommand = model.tags.includes("conversational") ? runCommandInstruct : runCommandNonInstruct;
    return [
        {
            title: "Install from pip and serve model",
            setup: setup,
            content: [serverCommand, runCommand],
        },
        {
            title: "Use Docker",
            content: snippetDockerModelRunner(model),
        },
    ];
};
const snippetSglang = (model) => {
    const messages = getModelInputSnippet(model);
    const setup = ["# Install SGLang from pip:", "pip install sglang"].join("\n");
    const serverCommand = `# Start the SGLang server:
python3 -m sglang.launch_server \\
    --model-path "${model.id}" \\
    --host 0.0.0.0 \\
    --port 30000`;
    const dockerCommand = `docker run --gpus all \\
    --shm-size 32g \\
    -p 30000:30000 \\
    -v ~/.cache/huggingface:/root/.cache/huggingface \\
    --env "HF_TOKEN=<secret>" \\
    --ipc=host \\
    lmsysorg/sglang:latest \\
    python3 -m sglang.launch_server \\
        --model-path "${model.id}" \\
        --host 0.0.0.0 \\
        --port 30000`;
    const runCommandInstruct = `# Call the server using curl (OpenAI-compatible API):
curl -X POST "http://localhost:30000/v1/chat/completions" \\
	-H "Content-Type: application/json" \\
	--data '{
		"model": "${model.id}",
		"messages": ${stringifyMessages(messages, {
        indent: "\t\t",
        attributeKeyQuotes: true,
        customContentEscaper: (str) => str.replace(/'/g, "'\\''"),
    })}
	}'`;
    const runCommandNonInstruct = `# Call the server using curl (OpenAI-compatible API):
curl -X POST "http://localhost:30000/v1/completions" \\
	-H "Content-Type: application/json" \\
	--data '{
		"model": "${model.id}",
		"prompt": "Once upon a time,",
		"max_tokens": 512,
		"temperature": 0.5
	}'`;
    const runCommand = model.tags.includes("conversational") ? runCommandInstruct : runCommandNonInstruct;
    return [
        {
            title: "Install from pip and serve model",
            setup: setup,
            content: [serverCommand, runCommand],
        },
        {
            title: "Use Docker images",
            setup: dockerCommand,
            content: [runCommand],
        },
    ];
};
const snippetTgi = (model) => {
    const runCommand = [
        "# Call the server using curl:",
        `curl -X POST "http://localhost:8000/v1/chat/completions" \\`,
        `	-H "Content-Type: application/json" \\`,
        `	--data '{`,
        `		"model": "${model.id}",`,
        `		"messages": [`,
        `			{"role": "user", "content": "What is the capital of France?"}`,
        `		]`,
        `	}'`,
    ];
    return [
        {
            title: "Use Docker images",
            setup: [
                "# Deploy with docker on Linux:",
                `docker run --gpus all \\`,
                `	-v ~/.cache/huggingface:/root/.cache/huggingface \\`,
                ` 	-e HF_TOKEN="<secret>" \\`,
                `	-p 8000:80 \\`,
                `	ghcr.io/huggingface/text-generation-inference:latest \\`,
                `	--model-id ${model.id}`,
            ].join("\n"),
            content: [runCommand.join("\n")],
        },
    ];
};
const snippetMlxLm = (model) => {
    const openaiCurl = [
        "# Calling the OpenAI-compatible server with curl",
        `curl -X POST "http://localhost:8000/v1/chat/completions" \\`,
        `   -H "Content-Type: application/json" \\`,
        `   --data '{`,
        `     "model": "${model.id}",`,
        `     "messages": [`,
        `       {"role": "user", "content": "Hello"}`,
        `     ]`,
        `   }'`,
    ];
    return [
        {
            title: "Generate or start a chat session",
            setup: ["# Install MLX LM", "uv tool install mlx-lm"].join("\n"),
            content: [
                ...(model.tags.includes("conversational")
                    ? ["# Interactive chat REPL", `mlx_lm.chat --model "${model.id}"`]
                    : ["# Generate some text", `mlx_lm.generate --model "${model.id}" --prompt "Once upon a time"`]),
            ].join("\n"),
        },
        ...(model.tags.includes("conversational")
            ? [
                {
                    title: "Run an OpenAI-compatible server",
                    setup: ["# Install MLX LM", "uv tool install mlx-lm"].join("\n"),
                    content: ["# Start the server", `mlx_lm.server --model "${model.id}"`, ...openaiCurl].join("\n"),
                },
            ]
            : []),
    ];
};
const snippetPi = (model, filepath) => {
    const quantTag = getQuantTag(filepath);
    const modelName = model.id.split("/").pop() ?? model.id;
    const modelsJson = JSON.stringify({
        providers: {
            "llama-cpp": {
                baseUrl: "http://localhost:8080/v1",
                api: "openai-completions",
                apiKey: "none",
                models: [{ id: modelName }],
            },
        },
    }, null, 2);
    return [
        {
            title: "Start the llama.cpp server",
            setup: "# Install llama.cpp:\nbrew install llama.cpp",
            content: `# Start a local OpenAI-compatible server:\nllama-server -hf ${model.id}${quantTag} --jinja`,
        },
        {
            title: "Configure the model in Pi",
            setup: "# Install Pi:\nnpm install -g @mariozechner/pi-coding-agent",
            content: `# Add to ~/.pi/agent/models.json:\n${modelsJson}`,
        },
        {
            title: "Run Pi",
            content: `# Start Pi in your project directory:\npi`,
        },
    ];
};
const snippetDockerModelRunner = (model, filepath) => {
    // Only add quant tag for GGUF models, not safetensors
    const quantTag = isLlamaCppGgufModel(model) ? getQuantTag(filepath) : "";
    return `docker model run hf.co/${model.id}${quantTag}`;
};
const snippetLemonade = (model, filepath) => {
    const tagName = getQuantTag(filepath);
    const modelName = model.id.includes("/") ? model.id.split("/")[1] : model.id;
    // Get recipe according to model type
    let simplifiedModelName;
    let recipe;
    let checkpoint;
    let requirements;
    if (model.tags.some((tag) => ["ryzenai-npu", "ryzenai-hybrid"].includes(tag))) {
        recipe = model.tags.includes("ryzenai-npu") ? "oga-npu" : "oga-hybrid";
        checkpoint = model.id;
        requirements = " (requires RyzenAI 300 series)";
        simplifiedModelName = modelName.split("-awq-")[0];
        simplifiedModelName += recipe === "oga-npu" ? "-NPU" : "-Hybrid";
    }
    else {
        recipe = "llamacpp";
        checkpoint = `${model.id}${tagName}`;
        requirements = "";
        simplifiedModelName = modelName;
    }
    return [
        {
            title: "Pull the model",
            setup: "# Download Lemonade from https://lemonade-server.ai/",
            content: [
                `lemonade-server pull user.${simplifiedModelName} --checkpoint ${checkpoint} --recipe ${recipe}`,
                "# Note: If you installed from source, use the lemonade-server-dev command instead.",
            ].join("\n"),
        },
        {
            title: `Run and chat with the model${requirements}`,
            content: `lemonade-server run user.${simplifiedModelName}`,
        },
        {
            title: "List all available models",
            content: "lemonade-server list",
        },
    ];
};
/**
 * Add your new local app here.
 *
 * This is open to new suggestions and awesome upcoming apps.
 *
 * /!\ IMPORTANT
 *
 * If possible, you need to support deeplinks and be as cross-platform as possible.
 *
 * Ping the HF team if we can help with anything!
 */
export const LOCAL_APPS = {
    "llama.cpp": {
        prettyLabel: "llama.cpp",
        docsUrl: "https://github.com/ggerganov/llama.cpp",
        mainTask: "text-generation",
        displayOnModelPage: isLlamaCppGgufModel,
        snippet: snippetLlamacpp,
    },
    "node-llama-cpp": {
        prettyLabel: "node-llama-cpp",
        docsUrl: "https://node-llama-cpp.withcat.ai",
        mainTask: "text-generation",
        displayOnModelPage: isLlamaCppGgufModel,
        snippet: snippetNodeLlamaCppCli,
    },
    vllm: {
        prettyLabel: "vLLM",
        docsUrl: "https://docs.vllm.ai",
        mainTask: "text-generation",
        displayOnModelPage: isVllmModel,
        snippet: snippetVllm,
    },
    sglang: {
        prettyLabel: "SGLang",
        docsUrl: "https://docs.sglang.io",
        mainTask: "text-generation",
        displayOnModelPage: (model) => (isAwqModel(model) ||
            isGptqModel(model) ||
            isAqlmModel(model) ||
            isMarlinModel(model) ||
            isTransformersModel(model)) &&
            (model.pipeline_tag === "text-generation" || model.pipeline_tag === "image-text-to-text"),
        snippet: snippetSglang,
    },
    "mlx-lm": {
        prettyLabel: "MLX LM",
        docsUrl: "https://github.com/ml-explore/mlx-lm",
        mainTask: "text-generation",
        displayOnModelPage: (model) => model.pipeline_tag === "text-generation" && isMlxModel(model),
        snippet: snippetMlxLm,
    },
    tgi: {
        prettyLabel: "TGI",
        docsUrl: "https://huggingface.co/docs/text-generation-inference/",
        mainTask: "text-generation",
        displayOnModelPage: isTgiModel,
        snippet: snippetTgi,
    },
    lmstudio: {
        prettyLabel: "LM Studio",
        docsUrl: "https://lmstudio.ai",
        mainTask: "text-generation",
        displayOnModelPage: (model) => isLlamaCppGgufModel(model) || isMlxModel(model),
        deeplink: (model, filepath) => new URL(`lmstudio://open_from_hf?model=${model.id}${filepath ? `&file=${filepath}` : ""}`),
    },
    localai: {
        prettyLabel: "LocalAI",
        docsUrl: "https://github.com/mudler/LocalAI",
        mainTask: "text-generation",
        displayOnModelPage: isLlamaCppGgufModel,
        snippet: snippetLocalAI,
    },
    jan: {
        prettyLabel: "Jan",
        docsUrl: "https://jan.ai",
        mainTask: "text-generation",
        displayOnModelPage: isLlamaCppGgufModel,
        deeplink: (model) => new URL(`jan://models/huggingface/${model.id}`),
    },
    backyard: {
        prettyLabel: "Backyard AI",
        docsUrl: "https://backyard.ai",
        mainTask: "text-generation",
        displayOnModelPage: isLlamaCppGgufModel,
        deeplink: (model) => new URL(`https://backyard.ai/hf/model/${model.id}`),
    },
    sanctum: {
        prettyLabel: "Sanctum",
        docsUrl: "https://sanctum.ai",
        mainTask: "text-generation",
        displayOnModelPage: isLlamaCppGgufModel,
        deeplink: (model) => new URL(`sanctum://open_from_hf?model=${model.id}`),
    },
    jellybox: {
        prettyLabel: "Jellybox",
        docsUrl: "https://jellybox.com",
        mainTask: "text-generation",
        displayOnModelPage: (model) => isLlamaCppGgufModel(model) ||
            (model.library_name === "diffusers" &&
                model.tags.includes("safetensors") &&
                (model.pipeline_tag === "text-to-image" || model.tags.includes("lora"))),
        deeplink: (model) => {
            if (isLlamaCppGgufModel(model)) {
                return new URL(`jellybox://llm/models/huggingface/LLM/${model.id}`);
            }
            else if (model.tags.includes("lora")) {
                return new URL(`jellybox://image/models/huggingface/ImageLora/${model.id}`);
            }
            else {
                return new URL(`jellybox://image/models/huggingface/Image/${model.id}`);
            }
        },
    },
    msty: {
        prettyLabel: "Msty",
        docsUrl: "https://msty.app",
        mainTask: "text-generation",
        displayOnModelPage: isLlamaCppGgufModel,
        deeplink: (model) => new URL(`msty://models/search/hf/${model.id}`),
    },
    recursechat: {
        prettyLabel: "RecurseChat",
        docsUrl: "https://recurse.chat",
        mainTask: "text-generation",
        macOSOnly: true,
        displayOnModelPage: isLlamaCppGgufModel,
        deeplink: (model) => new URL(`recursechat://new-hf-gguf-model?hf-model-id=${model.id}`),
    },
    drawthings: {
        prettyLabel: "Draw Things",
        docsUrl: "https://drawthings.ai",
        mainTask: "text-to-image",
        macOSOnly: true,
        displayOnModelPage: (model) => model.library_name === "diffusers" && (model.pipeline_tag === "text-to-image" || model.tags.includes("lora")),
        deeplink: (model) => {
            if (model.tags.includes("lora")) {
                return new URL(`https://drawthings.ai/import/diffusers/pipeline.load_lora_weights?repo_id=${model.id}`);
            }
            else {
                return new URL(`https://drawthings.ai/import/diffusers/pipeline.from_pretrained?repo_id=${model.id}`);
            }
        },
    },
    diffusionbee: {
        prettyLabel: "DiffusionBee",
        docsUrl: "https://diffusionbee.com",
        mainTask: "text-to-image",
        macOSOnly: true,
        displayOnModelPage: (model) => model.library_name === "diffusers" && model.pipeline_tag === "text-to-image",
        deeplink: (model) => new URL(`https://diffusionbee.com/huggingface_import?model_id=${model.id}`),
    },
    joyfusion: {
        prettyLabel: "JoyFusion",
        docsUrl: "https://joyfusion.app",
        mainTask: "text-to-image",
        macOSOnly: true,
        displayOnModelPage: (model) => model.tags.includes("coreml") && model.tags.includes("joyfusion") && model.pipeline_tag === "text-to-image",
        deeplink: (model) => new URL(`https://joyfusion.app/import_from_hf?repo_id=${model.id}`),
    },
    ollama: {
        prettyLabel: "Ollama",
        docsUrl: "https://ollama.com",
        mainTask: "text-generation",
        displayOnModelPage: isLlamaCppGgufModel,
        snippet: snippetOllama,
    },
    "docker-model-runner": {
        prettyLabel: "Docker Model Runner",
        docsUrl: "https://docs.docker.com/ai/model-runner/",
        mainTask: "text-generation",
        displayOnModelPage: isDockerModelRunnerModel,
        snippet: snippetDockerModelRunner,
    },
    lemonade: {
        prettyLabel: "Lemonade",
        docsUrl: "https://lemonade-server.ai",
        mainTask: "text-generation",
        displayOnModelPage: (model) => isLlamaCppGgufModel(model) || isAmdRyzenModel(model),
        snippet: snippetLemonade,
    },
    pi: {
        prettyLabel: "Pi",
        docsUrl: "https://github.com/badlogic/pi-mono",
        mainTask: "text-generation",
        displayOnModelPage: (model) => isLlamaCppGgufModel(model) && !!model.gguf?.chat_template?.includes("tools"),
        snippet: snippetPi,
    },
};
