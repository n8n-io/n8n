# Journey Mapping Guide

Step-by-step reference for creating user journey maps that drive design decisions.

---

## Table of Contents

- [Journey Map Fundamentals](#journey-map-fundamentals)
- [Mapping Process](#mapping-process)
- [Journey Stages](#journey-stages)
- [Touchpoint Analysis](#touchpoint-analysis)
- [Emotion Mapping](#emotion-mapping)
- [Opportunity Identification](#opportunity-identification)
- [Templates](#templates)

---

## Journey Map Fundamentals

### What Is a Journey Map?

A journey map visualizes the end-to-end experience a user has while trying to accomplish a goal with your product or service.

```
┌─────────────────────────────────────────────────────────────┐
│                    JOURNEY MAP STRUCTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STAGES:    Awareness → Consideration → Acquisition →      │
│             Onboarding → Regular Use → Advocacy            │
│                                                             │
│  LAYERS:    ┌─────────────────────────────────────────┐    │
│             │ Actions: What user does                 │    │
│             ├─────────────────────────────────────────┤    │
│             │ Touchpoints: Where interaction happens  │    │
│             ├─────────────────────────────────────────┤    │
│             │ Emotions: How user feels                │    │
│             ├─────────────────────────────────────────┤    │
│             │ Pain Points: What frustrates            │    │
│             ├─────────────────────────────────────────┤    │
│             │ Opportunities: Where to improve         │    │
│             └─────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Journey Map Types

| Type | Focus | Best For |
|------|-------|----------|
| Current State | How things are today | Identifying pain points |
| Future State | Ideal experience | Design vision |
| Day-in-the-Life | Beyond your product | Context understanding |
| Service Blueprint | Backend processes | Operations alignment |

### When to Create Journey Maps

| Scenario | Map Type | Outcome |
|----------|----------|---------|
| New product | Future state | Design direction |
| Redesign | Current + Future | Gap analysis |
| Churn investigation | Current state | Pain point diagnosis |
| Cross-team alignment | Service blueprint | Process optimization |

---

## Mapping Process

### Step 1: Define Scope

**Questions to Answer:**
- Which persona is this journey for?
- What goal are they trying to achieve?
- Where does the journey start and end?
- What timeframe does it cover?

**Scope Template:**
```
Persona: [Name from persona library]
Goal: [Specific outcome they want]
Start: [Trigger that begins journey]
End: [Success criteria or exit point]
Timeframe: [Hours/Days/Weeks]
```

**Example:**
```
Persona: Alex the Power User
Goal: Set up automated weekly reports
Start: Realizes manual reporting is unsustainable
End: First automated report runs successfully
Timeframe: 1-2 days
```

### Step 2: Gather Data

**Data Sources for Journey Mapping:**

| Source | Insights Gained |
|--------|-----------------|
| User interviews | Actions, emotions, quotes |
| Session recordings | Actual behavior patterns |
| Support tickets | Common pain points |
| Analytics | Drop-off points, time spent |
| Surveys | Satisfaction at stages |

**Interview Questions for Journey Mapping:**

1. "Walk me through how you first discovered [product]"
2. "What made you decide to try it?"
3. "Describe your first day using it"
4. "What was the hardest part?"
5. "When did you feel confident using it?"
6. "What would you change about that experience?"

### Step 3: Map the Stages

**Identify Natural Breakpoints:**

Look for moments where:
- User's mindset changes
- Channels shift (web → app → email)
- Time passes (hours, days)
- Goals evolve

**Stage Validation:**

Each stage should have:
- Clear entry criteria
- Distinct user actions
- Measurable outcomes
- Exit to next stage

### Step 4: Fill in Layers

For each stage, document:

1. **Actions**: What does the user do?
2. **Touchpoints**: Where do they interact?
3. **Thoughts**: What are they thinking?
4. **Emotions**: How do they feel?
5. **Pain Points**: What's frustrating?
6. **Opportunities**: Where can we improve?

### Step 5: Validate and Iterate

**Validation Methods:**

| Method | Effort | Confidence |
|--------|--------|------------|
| Team review | Low | Medium |
| User walkthrough | Medium | High |
| Data correlation | Medium | High |
| A/B test interventions | High | Very High |

---

## Journey Stages

### Common B2B SaaS Stages

```
┌────────────┬────────────┬────────────┬────────────┬────────────┐
│ AWARENESS  │ EVALUATION │ ONBOARDING │ ADOPTION   │ ADVOCACY   │
├────────────┼────────────┼────────────┼────────────┼────────────┤
│ Discovers  │ Compares   │ Signs up   │ Regular    │ Recommends │
│ problem    │ solutions  │ Sets up    │ usage      │ to others  │
│ exists     │            │ First win  │ Integrates │            │
└────────────┴────────────┴────────────┴────────────┴────────────┘
```

### Stage Detail Template

**Stage: Onboarding**

| Element | Description |
|---------|-------------|
| Goal | Complete setup, achieve first success |
| Duration | 1-7 days |
| Entry | User creates account |
| Exit | First meaningful action completed |
| Success Metric | Activation rate |

**Substages:**
1. Account creation
2. Profile setup
3. First feature use
4. Integration (if applicable)
5. First value moment

### B2C vs. B2B Stages

| B2C Stages | B2B Stages |
|------------|------------|
| Discover | Awareness |
| Browse | Evaluation |
| Purchase | Procurement |
| Use | Implementation |
| Return/Loyalty | Renewal |

---

## Touchpoint Analysis

### Touchpoint Categories

| Category | Examples | Owner |
|----------|----------|-------|
| Marketing | Ads, content, social | Marketing |
| Sales | Demos, calls, proposals | Sales |
| Product | App, features, UI | Product |
| Support | Help center, chat, tickets | Support |
| Transactional | Emails, notifications | Varies |

### Touchpoint Mapping Template

```
Stage: [Name]
Touchpoint: [Where interaction happens]
Channel: [Web/Mobile/Email/Phone/In-person]
Action: [What user does]
Owner: [Team responsible]
Current Experience: [1-5 rating]
Improvement Priority: [High/Medium/Low]
```

### Cross-Channel Consistency

**Check for:**
- Information consistency across channels
- Seamless handoffs (web → mobile)
- Context preservation (user doesn't repeat info)
- Brand voice alignment

**Red Flags:**
- User has to re-enter information
- Different answers from different channels
- Can't continue task on different device
- Inconsistent terminology

---

## Emotion Mapping

### Emotion Scale

```
                    POSITIVE
                       │
        Delighted  ────┤──── 😄 5
        Pleased    ────┤──── 🙂 4
        Neutral    ────┤──── 😐 3
        Frustrated ────┤──── 😕 2
        Angry      ────┤──── 😠 1
                       │
                    NEGATIVE
```

### Emotional Triggers

| Trigger | Positive Emotion | Negative Emotion |
|---------|------------------|------------------|
| Speed | Delight | Frustration |
| Clarity | Confidence | Confusion |
| Control | Empowerment | Helplessness |
| Progress | Satisfaction | Anxiety |
| Recognition | Validation | Neglect |

### Emotion Data Sources

**Direct Signals:**
- Interview quotes: "I felt so relieved when..."
- Survey scores: NPS, CSAT, CES
- Support sentiment: Angry vs. grateful tickets

**Inferred Signals:**
- Rage clicks (frustration)
- Quick completion (satisfaction)
- Abandonment (frustration or confusion)
- Return visits (interest or necessity)

### Emotion Curve Patterns

**The Valley of Death:**
```
😄 ─┐
    │     ╱
    │    ╱
😐 ─│───╱────────
    │╲ ╱
    │ ╳  ← Critical drop-off point
😠 ─│╱ ╲─────────
    │
    Onboarding  First Use  Regular
```

**The Aha Moment:**
```
😄 ─┐         ╱──
    │        ╱
    │       ╱
😐 ─│──────╱────── ← Before: neutral
    │     ↑
😠 ─│     Aha!
    │
    Stage 1  Stage 2  Stage 3
```

---

## Opportunity Identification

### Pain Point Prioritization

| Factor | Score (1-5) |
|--------|-------------|
| Frequency | How often does this occur? |
| Severity | How much does it hurt? |
| Breadth | How many users affected? |
| Solvability | Can we fix this? |

**Priority Score = (Frequency + Severity + Breadth) × Solvability**

### Opportunity Types

| Type | Description | Example |
|------|-------------|---------|
| Friction Reduction | Remove obstacles | Fewer form fields |
| Moment of Delight | Exceed expectations | Personalized welcome |
| Channel Addition | New touchpoint | Mobile app for on-the-go |
| Proactive Support | Anticipate needs | Tutorial at right moment |
| Personalization | Tailored experience | Role-based onboarding |

### Opportunity Canvas

```
┌─────────────────────────────────────────────────────────────┐
│ OPPORTUNITY: [Name]                                         │
├─────────────────────────────────────────────────────────────┤
│ Stage: [Where in journey]                                   │
│ Current Pain: [What's broken]                               │
│ Desired Outcome: [What should happen]                       │
│ Proposed Solution: [How to fix]                             │
│ Success Metric: [How to measure]                            │
│ Effort: [High/Medium/Low]                                   │
│ Impact: [High/Medium/Low]                                   │
│ Priority: [Calculated]                                      │
└─────────────────────────────────────────────────────────────┘
```

### Quick Wins vs. Strategic Bets

| Criteria | Quick Win | Strategic Bet |
|----------|-----------|---------------|
| Effort | Low | High |
| Impact | Medium | High |
| Timeline | Weeks | Quarters |
| Risk | Low | Medium-High |
| Requires | Small team | Cross-functional |

---

## Templates

### Basic Journey Map Template

```
PERSONA: _______________
GOAL: _______________

┌──────────┬──────────┬──────────┬──────────┬──────────┐
│ STAGE 1  │ STAGE 2  │ STAGE 3  │ STAGE 4  │ STAGE 5  │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ Actions  │          │          │          │          │
│          │          │          │          │          │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ Touch-   │          │          │          │          │
│ points   │          │          │          │          │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ Emotions │          │          │          │          │
│ (1-5)    │          │          │          │          │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ Pain     │          │          │          │          │
│ Points   │          │          │          │          │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ Opport-  │          │          │          │          │
│ unities  │          │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

### Detailed Stage Template

```
STAGE: _______________
DURATION: _______________
ENTRY CRITERIA: _______________
EXIT CRITERIA: _______________

USER ACTIONS:
1. _______________
2. _______________
3. _______________

TOUCHPOINTS:
• Channel: _____ | Owner: _____
• Channel: _____ | Owner: _____

THOUGHTS:
"_______________"
"_______________"

EMOTIONAL STATE: [1-5] ___

PAIN POINTS:
• _______________
• _______________

OPPORTUNITIES:
• _______________
• _______________

METRICS:
• Completion rate: ___%
• Time spent: ___
• Drop-off: ___%
```

### Service Blueprint Extension

Add backstage layers:

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTSTAGE (User sees)                                      │
├─────────────────────────────────────────────────────────────┤
│ User actions, touchpoints, emotions                         │
├─────────────────────────────────────────────────────────────┤
│ LINE OF VISIBILITY                                          │
├─────────────────────────────────────────────────────────────┤
│ BACKSTAGE (User doesn't see)                                │
├─────────────────────────────────────────────────────────────┤
│ • Employee actions                                          │
│ • Systems/tools used                                        │
│ • Data flows                                                │
├─────────────────────────────────────────────────────────────┤
│ SUPPORT PROCESSES                                           │
├─────────────────────────────────────────────────────────────┤
│ • Backend systems                                           │
│ • Third-party integrations                                  │
│ • Policies/procedures                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### Journey Mapping Checklist

**Preparation:**
- [ ] Persona selected
- [ ] Goal defined
- [ ] Scope bounded
- [ ] Data gathered (interviews, analytics)

**Mapping:**
- [ ] Stages identified
- [ ] Actions documented
- [ ] Touchpoints mapped
- [ ] Emotions captured
- [ ] Pain points identified

**Analysis:**
- [ ] Opportunities prioritized
- [ ] Quick wins identified
- [ ] Strategic bets proposed
- [ ] Metrics defined

**Validation:**
- [ ] Team reviewed
- [ ] User validated
- [ ] Data correlated

### Common Mistakes

| Mistake | Impact | Fix |
|---------|--------|-----|
| Too many stages | Overwhelming | Limit to 5-7 |
| No data | Assumptions | Interview users |
| Single session | Bias | Multiple sources |
| No emotions | Misses human element | Add feeling layer |
| No follow-through | Wasted effort | Create action plan |

---

*See also: `persona-methodology.md` for persona creation*
