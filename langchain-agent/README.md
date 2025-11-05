# n8n Workflow Builder Agent - Local LLM Version

Create production-ready n8n workflows using a local LLM running on your GPU. Optimized for **RTX 5090 32GB VRAM**.

## Overview

This is a LangChain-based agent that can:
- Create complete n8n workflow JSON files
- Search through 100+ example workflows in the repository
- Reference actual n8n node documentation
- Validate workflow structure
- Save workflows ready for import

**Key Difference from Claude Code Skill**: This runs entirely locally on your GPU - no API calls, no rate limits, complete privacy.

## Hardware Requirements

**Optimal Setup (Your Hardware)**:
- RTX 5090 32GB VRAM
- Can run models up to 70B parameters comfortably
- Recommended models: Qwen 2.5 72B, Llama 3.1 70B, DeepSeek-V2

**Minimum**:
- RTX 3090 24GB VRAM (can run 30B-40B models)
- RTX 4090 24GB VRAM (can run 40B-50B models)

## Quick Start

### Option 1: Ollama (Recommended - Easiest Setup)

**Step 1: Install Ollama**
```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Verify installation
ollama --version
```

**Step 2: Pull a Model**

For RTX 5090 32GB, recommended models:

```bash
# Qwen 2.5 72B - Excellent for code and reasoning
ollama pull qwen2.5:72b

# Or Llama 3.1 70B - Strong general performance
ollama pull llama3.1:70b

# Or Qwen 2.5 Coder 32B - Faster, still great for workflows
ollama pull qwen2.5-coder:32b

# Or DeepSeek Coder V2 - Specialized for code
ollama pull deepseek-coder-v2:236b  # Uses quantization, fits in 32GB
```

**Step 3: Start Ollama**
```bash
# Ollama runs as a service, but you can start it manually:
ollama serve
```

**Step 4: Install Python Dependencies**
```bash
cd langchain-agent
pip install -r requirements.txt
```

**Step 5: Run the Agent**
```bash
# Single query
python workflow_builder_agent.py \
    --model-type ollama \
    --model-name qwen2.5:72b \
    --query "Create a workflow that fetches GitHub issues and sends Slack notifications"

# Interactive mode
python workflow_builder_agent.py \
    --model-type ollama \
    --model-name qwen2.5:72b \
    --interactive
```

### Option 2: vLLM (Production Performance)

vLLM offers better throughput and batching for production use.

**Step 1: Install vLLM**
```bash
pip install vllm
```

**Step 2: Download Model from HuggingFace**
```bash
# Install HF CLI
pip install huggingface-hub

# Login (optional, for gated models)
huggingface-cli login

# Download model (example: Qwen 2.5 72B)
huggingface-cli download Qwen/Qwen2.5-72B-Instruct
```

**Step 3: Start vLLM Server**
```bash
# For RTX 5090 32GB - can run 70B models with quantization
vllm serve Qwen/Qwen2.5-72B-Instruct \
    --port 8000 \
    --gpu-memory-utilization 0.95 \
    --max-model-len 8192 \
    --quantization awq  # Optional: AWQ quantization for larger models

# For even better fit, use 4-bit quantization:
vllm serve Qwen/Qwen2.5-72B-Instruct-AWQ \
    --port 8000 \
    --quantization awq \
    --gpu-memory-utilization 0.95
```

**Step 4: Run the Agent**
```bash
python workflow_builder_agent.py \
    --model-type vllm \
    --model-name Qwen/Qwen2.5-72B-Instruct \
    --base-url http://localhost:8000/v1 \
    --query "Create an AI customer support agent workflow"
```

### Option 3: LlamaCpp (CPU/GPU Hybrid)

Good for testing or if you want CPU fallback.

**Step 1: Install**
```bash
# With GPU support
CMAKE_ARGS="-DLLAMA_CUDA=on" pip install llama-cpp-python

# Or from source for latest features
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make LLAMA_CUDA=1
```

**Step 2: Download GGUF Model**
```bash
# Download from HuggingFace (example)
wget https://huggingface.co/Qwen/Qwen2.5-72B-Instruct-GGUF/resolve/main/qwen2.5-72b-instruct-q4_k_m.gguf
```

**Step 3: Run the Agent**
```bash
python workflow_builder_agent.py \
    --model-type llamacpp \
    --model-name /path/to/qwen2.5-72b-instruct-q4_k_m.gguf \
    --query "Build a scheduled data sync workflow"
```

## Model Recommendations for RTX 5090 32GB

| Model | Size | VRAM Usage | Speed | Best For |
|-------|------|------------|-------|----------|
| **Qwen 2.5 72B** | 72B | ~28GB (4-bit) | Medium | Coding, reasoning, workflows |
| **Llama 3.1 70B** | 70B | ~28GB (4-bit) | Medium | General purpose, strong reasoning |
| **Qwen 2.5 Coder 32B** | 32B | ~18GB (4-bit) | Fast | Code generation, technical tasks |
| **DeepSeek Coder V2** | 236B MoE | ~30GB (quantized) | Medium | Specialized code generation |
| **Mixtral 8x22B** | 141B MoE | ~30GB (4-bit) | Fast | Balanced performance |
| **Qwen 2.5 14B** | 14B | ~10GB | Very Fast | Quick iterations, testing |

**Recommendation**: Start with **Qwen 2.5 Coder 32B** for speed, then try **Qwen 2.5 72B** for best quality.

## Usage Examples

### Example 1: Simple Workflow
```bash
python workflow_builder_agent.py \
    --model-name qwen2.5:72b \
    --query "Create a workflow that triggers manually, fetches data from JSONPlaceholder API, and logs the results"
```

### Example 2: AI Agent Workflow
```bash
python workflow_builder_agent.py \
    --model-name qwen2.5:72b \
    --query "Build an AI customer support agent using Anthropic Claude that can:
    - Answer questions from a knowledge base
    - Create support tickets in Linear
    - Escalate to human if uncertain
    - Remember conversation context"
```

### Example 3: Complex Integration
```bash
python workflow_builder_agent.py \
    --model-name qwen2.5:72b \
    --query "Create a workflow that:
    1. Triggers every hour
    2. Fetches new GitHub issues
    3. Analyzes sentiment using AI
    4. Creates tasks in Asana for high-priority issues
    5. Sends daily digest to Slack"
```

### Example 4: Interactive Session
```bash
python workflow_builder_agent.py --model-name qwen2.5:72b --interactive

You: Show me examples of webhook workflows
Agent: [searches examples and shows matches]

You: Create a webhook that receives Stripe payments and sends thank you emails
Agent: [creates complete workflow JSON]

You: Add error handling and retry logic
Agent: [updates workflow with error handling]
```

## Agent Capabilities

The agent has access to these tools:

1. **search_examples** - Search 100+ example workflows
2. **read_example** - Read specific workflow files
3. **list_nodes** - List all available n8n node types
4. **get_node_docs** - Get documentation for specific nodes
5. **validate_workflow** - Validate workflow JSON structure
6. **save_workflow** - Save workflow to file

## Output

Workflows are saved to: `/home/user/n8n/workflows/`

Each workflow includes:
- Complete, valid JSON structure
- Proper node IDs (UUIDs)
- Correct connections
- Appropriate node positioning
- Ready to import into n8n

## Performance Tuning

### For RTX 5090 32GB

**Maximize Quality**:
```bash
# Use 72B model with AWQ quantization
vllm serve Qwen/Qwen2.5-72B-Instruct-AWQ \
    --gpu-memory-utilization 0.95 \
    --max-model-len 8192
```

**Maximize Speed**:
```bash
# Use 32B model, full precision
vllm serve Qwen/Qwen2.5-Coder-32B-Instruct \
    --gpu-memory-utilization 0.90 \
    --max-model-len 16384
```

**Balanced**:
```bash
# Use 72B model with 4-bit quantization
ollama run qwen2.5:72b
```

### Memory Management

If you encounter OOM errors:

1. **Reduce max_model_len**: Lower context window
   ```bash
   vllm serve <model> --max-model-len 4096
   ```

2. **Use quantization**: 4-bit or 8-bit
   ```bash
   vllm serve <model> --quantization awq
   ```

3. **Try smaller model**: Drop from 72B to 32B
   ```bash
   ollama pull qwen2.5-coder:32b
   ```

4. **Adjust GPU utilization**:
   ```bash
   vllm serve <model> --gpu-memory-utilization 0.85
   ```

## Comparison: Local vs Cloud (Claude API)

| Feature | Local (RTX 5090) | Cloud (Claude API) |
|---------|------------------|-------------------|
| **Cost** | $0 after hardware | ~$3-15 per 1M tokens |
| **Privacy** | Complete | Data sent to API |
| **Speed** | ~50-100 tokens/sec | ~40-80 tokens/sec |
| **Quality** | Very good (72B) | Excellent (Claude 3.5) |
| **Availability** | Always on | Internet required |
| **Rate Limits** | None | Yes (tier-based) |
| **Context Window** | 8K-32K | 200K |

**When to use Local**:
- High volume workflow generation
- Privacy-sensitive projects
- No internet connectivity
- Cost optimization for scale
- Experimentation without limits

**When to use Claude API**:
- Need maximum quality
- Large context requirements (100K+ tokens)
- Occasional use
- Want latest model updates

## Troubleshooting

### Issue: "CUDA out of memory"
**Solution**:
- Use smaller model (32B instead of 72B)
- Enable quantization (4-bit or 8-bit)
- Reduce --gpu-memory-utilization
- Lower --max-model-len

### Issue: Ollama not responding
**Solution**:
```bash
# Check if Ollama is running
ollama list

# Restart Ollama
sudo systemctl restart ollama

# Or run manually
ollama serve
```

### Issue: vLLM server won't start
**Solution**:
- Check GPU availability: `nvidia-smi`
- Verify model is downloaded
- Try smaller --max-model-len
- Use --quantization awq

### Issue: Generated workflows invalid
**Solution**:
- Use higher quality model (72B vs 14B)
- Lower temperature (--temperature 0.1)
- Ask agent to validate before saving
- Check if model has enough context

## Advanced Usage

### Custom Prompts

Edit the prompt in `workflow_builder_agent.py` to customize behavior:
```python
prompt = PromptTemplate.from_template("""
Your custom system prompt here...
{tools}
{tool_names}
{input}
{agent_scratchpad}
""")
```

### Add RAG (Retrieval Augmented Generation)

```python
from langchain.vectorstores import Chroma
from langchain.embeddings import HuggingFaceEmbeddings

# Index all workflow examples
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = Chroma.from_documents(documents, embeddings)

# Add retrieval tool
retriever_tool = Tool(
    name="search_knowledge_base",
    func=vectorstore.similarity_search,
    description="Search indexed workflow examples and documentation"
)
```

### Multi-GPU Support

```bash
# vLLM automatically uses all available GPUs
vllm serve <model> --tensor-parallel-size 2  # For 2x GPUs
```

## Next Steps

1. **Start Simple**: Try creating basic workflows first
2. **Experiment with Models**: Test different sizes to find your speed/quality balance
3. **Build Library**: Create a collection of reusable workflow templates
4. **Automate**: Set up API endpoint to generate workflows on demand
5. **Integrate**: Add to your CI/CD pipeline or internal tools

## Resources

- **Ollama Models**: https://ollama.com/library
- **vLLM Documentation**: https://docs.vllm.ai/
- **HuggingFace Models**: https://huggingface.co/models?sort=trending
- **n8n Documentation**: https://docs.n8n.io/
- **LangChain Docs**: https://python.langchain.com/

---

**Enjoy unlimited workflow generation on your RTX 5090! 🚀**
