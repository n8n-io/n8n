# Agentic System Design

Agent architectures, tool use patterns, and multi-agent orchestration with pseudocode.

## Architectures Index

1. [ReAct Pattern](#1-react-pattern)
2. [Plan-and-Execute](#2-plan-and-execute)
3. [Tool Use / Function Calling](#3-tool-use--function-calling)
4. [Multi-Agent Collaboration](#4-multi-agent-collaboration)
5. [Memory and State Management](#5-memory-and-state-management)
6. [Agent Design Patterns](#6-agent-design-patterns)

---

## 1. ReAct Pattern

**Reasoning + Acting**: The agent alternates between thinking about what to do and taking actions.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ReAct Loop                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐ │
│   │ Thought │───▶│ Action  │───▶│  Tool   │───▶│Observat.│ │
│   └─────────┘    └─────────┘    └─────────┘    └────┬────┘ │
│        ▲                                            │       │
│        └────────────────────────────────────────────┘       │
│                         (loop until done)                   │
└─────────────────────────────────────────────────────────────┘
```

### Pseudocode

```python
def react_agent(query, tools, max_iterations=10):
    """
    ReAct agent implementation.

    Args:
        query: User question
        tools: Dict of available tools {name: function}
        max_iterations: Safety limit
    """
    context = f"Question: {query}\n"

    for i in range(max_iterations):
        # Generate thought and action
        response = llm.generate(
            REACT_PROMPT.format(
                tools=format_tools(tools),
                context=context
            )
        )

        # Parse response
        thought = extract_thought(response)
        action = extract_action(response)

        context += f"Thought: {thought}\n"

        # Check for final answer
        if action.name == "finish":
            return action.argument

        # Execute tool
        if action.name in tools:
            observation = tools[action.name](action.argument)
            context += f"Action: {action.name}({action.argument})\n"
            context += f"Observation: {observation}\n"
        else:
            context += f"Error: Unknown tool {action.name}\n"

    return "Max iterations reached"
```

### Prompt Template

```
You are a helpful assistant that can use tools to answer questions.

Available tools:
{tools}

Answer format:
Thought: [your reasoning about what to do next]
Action: [tool_name(argument)] OR finish(final_answer)

{context}

Continue:
```

### When to Use

| Scenario | ReAct Fit |
|----------|-----------|
| Simple Q&A with lookup | Good |
| Multi-step research | Good |
| Math calculations | Good |
| Creative writing | Poor |
| Real-time conversation | Poor |

---

## 2. Plan-and-Execute

**Two-phase approach**: First create a plan, then execute each step.

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Plan-and-Execute                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 1: Planning                                           │
│  ┌──────────┐    ┌──────────────────────────────────────┐   │
│  │  Query   │───▶│  Generate step-by-step plan          │   │
│  └──────────┘    └──────────────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│                  ┌──────────────────────┐                    │
│                  │ Plan: [S1, S2, S3]   │                    │
│                  └──────────┬───────────┘                    │
│                             │                                │
│  Phase 2: Execution         │                                │
│                  ┌──────────▼───────────┐                    │
│                  │   Execute Step 1     │                    │
│                  └──────────┬───────────┘                    │
│                             │                                │
│                  ┌──────────▼───────────┐                    │
│                  │   Execute Step 2     │──▶ Replan?         │
│                  └──────────┬───────────┘                    │
│                             │                                │
│                  ┌──────────▼───────────┐                    │
│                  │   Execute Step 3     │                    │
│                  └──────────┬───────────┘                    │
│                             │                                │
│                  ┌──────────▼───────────┐                    │
│                  │    Final Answer      │                    │
│                  └──────────────────────┘                    │
└──────────────────────────────────────────────────────────────┘
```

### Pseudocode

```python
def plan_and_execute(query, tools):
    """
    Plan-and-Execute agent.

    Separates planning from execution for complex tasks.
    """
    # Phase 1: Generate plan
    plan = generate_plan(query)

    results = []

    # Phase 2: Execute each step
    for i, step in enumerate(plan.steps):
        # Execute step
        result = execute_step(step, tools, results)
        results.append(result)

        # Optional: Check if replanning needed
        if should_replan(step, result, plan):
            remaining_steps = plan.steps[i+1:]
            new_plan = replan(query, results, remaining_steps)
            plan.steps = plan.steps[:i+1] + new_plan.steps

    # Synthesize final answer
    return synthesize_answer(query, results)


def generate_plan(query):
    """Generate execution plan from query."""
    prompt = f"""
    Create a step-by-step plan to answer this question:
    {query}

    Format each step as:
    Step N: [action description]

    Keep the plan concise (3-7 steps).
    """
    response = llm.generate(prompt)
    return parse_plan(response)


def execute_step(step, tools, previous_results):
    """Execute a single step using available tools."""
    prompt = f"""
    Execute this step: {step.description}

    Previous results:
    {format_results(previous_results)}

    Available tools: {format_tools(tools)}

    Provide the result of this step.
    """
    return llm.generate(prompt)
```

### When to Use

| Task Complexity | Recommendation |
|-----------------|----------------|
| Simple (1-2 steps) | Use ReAct |
| Medium (3-5 steps) | Plan-and-Execute |
| Complex (6+ steps) | Plan-and-Execute with replanning |
| Highly dynamic | ReAct with adaptive planning |

---

## 3. Tool Use / Function Calling

**Structured tool invocation**: LLM generates structured calls that are executed externally.

### Tool Definition Schema

```json
{
  "name": "search_web",
  "description": "Search the web for current information",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query"
      },
      "num_results": {
        "type": "integer",
        "default": 5,
        "description": "Number of results to return"
      }
    },
    "required": ["query"]
  }
}
```

### Implementation Pattern

```python
class ToolRegistry:
    """Registry for agent tools."""

    def __init__(self):
        self.tools = {}

    def register(self, name, func, schema):
        """Register a tool with its schema."""
        self.tools[name] = {
            "function": func,
            "schema": schema
        }

    def get_schemas(self):
        """Get all tool schemas for LLM."""
        return [t["schema"] for t in self.tools.values()]

    def execute(self, name, arguments):
        """Execute a tool by name."""
        if name not in self.tools:
            raise ValueError(f"Unknown tool: {name}")

        func = self.tools[name]["function"]
        return func(**arguments)


def tool_use_agent(query, registry):
    """Agent with function calling."""
    messages = [{"role": "user", "content": query}]

    while True:
        # Call LLM with tools
        response = llm.chat(
            messages=messages,
            tools=registry.get_schemas(),
            tool_choice="auto"
        )

        # Check if done
        if response.finish_reason == "stop":
            return response.content

        # Execute tool calls
        if response.tool_calls:
            for call in response.tool_calls:
                result = registry.execute(
                    call.function.name,
                    json.loads(call.function.arguments)
                )
                messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": str(result)
                })
```

### Tool Design Best Practices

| Practice | Example |
|----------|---------|
| Clear descriptions | "Search web for query" not "search" |
| Type hints | Use JSON Schema types |
| Default values | Provide sensible defaults |
| Error handling | Return error messages, not exceptions |
| Idempotency | Same input = same output |

---

## 4. Multi-Agent Collaboration

### Orchestration Patterns

**Pattern 1: Sequential Pipeline**
```
Agent A → Agent B → Agent C → Output

Use case: Research → Analysis → Writing
```

**Pattern 2: Hierarchical**
```
        ┌─────────────┐
        │ Coordinator │
        └──────┬──────┘
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌───────┐ ┌───────┐ ┌───────┐
│Agent A│ │Agent B│ │Agent C│
└───────┘ └───────┘ └───────┘

Use case: Complex task decomposition
```

**Pattern 3: Debate/Consensus**
```
┌───────┐     ┌───────┐
│Agent A│◄───▶│Agent B│
└───┬───┘     └───┬───┘
    │             │
    └──────┬──────┘
           ▼
    ┌─────────────┐
    │   Arbiter   │
    └─────────────┘

Use case: Critical decisions, fact-checking
```

### Pseudocode: Hierarchical Multi-Agent

```python
class CoordinatorAgent:
    """Coordinates multiple specialized agents."""

    def __init__(self, agents):
        self.agents = agents  # Dict[str, Agent]

    def process(self, query):
        # Decompose task
        subtasks = self.decompose(query)

        # Assign to agents
        results = {}
        for subtask in subtasks:
            agent_name = self.select_agent(subtask)
            result = self.agents[agent_name].execute(subtask)
            results[subtask.id] = result

        # Synthesize
        return self.synthesize(query, results)

    def decompose(self, query):
        """Break query into subtasks."""
        prompt = f"""
        Break this task into subtasks for specialized agents:

        Task: {query}

        Available agents:
        - researcher: Gathers information
        - analyst: Analyzes data
        - writer: Produces content

        Format:
        1. [agent]: [subtask description]
        """
        response = llm.generate(prompt)
        return parse_subtasks(response)

    def select_agent(self, subtask):
        """Select best agent for subtask."""
        return subtask.assigned_agent

    def synthesize(self, query, results):
        """Combine agent results into final answer."""
        prompt = f"""
        Combine these results to answer: {query}

        Results:
        {format_results(results)}

        Provide a coherent final answer.
        """
        return llm.generate(prompt)
```

### Communication Protocols

| Protocol | Description | Use When |
|----------|-------------|----------|
| Direct | Agent calls agent | Simple pipelines |
| Message queue | Async message passing | High throughput |
| Shared state | Shared memory/database | Collaborative editing |
| Broadcast | One-to-many | Status updates |

---

## 5. Memory and State Management

### Memory Types

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Memory System                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Working Memory  │  │  Episodic Memory │                  │
│  │ (Current task)  │  │ (Past sessions)  │                  │
│  └────────┬────────┘  └────────┬─────────┘                  │
│           │                    │                            │
│           └────────┬───────────┘                            │
│                    ▼                                        │
│  ┌─────────────────────────────────────────┐               │
│  │           Semantic Memory               │               │
│  │    (Long-term knowledge, embeddings)    │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```python
class AgentMemory:
    """Memory system for conversational agents."""

    def __init__(self, embedding_model, vector_store):
        self.embedding_model = embedding_model
        self.vector_store = vector_store
        self.working_memory = []  # Current conversation
        self.buffer_size = 10     # Recent messages to keep

    def add_message(self, role, content):
        """Add message to working memory."""
        self.working_memory.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now()
        })

        # Trim if too long
        if len(self.working_memory) > self.buffer_size:
            # Summarize old messages before removing
            old_messages = self.working_memory[:5]
            summary = self.summarize(old_messages)
            self.store_long_term(summary)
            self.working_memory = self.working_memory[5:]

    def store_long_term(self, content):
        """Store in semantic memory (vector store)."""
        embedding = self.embedding_model.embed(content)
        self.vector_store.add(
            embedding=embedding,
            metadata={"content": content, "type": "summary"}
        )

    def retrieve_relevant(self, query, k=5):
        """Retrieve relevant memories for context."""
        query_embedding = self.embedding_model.embed(query)
        results = self.vector_store.search(query_embedding, k=k)
        return [r.metadata["content"] for r in results]

    def get_context(self, query):
        """Build context for LLM from memories."""
        relevant = self.retrieve_relevant(query)
        recent = self.working_memory[-self.buffer_size:]

        return {
            "relevant_memories": relevant,
            "recent_conversation": recent
        }

    def summarize(self, messages):
        """Summarize messages for long-term storage."""
        content = "\n".join([
            f"{m['role']}: {m['content']}"
            for m in messages
        ])
        prompt = f"Summarize this conversation:\n{content}"
        return llm.generate(prompt)
```

### State Persistence Patterns

| Pattern | Storage | Use Case |
|---------|---------|----------|
| In-memory | Dict/List | Single session |
| Redis | Key-value | Multi-session, fast |
| PostgreSQL | Relational | Complex queries |
| Vector DB | Embeddings | Semantic search |

---

## 6. Agent Design Patterns

### Pattern: Reflection

Agent reviews and critiques its own output.

```python
def reflective_agent(query, tools):
    """Agent that reflects on its answers."""
    # Initial response
    response = react_agent(query, tools)

    # Reflection
    critique = llm.generate(f"""
    Review this answer for:
    1. Accuracy - Is the information correct?
    2. Completeness - Does it fully answer the question?
    3. Clarity - Is it easy to understand?

    Question: {query}
    Answer: {response}

    Critique:
    """)

    # Check if revision needed
    if needs_revision(critique):
        revised = llm.generate(f"""
        Improve this answer based on the critique:

        Original: {response}
        Critique: {critique}

        Improved answer:
        """)
        return revised

    return response
```

### Pattern: Self-Ask

Break complex questions into simpler sub-questions.

```python
def self_ask_agent(query, tools):
    """Agent that asks itself follow-up questions."""
    context = []

    while True:
        prompt = f"""
        Question: {query}

        Previous Q&A:
        {format_qa(context)}

        Do you need to ask a follow-up question to answer this?
        If yes: "Follow-up: [question]"
        If no: "Final Answer: [answer]"
        """

        response = llm.generate(prompt)

        if response.startswith("Final Answer:"):
            return response.replace("Final Answer:", "").strip()

        # Answer follow-up question
        follow_up = response.replace("Follow-up:", "").strip()
        answer = simple_qa(follow_up, tools)
        context.append({"q": follow_up, "a": answer})
```

### Pattern: Expert Routing

Route queries to specialized sub-agents.

```python
class ExpertRouter:
    """Routes queries to expert agents."""

    def __init__(self):
        self.experts = {
            "code": CodeAgent(),
            "math": MathAgent(),
            "research": ResearchAgent(),
            "general": GeneralAgent()
        }

    def route(self, query):
        """Determine best expert for query."""
        prompt = f"""
        Classify this query into one category:
        - code: Programming questions
        - math: Mathematical calculations
        - research: Fact-finding, current events
        - general: Everything else

        Query: {query}
        Category:
        """
        category = llm.generate(prompt).strip().lower()
        return self.experts.get(category, self.experts["general"])

    def process(self, query):
        expert = self.route(query)
        return expert.execute(query)
```

---

## Quick Reference: Pattern Selection

| Need | Pattern |
|------|---------|
| Simple tool use | ReAct |
| Complex multi-step | Plan-and-Execute |
| API integration | Function Calling |
| Multiple perspectives | Multi-Agent Debate |
| Quality assurance | Reflection |
| Complex reasoning | Self-Ask |
| Domain expertise | Expert Routing |
| Conversation continuity | Memory System |
