# Keyword Research Guide

Systematic approach to discovering, evaluating, and selecting keywords for app store optimization.

---

## Table of Contents

- [Keyword Research Methodology](#keyword-research-methodology)
- [Keyword Evaluation Framework](#keyword-evaluation-framework)
- [Competitor Keyword Analysis](#competitor-keyword-analysis)
- [Keyword Mapping Strategy](#keyword-mapping-strategy)
- [Keyword Tracking and Iteration](#keyword-tracking-and-iteration)

---

## Keyword Research Methodology

### Phase 1: Seed Keyword Generation

Start by generating initial keyword ideas from multiple sources.

**Source 1: Core App Functions**

List every action or problem the app solves:

```
Example for a task management app:
- Create tasks
- Set reminders
- Track deadlines
- Organize projects
- Collaborate with team
- Plan daily schedule
```

**Source 2: User Language Mapping**

Match developer terminology to user searches:

| Developer Term | User Search Terms |
|----------------|-------------------|
| Task management | todo list, task app, tasks |
| Project organization | project planner, project tracker |
| Deadline tracking | due date reminder, deadline app |
| Time blocking | schedule planner, calendar app |
| GTD methodology | getting things done, productivity system |

**Source 3: App Store Autocomplete**

Type seed keywords into App Store/Play Store search and record suggestions:

```
"todo" → todo list, todo app, todo list app, todolist widget
"task" → task manager, task planner, task list, tasks to do
"remind" → reminder app, reminder, reminders widget, remind me
```

**Source 4: Competitor Analysis**

Extract keywords from top 10 competitors in category (detailed in section below).

### Phase 2: Keyword Expansion

**Expansion Techniques:**

| Technique | Example (seed: "todo") |
|-----------|------------------------|
| Add modifiers | free todo, best todo, simple todo |
| Add actions | make todo list, create todo, organize todo |
| Add platforms | todo app iphone, todo for mac, todo widget |
| Add audiences | todo for students, business todo, family todo |
| Add features | todo with reminders, todo calendar, todo sync |
| Add problems | forgot tasks todo, procrastination todo |

**Keyword Matrix Template:**

| Core Term | Modifier 1 | Modifier 2 | Full Keyword |
|-----------|------------|------------|--------------|
| todo | free | app | free todo app |
| todo | best | iphone | best todo iphone |
| task | manager | simple | simple task manager |
| reminder | daily | widget | daily reminder widget |
| planner | weekly | calendar | weekly planner calendar |

### Phase 3: Keyword Filtering

Remove irrelevant or low-quality keywords:

**Exclusion Criteria:**

| Criterion | Reason | Example |
|-----------|--------|---------|
| Competitor brand names | Policy violation | "todoist alternative" |
| Unrelated categories | Low conversion | "todo games" |
| Plural duplicates (iOS) | Wasted space | "tasks" when "task" exists |
| Single characters | No search value | "to do" vs "todo" |

---

## Keyword Evaluation Framework

### Keyword Scoring Model

Evaluate each keyword on four dimensions:

**1. Search Volume (0-100)**

| Volume Level | Score | Monthly Searches |
|--------------|-------|------------------|
| Very High | 80-100 | 50,000+ |
| High | 60-79 | 10,000-49,999 |
| Medium | 40-59 | 1,000-9,999 |
| Low | 20-39 | 100-999 |
| Very Low | 0-19 | <100 |

**2. Competition (0-100, inverted)**

| Competition | Score | Top 10 App Ratings |
|-------------|-------|-------------------|
| Very Low | 80-100 | Average <4.0 stars |
| Low | 60-79 | Average 4.0-4.2 stars |
| Medium | 40-59 | Average 4.3-4.5 stars |
| High | 20-39 | Average 4.6-4.8 stars |
| Very High | 0-19 | Average 4.9+ stars |

**3. Relevance (0-100)**

| Relevance | Score | Criteria |
|-----------|-------|----------|
| Exact Match | 90-100 | Keyword describes core function |
| Strong Match | 70-89 | Keyword describes major feature |
| Moderate Match | 50-69 | Keyword describes secondary feature |
| Weak Match | 30-49 | Keyword tangentially related |
| No Match | 0-29 | Keyword unrelated to app |

**4. Conversion Potential (0-100)**

| Intent | Score | User Query Type |
|--------|-------|-----------------|
| Transactional | 80-100 | "best [app type]", "[app type] app" |
| Commercial | 60-79 | "free [app type]", "[app type] for [use]" |
| Informational | 40-59 | "how to [action]", "what is [concept]" |
| Navigational | 20-39 | "[brand name]", "[specific app]" |

### Composite Score Calculation

```
Keyword Score = (Volume × 0.25) + (Competition × 0.25) +
                (Relevance × 0.35) + (Conversion × 0.15)
```

**Score Interpretation:**

| Score Range | Priority | Action |
|-------------|----------|--------|
| 80-100 | Primary | Target in title and keyword field |
| 60-79 | Secondary | Include in subtitle/description |
| 40-59 | Tertiary | Use in long description only |
| 0-39 | Deprioritize | Do not target |

### Keyword Evaluation Worksheet

```
KEYWORD EVALUATION

Keyword: "task manager app"
Date: [Date]

SCORES:
├── Search Volume: 72/100 (High - ~25,000/month)
├── Competition: 45/100 (Medium - 4.4 avg rating in top 10)
├── Relevance: 95/100 (Exact match to core function)
└── Conversion: 85/100 (Transactional intent)

COMPOSITE SCORE: 74.5/100

RECOMMENDATION: Secondary Priority
- Include in subtitle or short description
- Not competitive enough for title (dominated by Todoist, Any.do)
- Consider long-tail variant: "simple task manager app"
```

---

## Competitor Keyword Analysis

### Competitor Identification

**Step 1: Direct Competitors**
Apps solving the same problem for the same audience.

**Step 2: Indirect Competitors**
Apps solving related problems or targeting overlapping audiences.

**Step 3: Category Leaders**
Top 10-20 apps by downloads in primary category.

### Competitor Keyword Extraction

**From App Title:**
```
Competitor: "Todoist: To-Do List & Tasks"
Keywords: todoist, to-do list, tasks, to do
```

**From Subtitle (iOS):**
```
Competitor subtitle: "Task Manager & Planner"
Keywords: task manager, planner
```

**From Description (First 100 words):**
Identify frequently used terms:
```
"Todoist is the world's favorite task manager and to-do list app.
Organize work and life, hit your goals, and find productivity..."

Extracted: task manager, to-do list, organize, goals, productivity
```

### Competitor Keyword Matrix

| Keyword | Comp 1 | Comp 2 | Comp 3 | Comp 4 | Comp 5 | Coverage |
|---------|--------|--------|--------|--------|--------|----------|
| task manager | ✓ | ✓ | ✓ | ✓ | ✓ | 100% |
| to-do list | ✓ | ✓ | ✓ | ✓ | | 80% |
| planner | ✓ | ✓ | | ✓ | ✓ | 80% |
| reminder | ✓ | ✓ | ✓ | | | 60% |
| productivity | ✓ | | ✓ | ✓ | | 60% |
| checklist | | ✓ | | ✓ | ✓ | 60% |
| project | ✓ | ✓ | | | | 40% |
| habit | | | ✓ | | ✓ | 40% |

**Analysis:**
- 100% coverage = Highly competitive, essential keyword
- 60-80% coverage = Important category term
- 40% coverage = Potential differentiator
- <40% coverage = Unique opportunity or irrelevant

### Keyword Gap Analysis

Identify keywords competitors miss:

```
KEYWORD GAP ANALYSIS

Underserved Keywords (Low competitor coverage, decent volume):
1. "daily planner widget" - 2/10 competitors, 5,000 searches
2. "task list for teams" - 3/10 competitors, 3,500 searches
3. "todo with calendar sync" - 1/10 competitors, 2,800 searches

Opportunity Assessment:
- "daily planner widget" → Add widget feature, target keyword
- "task list for teams" → Already have feature, update metadata
- "todo with calendar sync" → Feature gap, add to roadmap
```

---

## Keyword Mapping Strategy

### Keyword Placement Map

Assign each keyword to specific metadata locations:

```
KEYWORD PLACEMENT MAP

PRIMARY (Title + Keyword Field):
├── task manager (Score: 82)
├── todo list (Score: 78)
└── planner (Score: 75)

SECONDARY (Subtitle + Short Description):
├── reminder app (Score: 68)
├── daily tasks (Score: 65)
└── organize (Score: 62)

TERTIARY (Full Description):
├── checklist (Score: 55)
├── productivity (Score: 52)
├── schedule (Score: 48)
├── deadline (Score: 45)
└── project management (Score: 42)
```

### iOS Keyword Field Strategy

**100 Character Optimization:**

```
STEP 1: List all target keywords
task,manager,todo,list,planner,reminder,organize,daily,checklist,
productivity,schedule,deadline,project,goals,habit,widget,sync,
team,collaborate,notes,calendar

STEP 2: Remove duplicates from title
Title: "TaskFlow - Todo List Manager"
Remove: task, todo, list, manager

STEP 3: Remove plurals
Keep: reminder (not reminders)
Keep: goal (not goals)

STEP 4: Prioritize by score and fit
Final 100 chars:
planner,reminder,organize,daily,checklist,productivity,schedule,
deadline,project,goals,habit,widget,sync,team,collaborate

Character count: 98/100
```

### Android Description Keyword Integration

**Natural keyword placement in 4,000 characters:**

```
PARAGRAPH 1 (Hook - 300 chars):
Keywords: task manager, todo list, organize
"TaskFlow is the task manager trusted by 2 million users. Create
your perfect todo list and organize everything that matters..."

PARAGRAPH 2 (Features - 800 chars):
Keywords: reminder, checklist, deadline, project
"Set smart reminders that notify you at the right time. Build
checklists for any project. Never miss a deadline with..."

PARAGRAPH 3 (Benefits - 600 chars):
Keywords: productivity, schedule, goals
"Boost your productivity with proven planning methods. Schedule
your day in minutes. Track goals and celebrate..."

PARAGRAPH 4 (Differentiators - 500 chars):
Keywords: widget, sync, team, collaborate
"Beautiful widgets keep tasks visible. Sync across all devices
instantly. Invite your team to collaborate on..."

Total keyword coverage: 14 keywords naturally integrated
```

---

## Keyword Tracking and Iteration

### Ranking Tracking Cadence

| Frequency | Action |
|-----------|--------|
| Daily | Track top 5-10 primary keywords |
| Weekly | Full keyword set review |
| Monthly | Competitor keyword comparison |
| Quarterly | Full keyword research refresh |

### Keyword Performance Metrics

| Metric | Target | Action if Below |
|--------|--------|-----------------|
| Top 10 ranking | 3+ keywords | Increase keyword weight |
| Top 50 ranking | 10+ keywords | Maintain current strategy |
| Ranking velocity | Improving trend | Continue optimization |
| Conversion rate | >5% | Review relevance alignment |

### Iteration Process

**Monthly Keyword Audit:**

```
1. EXPORT current rankings
   - List all tracked keywords
   - Record current position
   - Note 30-day trend (up/down/stable)

2. IDENTIFY opportunities
   - Keywords improving but not top 10
   - Keywords declining from previous position
   - New high-volume keywords in category

3. PRIORITIZE changes
   - Boost: Keywords at position 11-20
   - Maintain: Keywords at position 1-10
   - Replace: Keywords at position 50+ with no improvement

4. IMPLEMENT updates
   - Adjust keyword field (iOS)
   - Update description (Android)
   - Modify subtitle if needed

5. DOCUMENT changes
   - Record what changed and why
   - Set reminder for 2-week check-in
```

### Keyword Testing Log Template

```
KEYWORD TEST LOG

Test ID: KW-2025-001
Date Started: [Date]
Keywords Changed:
  - Added: "habit tracker" (replacing "goals app")
  - Added: "daily routine" (replacing "schedule planner")

Rationale:
- "habit tracker" has 3x volume of "goals app"
- "daily routine" trending up 40% in category

Baseline Rankings:
- "habit tracker": Not ranked
- "daily routine": Position 87

30-Day Results:
- "habit tracker": Position 34 (+53)
- "daily routine": Position 28 (+59)

Conclusion: Test successful - retain new keywords
Next Action: Target subtitle position for "habit tracker"
```
