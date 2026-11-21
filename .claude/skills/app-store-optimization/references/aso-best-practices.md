# ASO Best Practices Reference

Optimization strategies for improving app store visibility, conversion, and rankings.

---

## Table of Contents

- [Keyword Optimization](#keyword-optimization)
- [Metadata Optimization](#metadata-optimization)
- [Visual Asset Optimization](#visual-asset-optimization)
- [Rating and Review Management](#rating-and-review-management)
- [Launch Strategy](#launch-strategy)
- [A/B Testing Framework](#ab-testing-framework)
- [Conversion Optimization](#conversion-optimization)
- [Common Mistakes to Avoid](#common-mistakes-to-avoid)

---

## Keyword Optimization

### Keyword Research Process

1. **Brainstorm seed keywords** - Core terms users search for
2. **Expand with variations** - Synonyms, related terms, long-tail
3. **Analyze competition** - Check difficulty scores
4. **Evaluate search volume** - Prioritize high-volume terms
5. **Test and iterate** - Monitor rankings and adjust

### Keyword Selection Criteria

| Factor | Weight | Evaluation Method |
|--------|--------|-------------------|
| Relevance | 40% | Does it describe app function? |
| Search Volume | 30% | Monthly search estimates |
| Competition | 20% | Number of ranking apps |
| Conversion Potential | 10% | User intent alignment |

### Keyword Placement Priority

| Location | Search Weight | Example |
|----------|---------------|---------|
| App Title | Highest | "TaskMaster - Todo List Manager" |
| Subtitle (iOS) | High | "Organize Your Daily Tasks" |
| Keyword Field (iOS) | High | "planner,reminder,checklist" |
| Short Description (Android) | High | "Simple task manager for busy professionals" |
| Full Description | Medium | Natural keyword usage throughout |

### Long-Tail Keyword Strategy

Long-tail keywords have lower volume but higher conversion:

| Type | Example | Volume | Competition | Conversion |
|------|---------|--------|-------------|------------|
| Short-tail | "todo app" | High | High | Low |
| Mid-tail | "daily task manager" | Medium | Medium | Medium |
| Long-tail | "free todo list with reminders" | Low | Low | High |

**Formula for keyword priority:**
```
Score = (Volume × 0.3) + (1/Competition × 0.3) + (Relevance × 0.4)
```

---

## Metadata Optimization

### Title Optimization

**Structure Formula:**
```
[Brand Name] - [Primary Keyword] [Secondary Keyword/Benefit]
```

**Examples by category:**

| Category | Before | After |
|----------|--------|-------|
| Productivity | "MyTasks" | "MyTasks - Todo List & Planner" |
| Fitness | "FitTrack" | "FitTrack: Workout & Gym Log" |
| Finance | "MoneyApp" | "MoneyApp - Budget Tracker" |
| Photo | "SnapEdit" | "SnapEdit: Photo Editor & AI" |

**Title Optimization Checklist:**
- [ ] Primary keyword within first 3 words
- [ ] Brand name is memorable and unique
- [ ] Character count matches platform limit
- [ ] No keyword stuffing
- [ ] Readable and natural sounding

### Description Optimization

**Full Description Structure:**

```
PARAGRAPH 1: Hook + Primary Benefit (50-100 words)
- Address user pain point
- State main value proposition
- Include primary keyword naturally

PARAGRAPH 2-3: Feature Highlights (100-150 words)
- Top 3-5 features with benefits
- Use bullet points or emojis for scanability
- Include secondary keywords

PARAGRAPH 4: Social Proof (50-75 words)
- Download numbers or ratings
- Press mentions or awards
- User testimonials (summarized)

PARAGRAPH 5: Call to Action (25-50 words)
- Clear next step
- Urgency or incentive
- Reassurance (free trial, no credit card)
```

**Keyword Density Target:**
- Primary keyword: 2-3% (8-12 mentions in 4000 chars)
- Secondary keywords: 1-2% each (4-8 mentions each)

### Subtitle Optimization (iOS)

**Effective Subtitle Formulas:**

| Formula | Example |
|---------|---------|
| [Verb] + [Benefit] | "Organize Your Life" |
| [Adjective] + [Category] | "Smart Task Manager" |
| [Feature] + [Feature] | "Lists, Reminders & Notes" |
| [Audience] + [Solution] | "For Busy Professionals" |

---

## Visual Asset Optimization

### App Icon Best Practices

| Principle | Do | Don't |
|-----------|-----|-------|
| Simplicity | Single focal element | Multiple competing elements |
| Recognizability | Works at 60x60px | Requires large size to read |
| Uniqueness | Distinct from competitors | Generic category icon |
| Color | Bold, contrasting colors | Muted or similar to background |
| Text | None or single letter | Full words or app name |

**Icon Testing Questions:**
1. Is it recognizable at 29x29px (smallest iOS size)?
2. Does it stand out in search results?
3. Does it communicate app function?
4. Is it distinct from top 10 category competitors?

### Screenshot Optimization

**Screenshot Hierarchy:**

| Position | Purpose | Content Strategy |
|----------|---------|------------------|
| Screenshot 1 | Hook/Hero | Main value proposition + key UI |
| Screenshot 2 | Primary Feature | Most-used feature demonstration |
| Screenshot 3 | Secondary Feature | Differentiating capability |
| Screenshot 4 | Social Proof | Ratings, awards, user count |
| Screenshot 5+ | Additional Features | Supporting functionality |

**Caption Best Practices:**
- Maximum 5-7 words per caption
- Action-oriented verbs ("Track", "Organize", "Discover")
- Benefit-focused, not feature-focused
- Consistent typography and style

**Example Caption Evolution:**

| Weak | Better | Best |
|------|--------|------|
| "Task List Feature" | "Create Task Lists" | "Never Forget a Task Again" |
| "Calendar View" | "See Your Schedule" | "Plan Your Week in Seconds" |
| "Notifications" | "Get Reminders" | "Stay on Top of Deadlines" |

### Video Preview Strategy

**Video Structure (30 seconds):**

| Seconds | Content |
|---------|---------|
| 0-5 | Hook: Show end result or main benefit |
| 5-15 | Demo: Core feature in action |
| 15-25 | Features: Quick feature montage |
| 25-30 | CTA: Logo and download prompt |

---

## Rating and Review Management

### Review Response Framework

**For Negative Reviews (1-2 stars):**

```
Structure:
1. Acknowledge the issue (1 sentence)
2. Apologize without making excuses (1 sentence)
3. Offer solution or next step (1-2 sentences)
4. Invite direct contact (1 sentence)

Example:
"We're sorry the syncing issues are affecting your experience.
Our team is actively working on a fix for the next update.
In the meantime, please try logging out and back in, which
resolves this for most users. If issues persist, email us at
support@app.com and we'll prioritize your case."
```

**For Positive Reviews (4-5 stars):**

```
Structure:
1. Thank sincerely (1 sentence)
2. Acknowledge specific praise (1 sentence)
3. Encourage continued use or sharing (1 sentence)

Example:
"Thank you for the kind words! We're thrilled the reminder
feature helps you stay organized. If you're enjoying the app,
we'd love if you'd share it with friends who might benefit."
```

### Rating Improvement Tactics

| Tactic | Implementation | Expected Impact |
|--------|----------------|-----------------|
| In-app prompt timing | After positive action (task completed, milestone reached) | +0.3 stars |
| Bug fix velocity | Address 1-star issues within 7 days | +0.2 stars |
| Response rate | Reply to 80%+ of reviews | +0.1 stars |
| Feature requests | Implement top-requested features | +0.2 stars |

### Review Prompt Best Practices

**When to prompt:**
- After user completes 5+ successful sessions
- After milestone achievement (first task completed, 7-day streak)
- After positive in-app feedback ("Was this helpful? Yes")

**When NOT to prompt:**
- First session
- After error or crash
- During critical workflow
- More than once per 30 days

---

## Launch Strategy

### Pre-Launch Checklist

**4 Weeks Before Launch:**
- [ ] Finalize app name and keywords
- [ ] Complete all metadata fields
- [ ] Prepare all visual assets
- [ ] Set up analytics (Firebase, Mixpanel)
- [ ] Create press kit and media assets
- [ ] Build email list for launch notification

**2 Weeks Before Launch:**
- [ ] Submit for app review
- [ ] Prepare social media content
- [ ] Brief press and influencers
- [ ] Set up review response templates
- [ ] Configure in-app rating prompts

**Launch Day:**
- [ ] Verify app is live in stores
- [ ] Announce across all channels
- [ ] Monitor reviews and respond quickly
- [ ] Track download velocity
- [ ] Document any issues for Day 2 fix

### Update Cadence

| Update Type | Frequency | ASO Impact |
|-------------|-----------|------------|
| Bug fixes | As needed | Prevents rating drops |
| Minor features | Every 2-4 weeks | Maintains freshness signal |
| Major features | Every 4-8 weeks | Opportunity for "What's New" |
| Metadata refresh | Every 4-6 weeks | Keyword optimization cycle |

### Seasonal Optimization

| Season | Optimization Focus | Example Categories |
|--------|--------------------|--------------------|
| Jan (New Year) | Resolutions, goals | Fitness, Productivity |
| Feb (Valentine's) | Dating, relationships | Dating, Photo |
| Mar-Apr (Tax) | Finance, organization | Finance, Productivity |
| May-Jun (Summer) | Travel, fitness | Travel, Health |
| Aug-Sep (Back to School) | Education, organization | Education, Productivity |
| Nov-Dec (Holidays) | Shopping, social | Shopping, Social |

---

## A/B Testing Framework

### Test Prioritization Matrix

| Element | Impact | Ease | Priority |
|---------|--------|------|----------|
| App Icon | High | Medium | 1 |
| Screenshot 1 | High | Medium | 2 |
| Title | High | Easy | 3 |
| Short Description | Medium | Easy | 4 |
| Screenshots 2-5 | Medium | Medium | 5 |
| Video | Medium | Hard | 6 |

### Sample Size Calculator

**Formula:**
```
Sample Size = (2 × (Z² × p × (1-p))) / E²

Where:
Z = 1.96 (for 95% confidence)
p = baseline conversion rate
E = minimum detectable effect (usually 0.05)
```

**Quick Reference:**

| Baseline CVR | Min. Impressions for 5% Lift |
|--------------|------------------------------|
| 1% | 31,000 per variant |
| 2% | 15,500 per variant |
| 5% | 6,200 per variant |
| 10% | 3,100 per variant |

### Test Duration Guidelines

| Daily Impressions | Minimum Test Duration |
|-------------------|----------------------|
| 1,000+ | 7 days |
| 500-1,000 | 14 days |
| 100-500 | 30 days |
| <100 | Not recommended |

---

## Conversion Optimization

### Conversion Funnel Metrics

| Stage | Metric | Benchmark |
|-------|--------|-----------|
| Discovery | Impressions | Category dependent |
| Consideration | Page Views | 30-50% of impressions |
| Conversion | Installs | 3-8% of page views |
| Activation | First Open | 70-90% of installs |

### Conversion Optimization Levers

| Lever | Typical Lift | Effort |
|-------|--------------|--------|
| Icon redesign | 10-25% | High |
| Screenshot optimization | 15-35% | Medium |
| Title keyword optimization | 5-15% | Low |
| Description rewrite | 5-10% | Low |
| Video addition | 10-20% | High |
| Localization | 20-50% per market | Medium |

---

## Common Mistakes to Avoid

### Keyword Mistakes

| Mistake | Problem | Solution |
|---------|---------|----------|
| Keyword stuffing | Spam detection, rejection | Natural usage, 2-3% density |
| Competitor names | Guideline violation | Focus on category terms |
| Duplicate keywords | Wasted character space | Remove duplicates from keyword field |
| Ignoring long-tail | Missing conversion | Include specific phrases |

### Metadata Mistakes

| Mistake | Problem | Solution |
|---------|---------|----------|
| Vague descriptions | Low conversion | Specific benefits and features |
| Feature-focused copy | Doesn't resonate | Benefit-focused messaging |
| Outdated information | Misleading users | Update with each release |
| Missing localization | Lost global revenue | Prioritize top 5 markets |

### Visual Asset Mistakes

| Mistake | Problem | Solution |
|---------|---------|----------|
| Text-heavy screenshots | Unreadable on phones | Minimal text, clear UI focus |
| Inconsistent style | Unprofessional appearance | Design system for all assets |
| Portrait-only screenshots | Missed tablet users | Include landscape variants |
| No social proof | Lower trust | Add ratings, awards, press |

### Launch Mistakes

| Mistake | Problem | Solution |
|---------|---------|----------|
| Launching on Friday | No support over weekend | Launch Tuesday-Wednesday |
| No analytics setup | Can't measure success | Firebase/Mixpanel before launch |
| Immediate rating prompt | Negative ratings | Wait for positive experience |
| Ignoring reviews | Declining ratings | Respond within 24-48 hours |
