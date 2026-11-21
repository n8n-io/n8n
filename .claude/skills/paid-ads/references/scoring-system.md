# Ad Account Scoring System

Reference for `ad_health_scorer.py`. Defines the weighted scoring algorithm, severity multipliers, and platform-specific category weights.

## Scoring formula

```
Category_Score = Σ(Check_Result × Severity_Multiplier) / Σ(Severity_Multiplier) × 100
Platform_Score = Σ(Category_Score × Category_Weight)
Aggregate_Score = Σ(Platform_Score × Budget_Share)
```

## Severity multipliers

| Severity | Multiplier | Meaning | SLA |
|---|---|---|---|
| Critical | 5.0x | Blocks revenue or burns budget | Fix immediately |
| High | 3.0x | Significant performance impact | Fix within 1 week |
| Medium | 1.5x | Optimization opportunity | Fix within 1 month |
| Low | 0.5x | Polish / best practice | Backlog |

Critical issues dominate the score. A single critical failure drops the category score significantly, which is the correct behavior — a missing conversion tag invalidates everything downstream.

## Platform category weights

### Google Ads
| Category | Weight | Key checks |
|---|---|---|
| Conversion Tracking | 25% | Tag installed, Enhanced Conversions, attribution model, conversion window |
| Wasted Spend | 20% | Negative keywords, search terms review, broad match rules, 3× CPA kill rule |
| Account Structure | 15% | Naming conventions, ad group size, campaign types |
| Keywords | 15% | Quality Score, duplicates, match types, search intent alignment |
| Ads | 15% | RSA headlines count, extensions, A/B testing |
| Settings | 10% | Location targeting, schedules, networks, bidding strategy |

### Meta (Facebook/Instagram)
| Category | Weight | Key checks |
|---|---|---|
| Pixel & CAPI | 30% | Pixel installed, CAPI active, event deduplication, domain verification |
| Creative | 30% | Format diversity, fatigue detection, safe zones, copy length |
| Structure | 20% | CBO, campaign naming, advantage+ settings |
| Audience | 20% | Lookalike seed size, exclusions, overlap, custom audiences |

### LinkedIn
| Category | Weight | Key checks |
|---|---|---|
| Technical | 25% | Insight tag, conversion events, matched audiences |
| Targeting | 25% | Audience size, job function vs title, company lists |
| Creative | 25% | Format mix, single-image vs carousel vs video, CTA alignment |
| Budget | 25% | Daily budget sufficiency, bid strategy, pacing |

### TikTok
| Category | Weight | Key checks |
|---|---|---|
| Pixel | 25% | Pixel installed, events configured, match quality |
| Creative | 30% | Native-feel content, format mix, hook rate (3s), UGC ratio |
| Targeting | 25% | Interest vs behavior, custom audiences, lookalikes |
| Budget | 20% | Learning phase budget (50× target CPA), pacing |

## Grade bands

| Grade | Score | Meaning |
|---|---|---|
| A | 90-100 | Excellent — maintain and scale |
| B | 75-89 | Good — address high-priority items |
| C | 60-74 | Needs work — systematic improvements needed |
| D | 40-59 | Poor — significant issues blocking performance |
| F | <40 | Critical — account needs fundamental restructuring |

Bands are calibrated wider than SEO scoring because ad accounts typically have more actionable but non-critical issues (e.g., missing extensions, suboptimal ad copy).

## Quick Wins formula

```
Quick Win = severity ∈ {critical, high} AND result = "warn" (not full fail)
```

Quick wins are issues that are important (high severity) but partially working (warn, not fail) — meaning the fix is usually small: enable a toggle, add a few negative keywords, activate an extension.

## Hard rules (quality gates)

These combinations should NEVER be recommended together:
- Broad Match + Manual CPC (wastes budget without smart bidding control)
- CPA target below $5 with < $50/day budget (can't exit learning phase)
- Conversion action = page view as primary (inflates numbers, misleads bidding)

The scorer doesn't enforce these directly but the SKILL.md workflow should flag them as critical failures.
