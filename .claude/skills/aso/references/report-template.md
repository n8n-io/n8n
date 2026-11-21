# ASO Audit Report Template

Use this structure for all ASO audit reports.

---

## Header

```
# ASO Audit: {App Name}
**Store:** {Apple App Store / Google Play}
**URL:** {listing URL}
**Audit date:** {date}
**Brand tier:** {Dominant / Established / Challenger} — {one-line justification}
**Overall Score:** {score}/100 (Grade: {A/B/C/D/F})
```

---

## Score Card

```
| Dimension | Score | Grade | Key Issue |
|-----------|-------|-------|-----------|
| Title & Subtitle | X/10 | {grade} | {one-line summary} |
| Description | X/10 | {grade} | {one-line summary} |
| Visual Assets | X/10 | {grade} | {one-line summary} |
| Ratings & Reviews | X/10 | {grade} | {one-line summary} |
| Metadata & Freshness | X/10 | {grade} | {one-line summary} |
| Conversion Signals | X/10 | {grade} | {one-line summary} |
| **OVERALL** | **{weighted}/100** | **{grade}** | |
```

Grade scale per dimension: 9-10 = A, 7-8 = B, 5-6 = C, 3-4 = D, 1-2 = F

---

## Top 3 Quick Wins

Highest-impact changes that take under 1 hour:

```
### 1. {Action verb} — {specific change}
**Impact:** {High/Medium} | **Effort:** {<15 min / <30 min / <1 hour}
**Current:** {what it is now}
**Recommended:** {exact replacement, with character count}
**Why:** {one sentence explaining the impact}

### 2. ...
### 3. ...
```

---

## Detailed Findings

### Title & Subtitle Analysis

```
**Current title:** "{title}" ({X}/30 chars used)
**Current subtitle/short desc:** "{subtitle}" ({X}/30 or /80 chars used)

**Issues found:**
- {issue 1}
- {issue 2}

**Recommended title:** "{new title}" ({X}/30 chars) — {rationale}
**Recommended subtitle:** "{new subtitle}" ({X}/30 or /80 chars) — {rationale}
```

### Description Analysis

```
**First 3 lines (above fold):**
> {quoted text}

**Issues found:**
- {issue 1}
- {issue 2}

**Keyword density (Google Play only):** {X}% — target: 2-3%
**Top keywords found:** {keyword1} (Xn), {keyword2} (Xn), ...
**Missing high-value keywords:** {keyword1}, {keyword2}, ...

**Recommended first 3 lines:**
> {rewritten text}
```

### Visual Assets Analysis

```
**Screenshots:** {count} ({store} shows first {3/all} in search)
**Preview video:** {Yes/No}
**Icon assessment:** {description}
**Feature graphic (Google Play):** {Yes/No}

**Screenshot audit:**
1. {screenshot 1 description} — {pass/issue}
2. {screenshot 2 description} — {pass/issue}
...

**Recommendations:**
- {specific visual change 1}
- {specific visual change 2}
```

### Ratings & Reviews Analysis

```
**Average rating:** {X.X} stars ({count} ratings)
**Recent review sentiment:** {Positive/Mixed/Negative}
**Common complaints:** {theme1}, {theme2}
**Developer responses:** {Yes, active / Sporadic / None}

**Recommendations:**
- {specific action 1}
- {specific action 2}
```

### Metadata & Freshness

```
**Last updated:** {date} ({X days/months ago})
**Localizations:** {count} languages
**Category:** {current category}
**In-app events/LiveOps:** {Yes/No}

**Recommendations:**
- {specific action 1}
- {specific action 2}
```

### Conversion Signals

```
**Price model:** {Free / Freemium / Paid}
**IAP count:** {count}
**Downloads (Google Play):** {range}
**Social proof visible:** {awards, press, badges — or "none"}

**Recommendations:**
- {specific action 1}
- {specific action 2}
```

---

## Keyword Suggestions

```
| Keyword | Rationale | Where to Place | Priority |
|---------|-----------|----------------|----------|
| {keyword} | {why this keyword} | {title/subtitle/description/keyword field} | {High/Med/Low} |
| ... | ... | ... | ... |
```

Note: Without paid ASO tools, exact search volume is unavailable. These
suggestions are based on category analysis, competitor metadata, and semantic
relevance. Validate with AppTweak, Sensor Tower, or MobileAction for volume data.

---

## Competitor Comparison (if applicable)

```
| Metric | {Your App} | {Competitor 1} | {Competitor 2} |
|--------|-----------|----------------|----------------|
| Title keywords | ... | ... | ... |
| Rating | ... | ... | ... |
| Screenshots | ... | ... | ... |
| Video | ... | ... | ... |
| Description keywords | ... | ... | ... |
| Last updated | ... | ... | ... |
| Overall ASO score | ... | ... | ... |
```

---

## Priority Action Plan

Ordered by impact (high to low), grouped by effort:

```
### Do This Week (Quick Wins)
1. {action} — {expected impact}
2. {action} — {expected impact}

### Do This Month (Medium Effort)
3. {action} — {expected impact}
4. {action} — {expected impact}

### Plan for Next Quarter (High Effort)
5. {action} — {expected impact}
6. {action} — {expected impact}
```

---

## Limitations

Always include this section:

> **What this audit cannot measure without paid ASO tools:**
>
> - Exact keyword search volume and difficulty scores
> - Historical keyword ranking positions
> - Download and revenue estimates
> - Apple keyword field contents (hidden from public view)
> - Install conversion rate data (only available to app owner in console)
> - A/B test results from previous experiments
>
> For these data points, consider using AppTweak ($69/mo), Sensor Tower, or
> MobileAction ($69/mo).
