# APE and OPRO Implementation Guide

This document details the implementation of Automatic Prompt Engineer (APE) and Optimization by Prompting (OPRO) algorithms for prompt improvement.

## APE: Automatic Prompt Engineer

**Source**: Zhou et al., 2022 - "Large Language Models Are Human-Level Prompt Engineers"

### Core Idea

Use LLMs to generate instruction candidates, then select the best based on evaluation.

### Algorithm

```
APE Algorithm:
1. Given: Task description T, examples E = {(x_i, y_i)}
2. Generate instruction candidates:
   - Prompt LLM: "Given these examples, what instruction would produce this output?"
   - Generate N candidates (N=20 typical)
3. Evaluate each candidate:
   - For each instruction I_j:
     - Score = accuracy on held-out examples
     - Or: Score = log_prob(y | I_j, x)
4. Select best:
   - I* = argmax_j Score(I_j)
5. Optionally refine:
   - Generate variations of I*
   - Re-evaluate and select best variation
```

### Implementation

```python
class APEOptimizer:
    """
    Automatic Prompt Engineer implementation.
    """

    def __init__(self, llm_client, num_candidates: int = 20):
        self.llm = llm_client
        self.num_candidates = num_candidates

    async def generate_candidates(
        self,
        task_description: str,
        examples: list[tuple[str, str]],
        num_candidates: int = None
    ) -> list[str]:
        """
        Generate instruction candidates from examples.
        """
        n = num_candidates or self.num_candidates

        # Format examples
        examples_text = "\n".join([
            f"Input: {x}\nOutput: {y}"
            for x, y in examples[:5]  # Use first 5 examples
        ])

        generation_prompt = f"""
        I have a task where given certain inputs, I want specific outputs.

        Here are some examples:
        {examples_text}

        Your task: Generate {n} different instructions that would cause an AI to produce these outputs from these inputs.

        Requirements:
        - Each instruction should be clear and complete
        - Instructions should be diverse (different phrasings, approaches)
        - Instructions should be concise but complete

        Generate exactly {n} instructions, one per line, numbered 1-{n}:
        """

        response = await self.llm.generate(generation_prompt)
        candidates = self._parse_numbered_list(response)

        return candidates[:n]

    async def evaluate_candidate(
        self,
        instruction: str,
        eval_examples: list[tuple[str, str]]
    ) -> float:
        """
        Evaluate an instruction on held-out examples.
        """
        correct = 0
        total = len(eval_examples)

        for x, expected_y in eval_examples:
            prompt = f"{instruction}\n\nInput: {x}\n\nOutput:"
            response = await self.llm.generate(prompt)

            # Simple exact match (could use semantic similarity)
            if self._normalize(response) == self._normalize(expected_y):
                correct += 1

        return correct / total if total > 0 else 0

    async def optimize(
        self,
        task_description: str,
        examples: list[tuple[str, str]],
        refinement_iterations: int = 3
    ) -> tuple[str, float]:
        """
        Full APE optimization pipeline.

        Returns:
            (best_instruction, best_score)
        """
        # Split examples
        train_examples = examples[:len(examples)//2]
        eval_examples = examples[len(examples)//2:]

        # Generate initial candidates
        candidates = await self.generate_candidates(
            task_description,
            train_examples
        )

        # Evaluate each
        scores = []
        for candidate in candidates:
            score = await self.evaluate_candidate(candidate, eval_examples)
            scores.append((candidate, score))

        # Sort by score
        scores.sort(key=lambda x: x[1], reverse=True)
        best_instruction, best_score = scores[0]

        # Refinement iterations
        for i in range(refinement_iterations):
            # Generate variations of best
            variations = await self._generate_variations(best_instruction)

            # Evaluate variations
            for variation in variations:
                score = await self.evaluate_candidate(variation, eval_examples)
                if score > best_score:
                    best_instruction = variation
                    best_score = score

        return best_instruction, best_score

    async def _generate_variations(
        self,
        instruction: str,
        num_variations: int = 5
    ) -> list[str]:
        """
        Generate variations of an instruction.
        """
        variation_prompt = f"""
        Generate {num_variations} variations of the following instruction.
        Keep the semantic meaning but vary the phrasing, structure, or emphasis.

        Original instruction:
        {instruction}

        Variations (numbered 1-{num_variations}):
        """

        response = await self.llm.generate(variation_prompt)
        return self._parse_numbered_list(response)

    def _parse_numbered_list(self, text: str) -> list[str]:
        """Parse numbered list from LLM output."""
        lines = text.strip().split('\n')
        items = []
        for line in lines:
            # Remove numbering (1., 1), etc.)
            cleaned = re.sub(r'^[\d]+[\.\)\:]?\s*', '', line.strip())
            if cleaned:
                items.append(cleaned)
        return items

    def _normalize(self, text: str) -> str:
        """Normalize text for comparison."""
        return text.strip().lower()
```

### APE for Prompt Improvement

```python
async def improve_prompt_ape_style(
    original_prompt: str,
    examples: list[tuple[str, str]],
    llm_client
) -> str:
    """
    Improve a prompt using APE methodology.
    """
    optimizer = APEOptimizer(llm_client)

    # Use original prompt as task description
    task_description = f"Original prompt: {original_prompt}"

    # Optimize
    best_instruction, score = await optimizer.optimize(
        task_description,
        examples,
        refinement_iterations=3
    )

    return best_instruction
```

## OPRO: Optimization by Prompting

**Source**: Yang et al., 2023 - "Large Language Models as Optimizers"

### Core Idea

Treat optimization itself as a prompting task. The LLM sees previous solutions and their scores, then generates new (hopefully better) solutions.

### Algorithm

```
OPRO Algorithm:
1. Initialize: meta_prompt = empty history
2. For i in range(max_iterations):
   a. Add instruction to meta_prompt:
      "[previous solutions + scores]
       Generate a new solution that scores higher."
   b. LLM generates new candidate solution
   c. Evaluate candidate on validation set
   d. Add (candidate, score) to history
   e. If converged: break
3. Return best solution from history
```

### Implementation

```python
class OPROOptimizer:
    """
    Optimization by Prompting implementation.
    """

    def __init__(
        self,
        llm_client,
        max_history: int = 20,
        temperature: float = 0.7
    ):
        self.llm = llm_client
        self.max_history = max_history
        self.temperature = temperature
        self.history = []

    def _build_meta_prompt(self, task_description: str) -> str:
        """
        Build the meta-prompt showing previous solutions and scores.
        """
        # Sort history by score (ascending) - show progression
        sorted_history = sorted(self.history, key=lambda x: x[1])

        # Take most recent/best entries
        recent = sorted_history[-self.max_history:]

        history_text = "\n".join([
            f"Instruction: {inst}\nScore: {score:.3f}"
            for inst, score in recent
        ])

        meta_prompt = f"""
        Your task is to generate an instruction that will achieve a high score on this task:

        {task_description}

        Here are some previous instructions and their scores (higher is better):

        {history_text}

        Based on the patterns in what works well:
        1. Analyze why high-scoring instructions perform better
        2. Identify elements that correlate with success
        3. Generate a NEW instruction that should score even higher

        Requirements:
        - The instruction should be different from previous ones
        - Build on what worked, avoid what didn't
        - Be specific and clear

        New instruction (just the instruction, nothing else):
        """

        return meta_prompt

    async def generate_candidate(self, task_description: str) -> str:
        """
        Generate a new candidate instruction based on history.
        """
        meta_prompt = self._build_meta_prompt(task_description)

        response = await self.llm.generate(
            meta_prompt,
            temperature=self.temperature
        )

        return response.strip()

    async def evaluate(
        self,
        instruction: str,
        eval_fn: callable
    ) -> float:
        """
        Evaluate an instruction using provided evaluation function.
        """
        return await eval_fn(instruction)

    async def optimize(
        self,
        task_description: str,
        eval_fn: callable,
        initial_candidates: list[str] = None,
        max_iterations: int = 20,
        convergence_threshold: float = 0.01,
        convergence_window: int = 5
    ) -> tuple[str, float, list]:
        """
        Run OPRO optimization.

        Args:
            task_description: Description of the task
            eval_fn: Async function that scores an instruction
            initial_candidates: Optional starting candidates
            max_iterations: Maximum optimization iterations
            convergence_threshold: Stop if improvement < this
            convergence_window: Check convergence over this many iterations

        Returns:
            (best_instruction, best_score, optimization_history)
        """
        # Initialize with any provided candidates
        if initial_candidates:
            for candidate in initial_candidates:
                score = await self.evaluate(candidate, eval_fn)
                self.history.append((candidate, score))

        # Track scores for convergence detection
        scores_over_time = [h[1] for h in self.history]

        for i in range(max_iterations):
            # Generate new candidate
            candidate = await self.generate_candidate(task_description)

            # Evaluate
            score = await self.evaluate(candidate, eval_fn)

            # Add to history
            self.history.append((candidate, score))
            scores_over_time.append(score)

            # Check convergence
            if len(scores_over_time) >= convergence_window:
                recent_best = max(scores_over_time[-convergence_window:])
                previous_best = max(scores_over_time[:-convergence_window])
                if recent_best - previous_best < convergence_threshold:
                    break

        # Find best
        best_instruction, best_score = max(self.history, key=lambda x: x[1])

        return best_instruction, best_score, self.history
```

### OPRO for Prompt Improvement

```python
async def improve_prompt_opro_style(
    original_prompt: str,
    eval_examples: list[tuple[str, str]],
    llm_client,
    max_iterations: int = 15
) -> tuple[str, float]:
    """
    Improve a prompt using OPRO methodology.
    """
    optimizer = OPROOptimizer(llm_client)

    # Create evaluation function
    async def eval_fn(instruction: str) -> float:
        correct = 0
        for x, expected_y in eval_examples:
            prompt = f"{instruction}\n\nInput: {x}"
            response = await llm_client.generate(prompt)
            if expected_y.lower() in response.lower():
                correct += 1
        return correct / len(eval_examples)

    # Task description
    task_description = f"""
    Original prompt: {original_prompt}

    The goal is to find an instruction that produces correct outputs for various inputs.
    The instruction should be clear, specific, and effective.
    """

    # Start with original as baseline
    initial_candidates = [original_prompt]

    # Optimize
    best, score, history = await optimizer.optimize(
        task_description=task_description,
        eval_fn=eval_fn,
        initial_candidates=initial_candidates,
        max_iterations=max_iterations
    )

    return best, score
```

## Combining APE and OPRO

### Hybrid Approach

```python
class HybridPromptOptimizer:
    """
    Combines APE (generation) with OPRO (optimization) for best results.

    1. APE generates diverse initial candidates
    2. OPRO iteratively improves using history
    """

    def __init__(self, llm_client):
        self.llm = llm_client
        self.ape = APEOptimizer(llm_client, num_candidates=10)
        self.opro = OPROOptimizer(llm_client, max_history=20)

    async def optimize(
        self,
        original_prompt: str,
        examples: list[tuple[str, str]],
        max_iterations: int = 20
    ) -> tuple[str, float, dict]:
        """
        Hybrid optimization combining APE and OPRO.
        """
        # Split examples
        train_examples = examples[:len(examples)//2]
        eval_examples = examples[len(examples)//2:]

        # Phase 1: APE generates initial candidates
        candidates = await self.ape.generate_candidates(
            f"Task: {original_prompt}",
            train_examples,
            num_candidates=10
        )

        # Add original prompt as candidate
        candidates = [original_prompt] + candidates

        # Evaluate initial candidates
        initial_scores = []
        for candidate in candidates:
            score = await self._evaluate(candidate, eval_examples)
            initial_scores.append((candidate, score))

        # Sort and take top 5 as OPRO seed
        initial_scores.sort(key=lambda x: x[1], reverse=True)
        top_candidates = [c for c, s in initial_scores[:5]]

        # Phase 2: OPRO iterative optimization
        task_description = f"""
        Task: Generate instructions for this prompt optimization task.
        Original prompt: {original_prompt}

        The instruction should make the AI produce correct outputs for various inputs.
        """

        # Initialize OPRO with APE candidates
        for candidate, score in initial_scores[:5]:
            self.opro.history.append((candidate, score))

        # OPRO iterations
        async def eval_fn(instruction):
            return await self._evaluate(instruction, eval_examples)

        best, score, history = await self.opro.optimize(
            task_description=task_description,
            eval_fn=eval_fn,
            max_iterations=max_iterations - 5  # Already did 5 in APE
        )

        return best, score, {
            'ape_candidates': len(candidates),
            'opro_iterations': len(history) - 5,
            'final_history': history
        }

    async def _evaluate(
        self,
        instruction: str,
        examples: list[tuple[str, str]]
    ) -> float:
        """Simple evaluation function."""
        correct = 0
        for x, expected_y in examples:
            prompt = f"{instruction}\n\nInput: {x}"
            response = await self.llm.generate(prompt)
            if self._matches(response, expected_y):
                correct += 1
        return correct / len(examples)

    def _matches(self, response: str, expected: str) -> bool:
        """Check if response matches expected."""
        return expected.lower().strip() in response.lower()
```

## Without LLM Calls: Pattern-Based Improvement

When you can't make LLM calls for optimization, use pattern-based rules:

```python
class PatternBasedOptimizer:
    """
    Improve prompts using known-good patterns without LLM calls.
    """

    IMPROVEMENT_PATTERNS = [
        {
            "name": "add_structure",
            "check": lambda p: not any(x in p.lower() for x in ["1.", "2.", "step", "first"]),
            "apply": lambda p: f"{p}\n\nProvide your response in this format:\n1. [First point]\n2. [Second point]\n3. [Summary]",
            "expected_improvement": 0.15
        },
        {
            "name": "add_cot",
            "check": lambda p: "step by step" not in p.lower() and "think" not in p.lower(),
            "apply": lambda p: f"{p}\n\nThink through this step by step before providing your final answer.",
            "expected_improvement": 0.20
        },
        {
            "name": "add_constraints",
            "check": lambda p: len(p) < 100,
            "apply": lambda p: f"{p}\n\nRequirements:\n- Be specific and precise\n- Support claims with evidence\n- Keep response focused",
            "expected_improvement": 0.10
        },
        {
            "name": "add_role",
            "check": lambda p: not p.lower().startswith(("you are", "as a", "act as")),
            "apply": lambda p: f"You are an expert in this domain. {p}",
            "expected_improvement": 0.05
        },
        {
            "name": "add_output_format",
            "check": lambda p: "format" not in p.lower() and "json" not in p.lower(),
            "apply": lambda p: f"{p}\n\nFormat your response as a clear, structured answer.",
            "expected_improvement": 0.10
        }
    ]

    def improve(self, prompt: str) -> tuple[str, list[str]]:
        """
        Apply applicable improvement patterns.

        Returns:
            (improved_prompt, list of applied patterns)
        """
        improved = prompt
        applied = []

        for pattern in self.IMPROVEMENT_PATTERNS:
            if pattern["check"](improved):
                improved = pattern["apply"](improved)
                applied.append(pattern["name"])

        return improved, applied

    def estimate_improvement(self, applied_patterns: list[str]) -> float:
        """
        Estimate expected improvement based on applied patterns.
        """
        total = 0
        for pattern in self.IMPROVEMENT_PATTERNS:
            if pattern["name"] in applied_patterns:
                total += pattern["expected_improvement"]
        return min(total, 0.5)  # Cap at 50% improvement
```

## Convergence and Stopping Criteria

### When to Stop Optimization

```python
def check_optimization_convergence(
    scores: list[float],
    iteration: int,
    config: dict = None
) -> tuple[bool, str]:
    """
    Check if optimization should stop.

    Config options:
    - max_iterations: Hard limit (default: 20)
    - min_iterations: Minimum before stopping (default: 5)
    - plateau_window: Iterations to check for plateau (default: 5)
    - plateau_threshold: Minimum improvement (default: 0.01)
    - target_score: Stop if reached (default: 0.95)
    """
    config = config or {}
    max_iter = config.get('max_iterations', 20)
    min_iter = config.get('min_iterations', 5)
    window = config.get('plateau_window', 5)
    threshold = config.get('plateau_threshold', 0.01)
    target = config.get('target_score', 0.95)

    # Not enough iterations
    if iteration < min_iter:
        return False, "below_minimum_iterations"

    # Max iterations reached
    if iteration >= max_iter:
        return True, "max_iterations_reached"

    # Target reached
    if scores[-1] >= target:
        return True, f"target_reached ({scores[-1]:.3f} >= {target})"

    # Plateau detection
    if len(scores) >= window:
        recent_improvement = max(scores[-window:]) - scores[-window]
        if recent_improvement < threshold:
            return True, f"plateau_detected (improvement: {recent_improvement:.4f})"

    # Decreasing performance (possible overfitting)
    if len(scores) >= 3 and all(scores[-i-1] < scores[-i-2] for i in range(2)):
        return True, "performance_decreasing"

    return False, "continue"
```

---

These implementations provide the foundation for systematic prompt optimization using research-backed algorithms.
