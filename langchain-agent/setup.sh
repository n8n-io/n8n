#!/bin/bash
# Setup script for n8n Workflow Builder Agent (Local LLM)

set -e

echo "🚀 n8n Workflow Builder Agent Setup"
echo "===================================="
echo ""

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

# Check if running on Linux with NVIDIA GPU
if command -v nvidia-smi &> /dev/null; then
    echo "✓ NVIDIA GPU detected"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
else
    echo "⚠ No NVIDIA GPU detected. You can still use CPU-based inference."
fi

echo ""
echo "Choose your LLM backend:"
echo "1) Ollama (Recommended - easiest setup)"
echo "2) vLLM (Production performance)"
echo "3) LlamaCpp (CPU/GPU hybrid)"
echo "4) Skip LLM setup"
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo ""
        echo "📦 Installing Ollama..."
        if command -v ollama &> /dev/null; then
            echo "✓ Ollama already installed"
        else
            curl -fsSL https://ollama.com/install.sh | sh
        fi

        echo ""
        echo "📥 Available models for RTX 5090 32GB:"
        echo "  - qwen2.5:72b (Recommended - excellent for code)"
        echo "  - llama3.1:70b (Strong general purpose)"
        echo "  - qwen2.5-coder:32b (Faster, still great)"
        echo "  - deepseek-coder-v2 (Specialized for code)"
        echo ""
        read -p "Enter model name to pull [qwen2.5:72b]: " model_name
        model_name=${model_name:-qwen2.5:72b}

        echo "📥 Pulling model $model_name (this may take a while)..."
        ollama pull "$model_name"

        echo "✓ Ollama setup complete!"
        echo ""
        echo "To start Ollama: ollama serve"
        echo "To run agent: python workflow_builder_agent.py --model-name $model_name --interactive"
        ;;

    2)
        echo ""
        echo "📦 Installing vLLM..."
        pip install vllm

        echo ""
        echo "⚠ You'll need to manually download a model from HuggingFace"
        echo "Example: huggingface-cli download Qwen/Qwen2.5-72B-Instruct-AWQ"
        echo ""
        echo "To start vLLM:"
        echo "vllm serve Qwen/Qwen2.5-72B-Instruct-AWQ --port 8000 --quantization awq"
        ;;

    3)
        echo ""
        echo "📦 Installing LlamaCpp with CUDA support..."
        CMAKE_ARGS="-DLLAMA_CUDA=on" pip install llama-cpp-python

        echo ""
        echo "⚠ You'll need to download a GGUF model"
        echo "Example: https://huggingface.co/Qwen/Qwen2.5-72B-Instruct-GGUF"
        ;;

    4)
        echo "Skipping LLM setup"
        ;;
esac

echo ""
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start your LLM backend (Ollama/vLLM/LlamaCpp)"
echo "2. Run the agent:"
echo "   python workflow_builder_agent.py --interactive"
echo ""
echo "For help:"
echo "   python workflow_builder_agent.py --help"
echo ""
echo "📚 Documentation:"
echo "   - Quick start: README.md"
echo "   - Repository organization: REPO-ORGANIZATION.md"
echo "   - Claude Code skill: ../.claude/README.md"
echo ""
