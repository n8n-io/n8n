# A/B Test Analysis

**Test Name:** [Descriptive test name]
**Test ID:** [Internal tracking ID]
**Date:** [Start Date] - [End Date]
**Status:** [Planning / Running / Complete / Inconclusive]

---

## Hypothesis

**If** [we change X],
**then** [Y will happen],
**because** [rationale based on data or insight].

---

## Test Design

| Parameter | Detail |
|-----------|--------|
| **Variable Tested** | [What is being changed] |
| **Control (A)** | [Description of control variant] |
| **Variant (B)** | [Description of test variant] |
| **Primary Metric** | [The main metric being measured] |
| **Secondary Metrics** | [Additional metrics to monitor] |
| **Traffic Split** | [50/50, 70/30, etc.] |
| **Minimum Sample Size** | [Required sample per variant for statistical significance] |
| **Minimum Detectable Effect** | [Smallest meaningful difference, e.g., 5% lift] |
| **Confidence Level** | [95% or 99%] |
| **Expected Duration** | [X days/weeks based on traffic and sample size] |

---

## Targeting

| Criterion | Value |
|-----------|-------|
| **Audience** | [Who sees the test] |
| **Channel** | [Where the test runs] |
| **Device** | [All / Desktop / Mobile] |
| **Geography** | [Regions included] |
| **Exclusions** | [Who is excluded and why] |

---

## Results

### Primary Metric: [Metric Name]

| Variant | Sample Size | Conversions | Rate | Lift vs Control |
|---------|------------|-------------|------|----------------|
| Control (A) | | | % | - |
| Variant (B) | | | % | % |

**Statistical Significance:** [Yes/No] at [X]% confidence
**P-value:** [X.XXX]

### Secondary Metrics

| Metric | Control (A) | Variant (B) | Lift | Significant? |
|--------|------------|-------------|------|-------------|
| [Metric 1] | | | % | [Yes/No] |
| [Metric 2] | | | % | [Yes/No] |
| [Metric 3] | | | % | [Yes/No] |

---

## Segment Analysis

| Segment | Control Rate | Variant Rate | Lift | Notes |
|---------|-------------|-------------|------|-------|
| Desktop | % | % | % | |
| Mobile | % | % | % | |
| New Visitors | % | % | % | |
| Returning Visitors | % | % | % | |
| [Custom Segment] | % | % | % | |

---

## Revenue Impact Estimate

| Metric | Value |
|--------|-------|
| **Projected Annual Lift** | [X]% |
| **Projected Additional Revenue** | $[X] |
| **Projected Additional Conversions** | [X] |
| **Confidence in Estimate** | [High/Medium/Low] |

---

## Decision

**Winner:** [Control / Variant / Inconclusive]

**Rationale:** [Why this decision was made, citing specific metrics and statistical significance]

**Implementation Plan:**
- [ ] [Step 1: e.g., Roll out variant to 100% of traffic]
- [ ] [Step 2: e.g., Update creative assets across campaigns]
- [ ] [Step 3: e.g., Monitor for X days post-implementation]
- [ ] [Step 4: e.g., Document learnings in knowledge base]

---

## Learnings

**What we learned:**
1. [Key learning 1]
2. [Key learning 2]
3. [Key learning 3]

**Follow-up tests to consider:**
1. [Next test idea based on results]
2. [Next test idea based on results]

---

## Quality Checks

- [ ] Sample size reached minimum threshold
- [ ] Test ran for at least 1 full business cycle (7 days minimum)
- [ ] No external factors (holidays, outages, promotions) affected results
- [ ] Segments were balanced between variants
- [ ] No sample ratio mismatch (SRM) detected
- [ ] Results reviewed by at least 2 team members

---

*Template from campaign-analytics skill. Statistical significance calculations require external tools (e.g., online calculators or scipy).*
