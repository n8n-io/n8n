#!/usr/bin/env python3
"""
n8n Workflow Builder Agent - LangChain Local Model Version

This agent creates production-ready n8n workflows using a local LLM running on your GPU.
Optimized for RTX 5090 32GB VRAM - can run models like Llama 3.1 70B, Qwen 2.5 72B, etc.

Supports:
- Ollama (easiest setup)
- vLLM (production performance)
- LlamaCpp (CPU fallback)
- HuggingFace local inference
"""

import json
import os
import sys
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from langchain.agents import AgentExecutor, create_react_agent
from langchain.tools import Tool
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain_community.chat_models import ChatOllama
from langchain_community.llms import VLLMOpenAI, LlamaCpp
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler

# Repository paths
REPO_ROOT = Path(__file__).parent.parent
WORKFLOWS_DIR = REPO_ROOT / "workflows"
EXAMPLES_DIR = REPO_ROOT / "cypress" / "fixtures"
TEST_WORKFLOWS_DIR = REPO_ROOT / "test-workflows" / "workflows"
DOCS_DIR = REPO_ROOT


class N8nWorkflowTools:
    """Tools for the agent to access n8n documentation and examples"""

    @staticmethod
    def search_example_workflows(query: str) -> str:
        """Search through example workflows for patterns"""
        results = []
        search_dirs = [EXAMPLES_DIR, TEST_WORKFLOWS_DIR]

        for search_dir in search_dirs:
            if not search_dir.exists():
                continue

            for workflow_file in search_dir.glob("*.json"):
                try:
                    with open(workflow_file, 'r') as f:
                        content = f.read()
                        if query.lower() in content.lower():
                            # Load and get basic info
                            data = json.loads(content)
                            name = data.get('name', workflow_file.stem)
                            node_types = [node.get('type', 'unknown') for node in data.get('nodes', [])]
                            results.append({
                                'file': str(workflow_file.relative_to(REPO_ROOT)),
                                'name': name,
                                'node_types': list(set(node_types))
                            })
                except Exception as e:
                    continue

        if not results:
            return f"No examples found matching '{query}'"

        return json.dumps(results[:10], indent=2)  # Return top 10 matches

    @staticmethod
    def read_workflow_example(file_path: str) -> str:
        """Read a specific workflow example file"""
        try:
            full_path = REPO_ROOT / file_path
            with open(full_path, 'r') as f:
                return f.read()
        except Exception as e:
            return f"Error reading file: {str(e)}"

    @staticmethod
    def list_available_nodes() -> str:
        """List available n8n node types from the codebase"""
        nodes_dir = REPO_ROOT / "packages" / "nodes-base" / "nodes"
        langchain_dir = REPO_ROOT / "packages" / "@n8n" / "nodes-langchain" / "nodes"

        available_nodes = []

        # Scan nodes-base
        if nodes_dir.exists():
            for node_dir in nodes_dir.iterdir():
                if node_dir.is_dir():
                    available_nodes.append(f"n8n-nodes-base.{node_dir.name}")

        # Scan langchain nodes
        if langchain_dir.exists():
            for node_dir in langchain_dir.iterdir():
                if node_dir.is_dir():
                    available_nodes.append(f"@n8n/n8n-nodes-langchain.{node_dir.name}")

        return "\n".join(sorted(available_nodes[:50]))  # Return first 50

    @staticmethod
    def get_node_documentation(node_type: str) -> str:
        """Get documentation for a specific node type"""
        # Parse node type to find the directory
        if node_type.startswith("n8n-nodes-base."):
            node_name = node_type.replace("n8n-nodes-base.", "")
            node_dir = REPO_ROOT / "packages" / "nodes-base" / "nodes" / node_name
        elif node_type.startswith("@n8n/n8n-nodes-langchain."):
            node_name = node_type.replace("@n8n/n8n-nodes-langchain.", "")
            node_dir = REPO_ROOT / "packages" / "@n8n" / "nodes-langchain" / "nodes" / node_name
        else:
            return f"Unknown node type format: {node_type}"

        if not node_dir.exists():
            return f"Node directory not found: {node_dir}"

        # Look for README or description files
        readme = node_dir / "README.md"
        if readme.exists():
            with open(readme, 'r') as f:
                return f.read()

        # Look for TypeScript files to extract parameter info
        ts_files = list(node_dir.glob("*.node.ts"))
        if ts_files:
            with open(ts_files[0], 'r') as f:
                content = f.read()
                # Extract first 100 lines for parameter definitions
                lines = content.split('\n')[:100]
                return '\n'.join(lines)

        return f"No documentation found for {node_type}"

    @staticmethod
    def validate_workflow_json(workflow_json: str) -> str:
        """Validate that a workflow JSON is properly formatted"""
        try:
            data = json.loads(workflow_json)

            # Check required fields
            required_fields = ['nodes', 'connections']
            missing = [f for f in required_fields if f not in data]
            if missing:
                return f"Missing required fields: {missing}"

            # Validate nodes
            if not isinstance(data['nodes'], list):
                return "nodes must be a list"

            node_names = []
            for i, node in enumerate(data['nodes']):
                if 'id' not in node:
                    return f"Node {i} missing 'id'"
                if 'name' not in node:
                    return f"Node {i} missing 'name'"
                if 'type' not in node:
                    return f"Node {i} missing 'type'"
                node_names.append(node['name'])

            # Validate connections reference existing nodes
            if isinstance(data['connections'], dict):
                for source in data['connections']:
                    if source not in node_names:
                        return f"Connection references non-existent node: {source}"

            return "✓ Valid workflow JSON"

        except json.JSONDecodeError as e:
            return f"Invalid JSON: {str(e)}"
        except Exception as e:
            return f"Validation error: {str(e)}"

    @staticmethod
    def save_workflow(workflow_json: str, filename: str) -> str:
        """Save a workflow to the workflows directory"""
        try:
            # Ensure workflows directory exists
            WORKFLOWS_DIR.mkdir(exist_ok=True)

            # Validate JSON first
            data = json.loads(workflow_json)

            # Save with pretty formatting
            output_path = WORKFLOWS_DIR / filename
            with open(output_path, 'w') as f:
                json.dump(data, f, indent=2)

            return f"✓ Workflow saved to: {output_path.relative_to(REPO_ROOT)}"

        except Exception as e:
            return f"Error saving workflow: {str(e)}"


def create_workflow_builder_agent(
    model_type: str = "ollama",
    model_name: str = "qwen2.5:72b",
    base_url: Optional[str] = None,
    temperature: float = 0.1,
    verbose: bool = True
):
    """
    Create the n8n workflow builder agent

    Args:
        model_type: "ollama", "vllm", "llamacpp", or "hf"
        model_name: Model name (e.g., "qwen2.5:72b", "meta-llama/Llama-3.1-70B")
        base_url: Base URL for API (for vllm/ollama remote)
        temperature: Sampling temperature (0.0-1.0, lower = more deterministic)
        verbose: Print agent reasoning steps
    """

    # Initialize LLM based on type
    if model_type == "ollama":
        llm = ChatOllama(
            model=model_name,
            base_url=base_url or "http://localhost:11434",
            temperature=temperature,
            callbacks=[StreamingStdOutCallbackHandler()] if verbose else []
        )
    elif model_type == "vllm":
        llm = VLLMOpenAI(
            model_name=model_name,
            openai_api_base=base_url or "http://localhost:8000/v1",
            temperature=temperature,
            max_tokens=4096
        )
    elif model_type == "llamacpp":
        llm = LlamaCpp(
            model_path=model_name,  # Path to GGUF file
            temperature=temperature,
            n_ctx=8192,
            n_gpu_layers=-1,  # Use all GPU layers
            callbacks=[StreamingStdOutCallbackHandler()] if verbose else []
        )
    else:
        raise ValueError(f"Unknown model_type: {model_type}")

    # Create tools
    tools = [
        Tool(
            name="search_examples",
            func=N8nWorkflowTools.search_example_workflows,
            description="Search through 100+ example n8n workflows. Input should be a keyword like 'webhook', 'agent', 'slack', etc."
        ),
        Tool(
            name="read_example",
            func=N8nWorkflowTools.read_workflow_example,
            description="Read a specific workflow example file. Input should be the file path returned by search_examples."
        ),
        Tool(
            name="list_nodes",
            func=N8nWorkflowTools.list_available_nodes,
            description="List all available n8n node types in the codebase. No input required."
        ),
        Tool(
            name="get_node_docs",
            func=N8nWorkflowTools.get_node_documentation,
            description="Get documentation for a specific node type. Input should be the node type like 'n8n-nodes-base.httpRequest'."
        ),
        Tool(
            name="validate_workflow",
            func=N8nWorkflowTools.validate_workflow_json,
            description="Validate a workflow JSON structure. Input should be the complete workflow JSON string."
        ),
        Tool(
            name="save_workflow",
            func=lambda x: N8nWorkflowTools.save_workflow(
                x.split("|||")[0],
                x.split("|||")[1]
            ),
            description="Save a workflow to file. Input format: 'workflow_json|||filename.json'"
        )
    ]

    # Create prompt template
    prompt = PromptTemplate.from_template("""You are an expert n8n workflow automation builder. Your goal is to create production-ready n8n workflows that work immediately when imported.

You have access to:
- 100+ example workflows in the repository
- Complete n8n node documentation
- Tools to validate and save workflows

When creating workflows:
1. Search examples to find similar patterns
2. Use the list_nodes tool to see available nodes
3. Get documentation for specific nodes if needed
4. Create complete, valid workflow JSON
5. Validate the JSON structure
6. Save the workflow to a file

Workflow JSON Structure:
{{
  "name": "Workflow Name",
  "nodes": [
    {{
      "parameters": {{}},
      "id": "unique-uuid",
      "name": "Node Name",
      "type": "n8n-nodes-base.nodeType",
      "typeVersion": 1,
      "position": [x, y]
    }}
  ],
  "connections": {{
    "Source Node Name": {{
      "main": [[{{"node": "Target Node Name", "type": "main", "index": 0}}]]
    }}
  }},
  "pinData": {{}},
  "settings": {{"executionOrder": "v1"}},
  "staticData": null,
  "tags": [],
  "triggerCount": 0,
  "updatedAt": "{datetime.utcnow().isoformat()}Z"
}}

IMPORTANT:
- Each node must have a unique UUID for the 'id' field
- Connection keys must match node 'name' fields exactly
- Use appropriate node positions (250px apart horizontally)
- Include proper error handling
- Follow n8n best practices

You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought:{agent_scratchpad}""")

    # Create agent
    agent = create_react_agent(llm, tools, prompt)

    # Create agent executor with memory
    memory = ConversationBufferMemory(memory_key="chat_history")

    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        memory=memory,
        verbose=verbose,
        handle_parsing_errors=True,
        max_iterations=10
    )

    return agent_executor


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="n8n Workflow Builder Agent with Local LLM")
    parser.add_argument("--model-type", default="ollama", choices=["ollama", "vllm", "llamacpp"],
                       help="LLM backend type")
    parser.add_argument("--model-name", default="qwen2.5:72b",
                       help="Model name (e.g., qwen2.5:72b, llama3.1:70b)")
    parser.add_argument("--base-url", help="Base URL for API")
    parser.add_argument("--temperature", type=float, default=0.1,
                       help="Sampling temperature (0.0-1.0)")
    parser.add_argument("--query", help="Single query to run")
    parser.add_argument("--interactive", action="store_true",
                       help="Run in interactive mode")

    args = parser.parse_args()

    print(f"🚀 Initializing n8n Workflow Builder Agent...")
    print(f"   Model: {args.model_type}/{args.model_name}")
    print(f"   Repository: {REPO_ROOT}")
    print()

    # Create agent
    try:
        agent = create_workflow_builder_agent(
            model_type=args.model_type,
            model_name=args.model_name,
            base_url=args.base_url,
            temperature=args.temperature,
            verbose=True
        )
    except Exception as e:
        print(f"❌ Error initializing agent: {e}")
        print("\nMake sure your local LLM is running:")
        print("  - Ollama: ollama serve")
        print("  - vLLM: vllm serve <model> --port 8000")
        sys.exit(1)

    # Run query or interactive mode
    if args.query:
        print(f"📝 Query: {args.query}\n")
        result = agent.invoke({"input": args.query})
        print("\n" + "="*80)
        print("📋 Result:")
        print(result["output"])
    elif args.interactive:
        print("💬 Interactive mode - type 'exit' to quit\n")
        while True:
            try:
                query = input("You: ").strip()
                if query.lower() in ['exit', 'quit', 'q']:
                    break
                if not query:
                    continue

                result = agent.invoke({"input": query})
                print(f"\n🤖 Agent: {result['output']}\n")
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"❌ Error: {e}\n")
    else:
        print("Please provide --query or --interactive flag")
        parser.print_help()


if __name__ == "__main__":
    main()
