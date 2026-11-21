# Agent Designer - Multi-Agent System Architecture Toolkit

**Tier:** POWERFUL  
**Category:** Engineering  
**Tags:** AI agents, architecture, system design, orchestration, multi-agent systems

A comprehensive toolkit for designing, architecting, and evaluating multi-agent systems. Provides structured approaches to agent architecture patterns, tool design principles, communication strategies, and performance evaluation frameworks.

## Overview

The Agent Designer skill includes three core components:

1. **Agent Planner** (`agent_planner.py`) - Designs multi-agent system architectures
2. **Tool Schema Generator** (`tool_schema_generator.py`) - Creates structured tool schemas
3. **Agent Evaluator** (`agent_evaluator.py`) - Evaluates system performance and identifies optimizations

## Quick Start

### 1. Design a Multi-Agent Architecture

```bash
# Use sample requirements or create your own
python agent_planner.py assets/sample_system_requirements.json -o my_architecture

# This generates:
# - my_architecture.json (complete architecture)
# - my_architecture_diagram.mmd (Mermaid diagram)
# - my_architecture_roadmap.json (implementation plan)
```

### 2. Generate Tool Schemas

```bash
# Use sample tool descriptions or create your own
python tool_schema_generator.py assets/sample_tool_descriptions.json -o my_tools

# This generates:
# - my_tools.json (complete schemas)
# - my_tools_openai.json (OpenAI format)
# - my_tools_anthropic.json (Anthropic format)
# - my_tools_validation.json (validation rules)
# - my_tools_examples.json (usage examples)
```

### 3. Evaluate System Performance

```bash
# Use sample execution logs or your own
python agent_evaluator.py assets/sample_execution_logs.json -o evaluation

# This generates:
# - evaluation.json (complete report)
# - evaluation_summary.json (executive summary)
# - evaluation_recommendations.json (optimization suggestions)
# - evaluation_errors.json (error analysis)
```

## Detailed Usage

### Agent Planner

The Agent Planner designs multi-agent architectures based on system requirements.

#### Input Format

Create a JSON file with system requirements:

```json
{
  "goal": "Your system's primary objective",
  "description": "Detailed system description",
  "tasks": ["List", "of", "required", "tasks"],
  "constraints": {
    "max_response_time": 30000,
    "budget_per_task": 1.0,
    "quality_threshold": 0.9
  },
  "team_size": 6,
  "performance_requirements": {
    "high_throughput": true,
    "fault_tolerance": true,
    "low_latency": false
  },
  "safety_requirements": [
    "Input validation and sanitization",
    "Output content filtering"
  ]
}
```

#### Command Line Options

```bash
python agent_planner.py <input_file> [OPTIONS]

Options:
  -o, --output PREFIX    Output file prefix (default: agent_architecture)
  --format FORMAT        Output format: json, both (default: both)
```

#### Output Files

- **Architecture JSON**: Complete system design with agents, communication topology, and scaling strategy
- **Mermaid Diagram**: Visual representation of the agent architecture
- **Implementation Roadmap**: Phased implementation plan with timelines and risks

#### Architecture Patterns

The planner automatically selects from these patterns based on requirements:

- **Single Agent**: Simple, focused tasks (1 agent)
- **Supervisor**: Hierarchical delegation (2-8 agents)
- **Swarm**: Peer-to-peer collaboration (3-20 agents)
- **Hierarchical**: Multi-level management (5-50 agents)
- **Pipeline**: Sequential processing (3-15 agents)

### Tool Schema Generator

Generates structured tool schemas compatible with OpenAI and Anthropic formats.

#### Input Format

Create a JSON file with tool descriptions:

```json
{
  "tools": [
    {
      "name": "tool_name",
      "purpose": "What the tool does",
      "category": "Tool category (search, data, api, etc.)",
      "inputs": [
        {
          "name": "parameter_name",
          "type": "string",
          "description": "Parameter description",
          "required": true,
          "examples": ["example1", "example2"]
        }
      ],
      "outputs": [
        {
          "name": "result_field",
          "type": "object",
          "description": "Output description"
        }
      ],
      "error_conditions": ["List of possible errors"],
      "side_effects": ["List of side effects"],
      "idempotent": true,
      "rate_limits": {
        "requests_per_minute": 60
      }
    }
  ]
}
```

#### Command Line Options

```bash
python tool_schema_generator.py <input_file> [OPTIONS]

Options:
  -o, --output PREFIX    Output file prefix (default: tool_schemas)
  --format FORMAT        Output format: json, both (default: both)
  --validate             Validate generated schemas
```

#### Output Files

- **Complete Schemas**: All schemas with validation and examples
- **OpenAI Format**: Schemas compatible with OpenAI function calling
- **Anthropic Format**: Schemas compatible with Anthropic tool use
- **Validation Rules**: Input validation specifications
- **Usage Examples**: Example calls and responses

#### Schema Features

- **Input Validation**: Comprehensive parameter validation rules
- **Error Handling**: Structured error response formats
- **Rate Limiting**: Configurable rate limit specifications
- **Documentation**: Auto-generated usage examples
- **Security**: Built-in security considerations

### Agent Evaluator

Analyzes agent execution logs to identify performance issues and optimization opportunities.

#### Input Format

Create a JSON file with execution logs:

```json
{
  "execution_logs": [
    {
      "task_id": "unique_task_identifier",
      "agent_id": "agent_identifier", 
      "task_type": "task_category",
      "start_time": "2024-01-15T09:00:00Z",
      "end_time": "2024-01-15T09:02:34Z",
      "duration_ms": 154000,
      "status": "success",
      "actions": [
        {
          "type": "tool_call",
          "tool_name": "web_search",
          "duration_ms": 2300,
          "success": true
        }
      ],
      "results": {
        "summary": "Task results",
        "quality_score": 0.92
      },
      "tokens_used": {
        "input_tokens": 1250,
        "output_tokens": 2800,
        "total_tokens": 4050
      },
      "cost_usd": 0.081,
      "error_details": null,
      "tools_used": ["web_search"],
      "retry_count": 0
    }
  ]
}
```

#### Command Line Options

```bash
python agent_evaluator.py <input_file> [OPTIONS]

Options:
  -o, --output PREFIX    Output file prefix (default: evaluation_report)
  --format FORMAT        Output format: json, both (default: both)
  --detailed             Include detailed analysis in output
```

#### Output Files

- **Complete Report**: Comprehensive performance analysis
- **Executive Summary**: High-level metrics and health assessment
- **Optimization Recommendations**: Prioritized improvement suggestions
- **Error Analysis**: Detailed error patterns and solutions

#### Evaluation Metrics

**Performance Metrics**:
- Task success rate and completion times
- Token usage and cost efficiency
- Error rates and retry patterns
- Throughput and latency distributions

**System Health**:
- Overall health score (poor/fair/good/excellent)
- SLA compliance tracking
- Resource utilization analysis
- Trend identification

**Bottleneck Analysis**:
- Agent performance bottlenecks
- Tool usage inefficiencies  
- Communication overhead
- Resource constraints

## Architecture Patterns Guide

### When to Use Each Pattern

#### Single Agent
- **Best for**: Simple, focused tasks with clear boundaries
- **Team size**: 1 agent
- **Complexity**: Low
- **Examples**: Personal assistant, document summarizer, simple automation

#### Supervisor
- **Best for**: Hierarchical task decomposition with quality control
- **Team size**: 2-8 agents  
- **Complexity**: Medium
- **Examples**: Research coordinator with specialists, content review workflow

#### Swarm
- **Best for**: Distributed problem solving with high fault tolerance
- **Team size**: 3-20 agents
- **Complexity**: High
- **Examples**: Parallel data processing, distributed research, competitive analysis

#### Hierarchical  
- **Best for**: Large-scale operations with organizational structure
- **Team size**: 5-50 agents
- **Complexity**: Very High
- **Examples**: Enterprise workflows, complex business processes

#### Pipeline
- **Best for**: Sequential processing with specialized stages
- **Team size**: 3-15 agents
- **Complexity**: Medium
- **Examples**: Data ETL pipelines, content processing workflows

## Best Practices

### System Design

1. **Start Simple**: Begin with simpler patterns and evolve
2. **Clear Responsibilities**: Define distinct roles for each agent
3. **Robust Communication**: Design reliable message passing
4. **Error Handling**: Plan for failures and recovery
5. **Monitor Everything**: Implement comprehensive observability

### Tool Design

1. **Single Responsibility**: Each tool should have one clear purpose
2. **Input Validation**: Validate all inputs thoroughly
3. **Idempotency**: Design operations to be safely repeatable
4. **Error Recovery**: Provide clear error messages and recovery paths
5. **Documentation**: Include comprehensive usage examples

### Performance Optimization

1. **Measure First**: Use the evaluator to identify actual bottlenecks
2. **Optimize Bottlenecks**: Focus on highest-impact improvements
3. **Cache Strategically**: Cache expensive operations and results
4. **Parallel Processing**: Identify opportunities for parallelization
5. **Resource Management**: Monitor and optimize resource usage

## Sample Files

The `assets/` directory contains sample files to help you get started:

- **`sample_system_requirements.json`**: Example system requirements for a research platform
- **`sample_tool_descriptions.json`**: Example tool descriptions for common operations
- **`sample_execution_logs.json`**: Example execution logs from a running system

The `expected_outputs/` directory shows expected results from processing these samples.

## References

See the `references/` directory for detailed documentation:

- **`agent_architecture_patterns.md`**: Comprehensive catalog of architecture patterns
- **`tool_design_best_practices.md`**: Best practices for tool design and implementation
- **`evaluation_methodology.md`**: Detailed methodology for system evaluation

## Integration Examples

### With OpenAI

```python
import json
import openai

# Load generated OpenAI schemas
with open('my_tools_openai.json') as f:
    schemas = json.load(f)

# Use with OpenAI function calling
response = openai.ChatCompletion.create(
    model=OPENAI_MODEL,  # from config; don't hardcode a model ID
    messages=[{"role": "user", "content": "Search for AI news"}],
    functions=schemas['functions']
)
```

### With Anthropic Claude

```python
import json
import anthropic

# Load generated Anthropic schemas
with open('my_tools_anthropic.json') as f:
    schemas = json.load(f)

# Use with Anthropic tool use
client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-opus-5",
    messages=[{"role": "user", "content": "Search for AI news"}],
    tools=schemas['tools']
)
```

## Troubleshooting

### Common Issues

**"No valid architecture pattern found"**
- Check that team_size is reasonable (1-50)
- Ensure tasks list is not empty
- Verify performance_requirements are valid

**"Tool schema validation failed"**
- Check that all required fields are present
- Ensure parameter types are valid
- Verify enum values are provided as arrays

**"Insufficient execution logs"**
- Ensure logs contain required fields (task_id, agent_id, status)
- Check that timestamps are in ISO 8601 format
- Verify token usage fields are numeric

### Performance Tips

1. **Large Systems**: For systems with >20 agents, consider breaking into subsystems
2. **Complex Tools**: Tools with >10 parameters may need simplification
3. **Log Volume**: For >1000 log entries, consider sampling for faster analysis

## Contributing

This skill is part of the claude-skills repository. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

## License

This project is licensed under the MIT License - see the main repository for details.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the reference documentation in `references/`
- Create an issue in the claude-skills repository