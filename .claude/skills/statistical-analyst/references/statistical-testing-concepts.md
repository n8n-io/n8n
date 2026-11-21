# Statistical Testing Concepts Reference

Deep-dive reference for the Statistical Analyst skill. Keeps SKILL.md lean while preserving the theory.

---

## The Frequentist Framework

All tests in this skill operate in the **frequentist framework**: we define a null hypothesis (H₀) and an alternative (H₁), then ask "how often would we see data this extreme if H₀ were true?"

- **H₀ (null):** No difference exists between control and treatment
- **H₁ (alternative):** A difference exists (two-tailed)
- **p-value:** P(observing this result or more extreme | H₀ is true)
- **α (significance level):** The threshold we set in advance. Reject H₀ if p < α.

### The p-value misconception
A p-value of 0.03 does **not** mean "there is a 97% chance the effect is real."
It means: "If there were no effect, we would see data this extreme only 3% of the time."

---

## Type I and Type II Errors

| | H₀ True | H₀ False |
|---|---|---|
| Reject H₀ | **Type I Error (α)** — False Positive | Correct (Power = 1−β) |
| Fail to reject H₀ | Correct | **Type II Error (β)** — False Negative |

- **α** (false positive rate): Typically 0.05. Reduce it when false positives are costly (medical trials, irreversible changes).
- **β** (false negative rate): Typically 0.20 (power = 80%). Reduce it when missing real effects is costly.

---

## Two-Proportion Z-Test

**When:** Comparing two binary conversion rates (e.g. clicked/not, signed up/not).

**Assumptions:**
- Independent samples
- n×p ≥ 5 and n×(1−p) ≥ 5 for both groups (normal approximation valid)
- No interference between units (SUTVA)

**Formula:**
```
z = (p̂₂ − p̂₁) / √[p̄(1−p̄)(1/n₁ + 1/n₂)]

where p̄ = (x₁ + x₂) / (n₁ + n₂)  (pooled proportion)
```

**Effect size — Cohen's h:**
```
h = 2 arcsin(√p₂) − 2 arcsin(√p₁)
```
The arcsine transformation stabilizes variance across different baseline rates.

---

## Welch's Two-Sample t-Test

**When:** Comparing means of a continuous metric between two groups (revenue, latency, session length).

**Why Welch's (not Student's):**
Welch's t-test does not assume equal variances — it is strictly more general and loses little power when variances are equal. Always prefer it.

**Formula:**
```
t = (x̄₂ − x̄₁) / √(s₁²/n₁ + s₂²/n₂)

Welch–Satterthwaite df:
df = (s₁²/n₁ + s₂²/n₂)² / [(s₁²/n₁)²/(n₁−1) + (s₂²/n₂)²/(n₂−1)]
```

**Effect size — Cohen's d:**
```
d = (x̄₂ − x̄₁) / s_pooled

s_pooled = √[((n₁−1)s₁² + (n₂−1)s₂²) / (n₁+n₂−2)]
```

**Warning for heavy-tailed metrics (revenue, LTV):**
Mean tests are sensitive to outliers. If the distribution has heavy tails, consider:
1. Winsorizing at 99th percentile before testing
2. Log-transforming (if values are positive)
3. Using a non-parametric test (Mann-Whitney U) and flagging for human review

---

## Chi-Square Test

**When:** Comparing categorical distributions (e.g. which plan users selected, which error type occurred).

**Assumptions:**
- Expected count ≥ 5 per cell (otherwise, combine categories or use Fisher's exact)
- Independent observations

**Formula:**
```
χ² = Σ (Oᵢ − Eᵢ)² / Eᵢ

df = k − 1  (goodness-of-fit)
df = (r−1)(c−1)  (contingency table, r rows, c columns)
```

**Effect size — Cramér's V:**
```
V = √[χ² / (n × (min(r,c) − 1))]
```

---

## Wilson Score Interval

The standard confidence interval formula for proportions (`p̂ ± z√(p̂(1−p̂)/n)`) can produce impossible values (< 0 or > 1) for small n or extreme p. The Wilson score interval fixes this:

```
center = (p̂ + z²/2n) / (1 + z²/n)
margin = z/(1+z²/n) × √(p̂(1−p̂)/n + z²/4n²)
CI = [center − margin, center + margin]
```

Always use Wilson (or Clopper-Pearson) for proportions. The normal approximation is a historical artifact.

---

## Sample Size & Power

**Power:** The probability of correctly detecting a real effect of size δ.

```
n = (z_α/2 + z_β)² × (σ₁² + σ₂²) / δ²    [means]
n = (z_α/2 + z_β)² × (p₁(1−p₁) + p₂(1−p₂)) / (p₂−p₁)²    [proportions]
```

**Key levers:**
- Increase n → more power (or detect smaller effects)
- Increase MDE → smaller n (but you might miss smaller real effects)
- Increase α → smaller n (but more false positives)
- Increase power → larger n

**The peeking problem:**
Checking results before the planned end date inflates your effective α. If you peek at 50%, 75%, and 100% of planned n, your true α is ~0.13 instead of 0.05 — a 2.6× inflation of false positives.

**Solutions:**
- Pre-commit to a stopping rule and don't peek
- Use sequential testing (SPRT) if early stopping is required
- Use a Bonferroni-corrected α if you peek at scheduled intervals

---

## Multiple Comparisons

Testing k hypotheses at α = 0.05 gives P(at least one false positive) ≈ 1 − (1 − 0.05)^k

| k tests | P(≥1 false positive) |
|---|---|
| 1 | 5% |
| 3 | 14% |
| 5 | 23% |
| 10 | 40% |
| 20 | 64% |

**Corrections:**
- **Bonferroni:** Use α/k per test. Conservative but simple. Appropriate for independent tests.
- **Benjamini-Hochberg (FDR):** Controls false discovery rate, not family-wise error. Preferred when many tests are expected to be true positives.

---

## SUTVA (Stable Unit Treatment Value Assumption)

A critical assumption for valid A/B tests: the outcome of unit i depends only on its own treatment assignment, not on other units' assignments.

**Violations:**
- Social features (user A sees user B's activity — network spillover)
- Shared inventory (one variant depletes shared stock)
- Two-sided marketplaces (buyers and sellers interact)

**Solutions:**
- Cluster randomization (randomize at the group/geography level)
- Network A/B testing (graph-based splits)
- Holdout-based testing

---

## References

- Imbens, G. & Rubin, D. (2015). *Causal Inference for Statistics, Social, and Biomedical Sciences*. Cambridge.
- Kohavi, R., Tang, D., & Xu, Y. (2020). *Trustworthy Online Controlled Experiments*. Cambridge.
- Cohen, J. (1988). *Statistical Power Analysis for the Behavioral Sciences*. 2nd ed.
- Wilson, E.B. (1927). "Probable Inference, the Law of Succession, and Statistical Inference." *JASA* 22(158): 209–212.
