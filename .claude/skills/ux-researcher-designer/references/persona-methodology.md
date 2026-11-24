# Persona Methodology Guide

Reference for creating research-backed, data-driven user personas.

---

## Table of Contents

- [What Makes a Valid Persona](#what-makes-a-valid-persona)
- [Data Collection Methods](#data-collection-methods)
- [Analysis Framework](#analysis-framework)
- [Persona Components](#persona-components)
- [Validation Criteria](#validation-criteria)
- [Anti-Patterns](#anti-patterns)

---

## What Makes a Valid Persona

### Research-Backed vs. Assumption-Based

```
┌─────────────────────────────────────────────────────────────┐
│                    PERSONA VALIDITY SPECTRUM                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ASSUMPTION-BASED          HYBRID          RESEARCH-BACKED  │
│  │───────────────────────────────────────────────────────│  │
│  ❌ Invalid               ⚠️ Limited         ✅ Valid        │
│                                                             │
│  • "Our users are..."    • Some interviews   • 20+ users    │
│  • No data               • 5-10 data points  • Quant + Qual │
│  • Team opinions         • Partial patterns  • Validated    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Minimum Viability Requirements

| Requirement | Threshold | Confidence Level |
|-------------|-----------|------------------|
| Sample size | 5 users | Low (exploratory) |
| Sample size | 20 users | Medium (directional) |
| Sample size | 50+ users | High (reliable) |
| Data types | 2+ sources | Required |
| Interview depth | 30+ min | Recommended |
| Behavioral data | 1 week+ | Recommended |

### The Persona Validity Test

A valid persona must pass these checks:

1. **Grounded in Data**
   - Can you point to specific user quotes?
   - Can you show behavioral data supporting claims?
   - Are demographics from actual user profiles?

2. **Represents a Segment**
   - Does this persona represent 15%+ of your user base?
   - Are there other users who fit this pattern?
   - Is it a real cluster, not an outlier?

3. **Actionable for Design**
   - Can designers make decisions from this persona?
   - Does it reveal unmet needs?
   - Does it clarify feature priorities?

---

## Data Collection Methods

### Quantitative Sources

| Source | Data Type | Use For |
|--------|-----------|---------|
| Analytics | Behavior | Usage patterns, feature adoption |
| Surveys | Demographics, preferences | Segmentation, satisfaction |
| Support tickets | Pain points | Frustration patterns |
| Product logs | Actions | Feature usage, workflows |
| CRM data | Profile | Job roles, company size |

### Qualitative Sources

| Source | Data Type | Use For |
|--------|-----------|---------|
| User interviews | Motivations, goals | Deep understanding |
| Contextual inquiry | Environment | Real-world context |
| Diary studies | Longitudinal | Behavior over time |
| Usability tests | Pain points | Specific frustrations |
| Customer calls | Quotes | Authentic voice |

### Data Collection Matrix

```
                    QUICK              DEEP
                    (1-2 weeks)        (4+ weeks)
                    │                  │
          ┌─────────┼──────────────────┼─────────┐
  QUANT   │ Survey  │                  │ Product │
          │ + CRM   │                  │ Logs +  │
          │         │                  │ A/B     │
          ├─────────┼──────────────────┼─────────┤
  QUAL    │ 5       │                  │ 15+     │
          │ Quick   │                  │ Deep    │
          │ Calls   │                  │ Inter-  │
          │         │                  │ views   │
          └─────────┴──────────────────┴─────────┘
```

### Interview Protocol

**Pre-Interview:**
- Review user's analytics data
- Note usage patterns to explore
- Prepare open-ended questions

**Interview Structure (45-60 min):**

1. **Context (10 min)**
   - "Walk me through your typical day"
   - "When do you use [product]?"
   - "What were you doing before you found us?"

2. **Behaviors (15 min)**
   - "Show me how you use [feature]"
   - "What do you do when [scenario]?"
   - "What's your workaround for [pain point]?"

3. **Goals & Frustrations (15 min)**
   - "What are you ultimately trying to achieve?"
   - "What's the hardest part about [task]?"
   - "If you had a magic wand, what would you change?"

4. **Reflection (10 min)**
   - "What would make you recommend us?"
   - "What almost made you quit?"
   - "What's missing that you need?"

---

## Analysis Framework

### Pattern Identification

**Step 1: Code Data Points**

Tag each insight with:
- `[GOAL]` - What they want to achieve
- `[PAIN]` - What frustrates them
- `[BEHAVIOR]` - What they actually do
- `[CONTEXT]` - When/where they use product
- `[QUOTE]` - Direct user words

**Step 2: Cluster Similar Patterns**

```
User A: Uses daily, advanced features, keyboard shortcuts
User B: Uses daily, complex workflows, automation
User C: Uses weekly, basic needs, occasional
User D: Uses daily, power features, API access

Cluster 1: A, B, D (Power Users - daily, advanced)
Cluster 2: C (Casual User - weekly, basic)
```

**Step 3: Calculate Cluster Size**

| Cluster | Users | % of Sample | Viability |
|---------|-------|-------------|-----------|
| Power Users | 18 | 36% | Primary persona |
| Business Users | 15 | 30% | Primary persona |
| Casual Users | 12 | 24% | Secondary persona |
| Mobile-First | 5 | 10% | Consider merging |

### Archetype Classification

| Archetype | Identifying Signals | Design Focus |
|-----------|--------------------| -------------|
| Power User | Daily use, 10+ features, shortcuts | Efficiency, customization |
| Casual User | Weekly use, 3-5 features, simple | Simplicity, guidance |
| Business User | Work context, team features, ROI | Collaboration, reporting |
| Mobile-First | Mobile primary, quick actions | Touch, offline, speed |

### Confidence Scoring

Calculate confidence based on data quality:

```
Confidence = (Sample Size Score + Data Quality Score + Consistency Score) / 3

Sample Size Score:
  5-10 users  = 1 (Low)
  11-30 users = 2 (Medium)
  31+ users   = 3 (High)

Data Quality Score:
  Survey only         = 1 (Low)
  Survey + Analytics  = 2 (Medium)
  Quant + Qual + Logs = 3 (High)

Consistency Score:
  Contradicting data = 1 (Low)
  Some alignment     = 2 (Medium)
  Strong alignment   = 3 (High)
```

---

## Persona Components

### Required Elements

| Component | Description | Source |
|-----------|-------------|--------|
| Name & Photo | Memorable identifier | Stock photo, AI-generated |
| Tagline | One-line summary | Synthesized from data |
| Quote | Authentic voice | Direct from interviews |
| Demographics | Age, role, location | CRM, surveys |
| Goals | What they want | Interviews |
| Frustrations | Pain points | Interviews, support |
| Behaviors | How they act | Analytics, observation |
| Scenarios | Usage contexts | Interviews, logs |

### Optional Enhancements

| Component | When to Include |
|-----------|-----------------|
| Day-in-the-life | Complex workflows |
| Empathy map | Design workshops |
| Technology stack | B2B products |
| Influences | Consumer products |
| Brands they love | Marketing-heavy |

### Component Depth Guide

**Demographics (Keep Brief):**
```
❌ Too detailed:
   Age: 34, Lives: Seattle, Education: MBA from Stanford

✅ Right level:
   Age: 30-40, Urban professional, Graduate degree
```

**Goals (Be Specific):**
```
❌ Too vague:
   "Wants to be productive"

✅ Actionable:
   "Needs to process 50+ items daily without repetitive tasks"
```

**Frustrations (Include Evidence):**
```
❌ Generic:
   "Finds the interface confusing"

✅ With evidence:
   "Can't find export function (mentioned by 8/12 users)"
```

---

## Validation Criteria

### Internal Validation

**Team Check:**
- [ ] Does sales recognize this user type?
- [ ] Does support see these pain points?
- [ ] Does product know these workflows?

**Data Check:**
- [ ] Can we quantify this segment's size?
- [ ] Do behaviors match analytics?
- [ ] Are quotes from real users?

### External Validation

**User Validation (recommended):**
- Show persona to 3-5 users from segment
- Ask: "Does this sound like you?"
- Iterate based on feedback

**A/B Design Test:**
- Design for persona A vs. persona B
- Test with actual users
- Measure if persona-driven design wins

### Red Flags

Watch for these persona validity problems:

| Red Flag | What It Means | Fix |
|----------|---------------|-----|
| "Everyone" persona | Too broad to be useful | Split into segments |
| Contradicting data | Forcing a narrative | Re-analyze clusters |
| No frustrations | Sanitized or incomplete | Dig deeper in interviews |
| Assumptions labeled as data | No real research | Conduct actual research |
| Single data source | Fragile foundation | Add another data type |

---

## Anti-Patterns

### 1. The Elastic Persona

**Problem:** Persona stretches to include everyone

```
❌ "Sarah is 25-55, uses mobile and desktop, wants simplicity
    but also advanced features, works alone and in teams..."
```

**Fix:** Create separate personas for distinct segments

### 2. The Demographic Persona

**Problem:** All demographics, no psychographics

```
❌ "John is 35, male, $80k income, urban, MBA..."
   (Nothing about goals, frustrations, behaviors)
```

**Fix:** Lead with goals and frustrations, add minimal demographics

### 3. The Ideal User Persona

**Problem:** Describes who you want, not who you have

```
❌ "Emma is a passionate advocate who tells everyone
    about our product and uses every feature daily..."
```

**Fix:** Base on real user data, include realistic limitations

### 4. The Committee Persona

**Problem:** Each stakeholder added their opinions

```
❌ CEO added "enterprise-focused"
   Sales added "loves demos"
   Support added "never calls support"
```

**Fix:** Single owner, data-driven only

### 5. The Stale Persona

**Problem:** Created once, never updated

```
❌ "Last updated: 2019"
   Product has changed completely since then
```

**Fix:** Review quarterly, update with new data

---

## Quick Reference

### Persona Creation Checklist

- [ ] Minimum 20 users in data set
- [ ] At least 2 data sources (quant + qual)
- [ ] Clear segment boundaries
- [ ] Actionable for design decisions
- [ ] Validated with team and users
- [ ] Documented data sources
- [ ] Confidence level stated

### Time Investment Guide

| Persona Type | Time | Team | Output |
|--------------|------|------|--------|
| Quick & Dirty | 1 week | 1 | Directional |
| Standard | 2-4 weeks | 2 | Production |
| Comprehensive | 6-8 weeks | 3+ | Strategic |

---

*See also: `example-personas.md` for output examples*
