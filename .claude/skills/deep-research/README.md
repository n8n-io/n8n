# Gemini Deep Research Skill

Execute autonomous multi-step research tasks using Google's Gemini Deep Research Agent. Unlike standard LLM queries that respond in seconds, Deep Research is an "analyst-in-a-box" that plans, searches, reads, and synthesizes information into comprehensive, cited reports.

## Overview

The Deep Research Agent (`deep-research-pro-preview-12-2025`) powered by Gemini 3 Pro:

- **Plans** research strategy based on your query
- **Searches** the web and analyzes sources
- **Reads** and extracts relevant information
- **Iterates** through multiple search/read cycles
- **Outputs** detailed, cited reports

This process takes 2-10 minutes but produces thorough analysis that would take a human researcher hours.

## Installation

```bash
# Navigate to skill directory
cd skills/deep-research

# Install dependencies
pip install -r requirements.txt

# Set up API key
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API key"
3. Create a new key or use an existing one
4. Copy the key to your `.env` file

## Quick Start

```bash
# Basic research query
python3 scripts/research.py --query "Research the competitive landscape of cloud providers in 2024"

# Stream progress in real-time
python3 scripts/research.py --query "Compare React, Vue, and Angular frameworks" --stream

# Get structured JSON output
python3 scripts/research.py --query "Analyze the EV market" --json
```

## Commands

### `--query` / `-q`

Start a new research task.

```bash
# Basic query
python3 scripts/research.py -q "Research the history of containerization"

# With output format specification
python3 scripts/research.py -q "Compare database solutions" \
  --format "1. Executive Summary\n2. Comparison Table\n3. Pros/Cons\n4. Recommendations"

# Start without waiting for results
python3 scripts/research.py -q "Research topic" --no-wait
```

### `--stream`

Stream research progress in real-time. Shows thinking steps and builds the report as it's generated.

```bash
python3 scripts/research.py -q "Analyze market trends" --stream
```

### `--status` / `-s`

Check the status of a running research task.

```bash
python3 scripts/research.py --status abc123xyz
```

### `--wait` / `-w`

Wait for a specific research task to complete.

```bash
python3 scripts/research.py --wait abc123xyz
```

### `--continue`

Continue a conversation from previous research. Useful for follow-up questions.

```bash
# First, run initial research
python3 scripts/research.py -q "Research Kubernetes architecture"
# Output: Interaction ID: abc123xyz

# Then ask follow-up
python3 scripts/research.py -q "Elaborate on the networking section" --continue abc123xyz
```

### `--list` / `-l`

List recent research tasks from local history.

```bash
python3 scripts/research.py --list
python3 scripts/research.py --list --limit 20
```

## Output Options

| Flag | Description |
|------|-------------|
| (default) | Human-readable markdown report |
| `--json` / `-j` | Structured JSON output |
| `--raw` / `-r` | Raw API response |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | (required) | Your Google Gemini API key |
| `DEEP_RESEARCH_TIMEOUT` | `600` | Max wait time in seconds |
| `DEEP_RESEARCH_POLL_INTERVAL` | `10` | Seconds between status polls |
| `DEEP_RESEARCH_CACHE_DIR` | `~/.cache/deep-research` | Local history cache directory |

### .env File

```bash
GEMINI_API_KEY=your-api-key-here
DEEP_RESEARCH_TIMEOUT=600
DEEP_RESEARCH_POLL_INTERVAL=10
```

## Cost & Performance

### Estimated Costs

Deep Research uses a pay-as-you-go model based on token usage:

| Task Type | Search Queries | Input Tokens | Output Tokens | Estimated Cost |
|-----------|---------------|--------------|---------------|----------------|
| Standard | ~80 | ~250k (50-70% cached) | ~60k | $2-3 |
| Complex | ~160 | ~900k (50-70% cached) | ~80k | $3-5 |

### Time Expectations

- **Simple queries**: 2-5 minutes
- **Complex analysis**: 5-10 minutes
- **Maximum**: 60 minutes (API limit)

## Use Cases

### Market Analysis
```bash
python3 scripts/research.py -q "Analyze the competitive landscape of \
  EV battery manufacturers, including market share, technology, and supply chain"
```

### Technical Research
```bash
python3 scripts/research.py -q "Compare Rust vs Go for building \
  high-performance backend services" \
  --format "1. Performance Benchmarks\n2. Memory Safety\n3. Ecosystem\n4. Learning Curve"
```

### Due Diligence
```bash
python3 scripts/research.py -q "Research Company XYZ: recent news, \
  financial performance, leadership changes, and market position"
```

### Literature Review
```bash
python3 scripts/research.py -q "Review recent developments in \
  large language model efficiency and optimization techniques"
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `GEMINI_API_KEY not set` | Missing API key | Set in `.env` or environment |
| `API error 429` | Rate limited | Wait and retry |
| `Research timed out` | Task took too long | Simplify query or increase timeout |
| `Failed to parse result` | Unexpected response | Use `--raw` to see actual output |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (API, config, timeout) |
| 130 | Cancelled by user (Ctrl+C) |

## Architecture

```
┌─────────────────┐      ┌──────────────────────┐
│   CLI Script    │──────│  DeepResearchClient  │
│  (research.py)  │      │                      │
└─────────────────┘      └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Gemini Deep        │
                         │   Research API       │
                         │                      │
                         │  POST /interactions  │
                         │  GET  /interactions  │
                         └──────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   HistoryManager     │
                         │  (~/.cache/deep-     │
                         │   research/)         │
                         └──────────────────────┘
```

## Safety & Privacy

- **Read-only**: This skill only reads/researches; no file modifications
- **No secrets in queries**: Avoid including sensitive data in research queries
- **Source verification**: Always verify citations in the output
- **Cost awareness**: Each task costs $2-5; be mindful of usage

## Limitations

- **No custom tools**: Cannot use MCP or function calling
- **No structured output enforcement**: JSON formatting relies on prompt engineering
- **Web-only research**: Cannot access private/authenticated sources
- **60-minute max**: Very complex tasks may time out

## References

- [Gemini Deep Research Documentation](https://ai.google.dev/gemini-api/docs/deep-research)
- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
