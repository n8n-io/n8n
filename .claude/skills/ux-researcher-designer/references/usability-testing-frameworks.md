# Usability Testing Frameworks

Reference for planning and conducting usability tests that produce actionable insights.

---

## Table of Contents

- [Testing Methods Overview](#testing-methods-overview)
- [Test Planning](#test-planning)
- [Task Design](#task-design)
- [Moderation Techniques](#moderation-techniques)
- [Analysis Framework](#analysis-framework)
- [Reporting Template](#reporting-template)

---

## Testing Methods Overview

### Method Selection Matrix

| Method | When to Use | Participants | Time | Output |
|--------|-------------|--------------|------|--------|
| Moderated remote | Deep insights, complex flows | 5-8 | 45-60 min | Rich qualitative |
| Unmoderated remote | Quick validation, simple tasks | 10-20 | 15-20 min | Quantitative + video |
| In-person | Physical products, context matters | 5-10 | 60-90 min | Very rich qualitative |
| Guerrilla | Quick feedback, public spaces | 3-5 | 5-10 min | Rapid insights |
| A/B testing | Comparing two designs | 100+ | Varies | Statistical data |

### Participant Count Guidelines

```
┌─────────────────────────────────────────────────────────────┐
│                    FINDING USABILITY ISSUES                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  % Issues Found                                             │
│  100% ┤                          ●────●────●                │
│   90% ┤                    ●─────                           │
│   80% ┤              ●─────                                 │
│   75% ┤         ●────                 ← 5 users: 75-80%     │
│   50% ┤    ●────                                            │
│   25% ┤ ●──                                                 │
│    0% ┼────┬────┬────┬────┬────┬────                       │
│        1    2    3    4    5    6+   Users                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Nielsen's Rule:** 5 users find ~75-80% of usability issues

| Goal | Participants | Reasoning |
|------|--------------|-----------|
| Find major issues | 5 | 80% coverage, diminishing returns |
| Validate fix | 3 | Confirm specific issue resolved |
| Compare designs | 8-10 per design | Need comparison data |
| Quantitative metrics | 20+ | Statistical significance |

---

## Test Planning

### Research Questions

Transform vague goals into testable questions:

| Vague Goal | Testable Question |
|------------|-------------------|
| "Is it easy to use?" | "Can users complete checkout in under 3 minutes?" |
| "Do users like it?" | "Will users choose Design A or B for this task?" |
| "Does it make sense?" | "Can users find the settings without hints?" |

### Test Plan Template

```
PROJECT: _______________
DATE: _______________
RESEARCHER: _______________

RESEARCH QUESTIONS:
1. _______________
2. _______________
3. _______________

PARTICIPANTS:
• Target: [Persona or user type]
• Count: [Number]
• Recruitment: [Source]
• Incentive: [Amount/type]

METHOD:
• Type: [Moderated/Unmoderated/Remote/In-person]
• Duration: [Minutes per session]
• Environment: [Tool/Location]

TASKS:
1. [Task description + success criteria]
2. [Task description + success criteria]
3. [Task description + success criteria]

METRICS:
• Completion rate (target: __%)
• Time on task (target: __ min)
• Error rate (target: __%)
• Satisfaction (target: __/5)

SCHEDULE:
• Pilot: [Date]
• Sessions: [Date range]
• Analysis: [Date]
• Report: [Date]
```

### Pilot Testing

**Always pilot before real sessions:**

- Run 1-2 test sessions with team members
- Check task clarity and timing
- Test recording/screen sharing
- Adjust based on pilot feedback

**Pilot Checklist:**
- [ ] Tasks understood without clarification
- [ ] Session fits in time slot
- [ ] Recording captures screen + audio
- [ ] Post-test questions make sense

---

## Task Design

### Good vs. Bad Tasks

| Bad Task | Why Bad | Good Task |
|----------|---------|-----------|
| "Find the settings" | Leading | "Change your notification preferences" |
| "Use the dashboard" | Vague | "Find how many sales you made last month" |
| "Click the blue button" | Prescriptive | "Submit your order" |
| "Do you like this?" | Opinion-based | "Rate how easy it was (1-5)" |

### Task Construction Formula

```
SCENARIO + GOAL + SUCCESS CRITERIA

Scenario: Context that makes task realistic
Goal: What user needs to accomplish
Success: How we know they succeeded

Example:
"Imagine you're planning a trip to Paris next month. [SCENARIO]
Book a hotel for 3 nights in your budget. [GOAL]
You've succeeded when you see the confirmation page. [SUCCESS]"
```

### Task Types

| Type | Purpose | Example |
|------|---------|---------|
| Exploration | First impressions | "Look around and tell me what you think this does" |
| Specific | Core functionality | "Add item to cart and checkout" |
| Comparison | Design validation | "Which of these two menus would you use to..." |
| Stress | Edge cases | "What would you do if your payment failed?" |

### Task Difficulty Progression

Start easy, increase difficulty:

```
Task 1: Warm-up (easy, builds confidence)
Task 2: Core flow (main functionality)
Task 3: Secondary flow (important but less common)
Task 4: Edge case (stress test)
Task 5: Free exploration (open-ended)
```

---

## Moderation Techniques

### The Think-Aloud Protocol

**Instruction Script:**
"As you work through the tasks, please think out loud. Tell me what you're looking at, what you're thinking, and what you're trying to do. There are no wrong answers - we're testing the design, not you."

**Prompts When Silent:**
- "What are you thinking right now?"
- "What do you expect to happen?"
- "What are you looking for?"
- "Tell me more about that"

### Handling Common Situations

| Situation | What to Say |
|-----------|-------------|
| User asks for help | "What would you do if I weren't here?" |
| User is stuck | "What are your options?" (wait 30 sec before hint) |
| User apologizes | "You're doing great. We're testing the design." |
| User goes off-task | "That's interesting. Let's come back to [task]." |
| User criticizes | "Tell me more about that." (neutral, don't defend) |

### Non-Leading Question Techniques

| Leading (Don't) | Neutral (Do) |
|-----------------|--------------|
| "Did you find that confusing?" | "How was that experience?" |
| "The search is over here" | "What do you think you should do?" |
| "Don't you think X is easier?" | "Which do you prefer and why?" |
| "Did you notice the tooltip?" | "What happened there?" |

### Post-Task Questions

After each task:
1. "How difficult was that?" (1-5 scale)
2. "What, if anything, was confusing?"
3. "What would you improve?"

After all tasks:
1. "What stood out to you?"
2. "What was the best/worst part?"
3. "Would you use this? Why/why not?"

---

## Analysis Framework

### Severity Rating Scale

| Severity | Definition | Criteria |
|----------|------------|----------|
| 4 - Critical | Prevents task completion | User cannot proceed |
| 3 - Major | Significant difficulty | User struggles, considers giving up |
| 2 - Minor | Causes hesitation | User recovers independently |
| 1 - Cosmetic | Noticed but not problematic | User comments but unaffected |

### Issue Documentation Template

```
ISSUE ID: ___
SEVERITY: [1-4]
FREQUENCY: [X/Y participants]

TASK: [Which task]
TIMESTAMP: [When in session]

OBSERVATION:
[What happened - factual description]

USER QUOTE:
"[Direct quote if available]"

HYPOTHESIS:
[Why this might be happening]

RECOMMENDATION:
[Proposed solution]

AFFECTED PERSONA:
[Which user types]
```

### Pattern Recognition

**Quantitative Signals:**
- Task completion rate < 80%
- Time on task > 2x expected
- Error rate > 20%
- Satisfaction < 3/5

**Qualitative Signals:**
- Same confusion point across 3+ users
- Repeated verbal frustration
- Workaround attempts
- Feature requests during task

### Analysis Matrix

```
┌─────────────────┬───────────┬───────────┬───────────┐
│ Issue           │ Frequency │ Severity  │ Priority  │
├─────────────────┼───────────┼───────────┼───────────┤
│ Can't find X    │ 4/5       │ Critical  │ HIGH      │
│ Confusing label │ 3/5       │ Major     │ HIGH      │
│ Slow loading    │ 2/5       │ Minor     │ MEDIUM    │
│ Typo in text    │ 1/5       │ Cosmetic  │ LOW       │
└─────────────────┴───────────┴───────────┴───────────┘

Priority = Frequency × Severity
```

---

## Reporting Template

### Executive Summary

```
USABILITY TEST REPORT
[Project Name] | [Date]

OVERVIEW
• Participants: [N] users matching [persona]
• Method: [Type of test]
• Tasks: [N] tasks covering [scope]

KEY FINDINGS
1. [Most critical issue + impact]
2. [Second issue]
3. [Third issue]

SUCCESS METRICS
• Completion rate: [X]% (target: Y%)
• Avg. time on task: [X] min (target: Y min)
• Satisfaction: [X]/5 (target: Y/5)

TOP RECOMMENDATIONS
1. [Highest priority fix]
2. [Second priority]
3. [Third priority]
```

### Detailed Findings Section

```
FINDING 1: [Title]

Severity: [Critical/Major/Minor/Cosmetic]
Frequency: [X/Y participants]
Affected Tasks: [List]

What Happened:
[Description of the problem]

Evidence:
• P1: "[Quote]"
• P3: "[Quote]"
• [Video timestamp if available]

Impact:
[How this affects users and business]

Recommendation:
[Proposed solution with rationale]

Design Mockup:
[Optional: before/after if applicable]
```

### Metrics Dashboard

```
TASK PERFORMANCE SUMMARY

Task 1: [Name]
├─ Completion: ████████░░ 80%
├─ Avg. Time: 2:15 (target: 2:00)
├─ Errors: 1.2 avg
└─ Satisfaction: ★★★★☆ 4.2/5

Task 2: [Name]
├─ Completion: ██████░░░░ 60% ⚠️
├─ Avg. Time: 4:30 (target: 3:00) ⚠️
├─ Errors: 3.1 avg ⚠️
└─ Satisfaction: ★★★☆☆ 3.1/5

[Continue for all tasks]
```

---

## Quick Reference

### Session Checklist

**Before Session:**
- [ ] Test plan finalized
- [ ] Tasks written and piloted
- [ ] Recording set up and tested
- [ ] Consent form ready
- [ ] Prototype/product accessible
- [ ] Note-taking template ready

**During Session:**
- [ ] Consent obtained
- [ ] Think-aloud explained
- [ ] Recording started
- [ ] Tasks presented one at a time
- [ ] Post-task ratings collected
- [ ] Debrief questions asked
- [ ] Thanks and incentive

**After Session:**
- [ ] Notes organized
- [ ] Recording saved
- [ ] Initial impressions captured
- [ ] Issues logged

### Common Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Completion rate | Successful / Total × 100 | >80% |
| Time on task | Average seconds | <2x expected |
| Error rate | Errors / Attempts × 100 | <15% |
| Task-level satisfaction | Average rating | >4/5 |
| SUS score | Standard formula | >68 |
| NPS | Promoters - Detractors | >0 |

---

*See also: `journey-mapping-guide.md` for contextual research*
