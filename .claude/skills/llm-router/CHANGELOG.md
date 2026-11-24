# Changelog: llm-router

## v1.0.0 (2026-02-05)

### Created
- Routing decision tree (task type → model tier)
- Tier assignment table (13 task types mapped to 3 tiers with costs)
- Three routing strategies: static tier, cascading try-cheap-first, adaptive from history
- Provider selection matrix
- Cost impact analysis (76-92% savings demonstrated)
- 4 anti-patterns (always-best, always-cheapest, ignoring latency, no feedback loop)
- Based on research: Martian Model Mapping, Unify.ai neural scoring, RouteLLM preference-data routing
