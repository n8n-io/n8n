# Attribution Models Guide

Comprehensive reference for multi-touch attribution modeling in marketing analytics. This guide covers the five standard attribution models, their mathematical foundations, selection criteria, and practical application guidelines.

---

## Overview

Attribution modeling answers the question: **Which marketing touchpoints deserve credit for conversions?** When a customer interacts with multiple channels before converting, attribution models distribute conversion credit across those touchpoints using different rules.

No single model is "correct." Each reveals different aspects of channel performance. Best practice is to run multiple models and compare results to build a complete picture.

---

## Model 1: First-Touch Attribution

### How It Works

All conversion credit (100%) goes to the first touchpoint in the customer journey.

### Formula

```
Credit(channel) = Revenue * 1.0   (if channel is first touchpoint)
Credit(channel) = 0               (otherwise)
```

### When to Use

- **Brand awareness campaigns**: Measures which channels bring new prospects into the funnel
- **Top-of-funnel optimization**: Identifies the best channels for initial discovery
- **New market entry**: Evaluating which channels generate first contact in new segments

### Pros

- Simple to understand and implement
- Clearly identifies awareness-driving channels
- Useful for budget allocation toward customer acquisition

### Cons

- Ignores all touchpoints after the first
- Overvalues awareness channels, undervalues conversion channels
- Does not reflect the reality of multi-touch customer journeys

### Best For

Marketing teams focused on expanding reach and entering new markets where understanding initial discovery channels is the priority.

---

## Model 2: Last-Touch Attribution

### How It Works

All conversion credit (100%) goes to the last touchpoint before conversion.

### Formula

```
Credit(channel) = Revenue * 1.0   (if channel is last touchpoint)
Credit(channel) = 0               (otherwise)
```

### When to Use

- **Direct response campaigns**: Measures which channels close deals
- **Bottom-of-funnel optimization**: Identifies the most effective conversion channels
- **Short sales cycles**: When customers typically convert within 1-2 interactions

### Pros

- Simple to implement (default in many analytics platforms)
- Highlights channels that directly drive conversions
- Useful for performance marketing optimization

### Cons

- Ignores all touchpoints before the last
- Overvalues conversion channels, undervalues awareness channels
- Can lead to cutting awareness spending that actually feeds the pipeline

### Best For

Performance marketing teams running direct-response campaigns where the final interaction is the primary lever.

---

## Model 3: Linear Attribution

### How It Works

Conversion credit is split equally across all touchpoints in the journey.

### Formula

```
Credit(channel) = Revenue / N     (for each of N touchpoints)
```

### When to Use

- **Balanced multi-channel evaluation**: When all touchpoints are considered equally valuable
- **Long sales cycles**: Where multiple interactions are required
- **Content marketing**: Where each piece of content plays a role in nurturing

### Pros

- Fair distribution across all channels
- Recognizes the contribution of every touchpoint
- Good starting point for teams new to multi-touch attribution

### Cons

- Treats all touchpoints equally, which rarely reflects reality
- Does not account for the relative importance of different positions in the journey
- Can dilute the signal of truly impactful touchpoints

### Best For

Teams running consistent multi-channel campaigns where every touchpoint is intentionally designed to contribute to conversion.

---

## Model 4: Time-Decay Attribution

### How It Works

Touchpoints closer to conversion receive exponentially more credit. Uses a half-life parameter: a touchpoint occurring one half-life before conversion gets 50% of the credit of the converting touchpoint.

### Formula

```
Weight(touchpoint) = e^(-lambda * days_before_conversion)

where lambda = ln(2) / half_life_days

Credit(channel) = Revenue * (Weight / Sum_of_all_weights)
```

### Configurable Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| half_life_days | 7 | Days for weight to decay by 50% |

### Guidance on Half-Life Selection

| Sales Cycle Length | Recommended Half-Life |
|-------------------|----------------------|
| 1-3 days (impulse) | 1-2 days |
| 1-2 weeks (considered) | 5-7 days |
| 1-3 months (B2B) | 14-21 days |
| 3-6 months (enterprise) | 30-45 days |
| 6-12 months (complex B2B) | 60-90 days |

### When to Use

- **Short-to-medium sales cycles**: Where recent interactions are more influential
- **Promotional campaigns**: Where urgency and recency matter
- **E-commerce**: Where the last few interactions before purchase are most impactful

### Pros

- Accounts for recency, which aligns with many buying behaviors
- More sophisticated than first/last-touch
- Configurable half-life allows tuning to specific business contexts

### Cons

- May undervalue early-stage awareness that planted the seed
- Half-life selection is subjective and requires testing
- More complex to explain to stakeholders

### Best For

E-commerce and B2C companies with identifiable sales cycles where recent interactions carry more decision weight.

---

## Model 5: Position-Based Attribution (U-Shaped)

### How It Works

40% of credit goes to the first touchpoint, 40% to the last touchpoint, and the remaining 20% is split equally among middle touchpoints.

### Formula

```
Credit(first_channel) = Revenue * 0.40
Credit(last_channel)  = Revenue * 0.40
Credit(middle_channel) = Revenue * 0.20 / (N - 2)     (for each middle touchpoint)

Special cases:
  - 1 touchpoint: 100% credit
  - 2 touchpoints: 50% each
```

### When to Use

- **Full-funnel marketing**: Values both awareness (first) and conversion (last)
- **Mature marketing programs**: With established multi-channel strategies
- **B2B marketing**: Where both lead generation and deal closure are distinct priorities

### Pros

- Recognizes the importance of first and last interactions
- Still gives credit to middle nurturing touchpoints
- Provides a balanced view of the full journey

### Cons

- The 40/20/40 split is arbitrary (some businesses may need 30/40/30 or other splits)
- Middle touchpoints get relatively little credit
- May not suit businesses where middle interactions are the primary differentiator

### Best For

B2B and enterprise marketing teams running coordinated campaigns across the full customer journey from awareness through conversion.

---

## Model Comparison Matrix

| Criteria | First-Touch | Last-Touch | Linear | Time-Decay | Position-Based |
|----------|------------|------------|--------|------------|----------------|
| Complexity | Low | Low | Low | Medium | Medium |
| Awareness bias | High | None | Neutral | Low | Medium |
| Conversion bias | None | High | Neutral | High | Medium |
| Multi-touch fairness | Poor | Poor | Good | Good | Good |
| Best sales cycle | Any | Short | Long | Short-Medium | Any |
| Stakeholder clarity | High | High | High | Medium | Medium |

---

## Practical Guidelines

### Running Multiple Models

Always run at least 3 models and look for channels that rank highly across multiple models. These are your most reliable performers. Channels that rank well in only one model may be overvalued by that model's bias.

### Interpreting Divergent Results

When models disagree significantly on a channel's value:

1. **High in first-touch, low in last-touch**: The channel is strong for awareness but does not close. Pair it with stronger conversion channels.
2. **Low in first-touch, high in last-touch**: The channel closes deals but does not generate new prospects. Ensure upstream awareness channels feed it.
3. **High in linear, low in first/last**: The channel plays a critical nurturing role. Cutting it may break the journey without immediately visible impact.

### Common Pitfalls

- **Over-relying on last-touch**: Most analytics platforms default to last-touch, which chronically undervalues awareness spending.
- **Ignoring non-converting journeys**: Attribution only counts converted journeys. Channels that contribute to unconverted journeys may still have value.
- **Confusing correlation with causation**: Attribution shows correlation between touchpoints and conversion, not definitive causation.
- **Insufficient data volume**: Models require statistically meaningful journey counts. With fewer than 100 journeys, results are unreliable.

---

## Data Requirements

### Minimum Data

| Field | Required | Description |
|-------|----------|-------------|
| journey_id | Yes | Unique identifier for each customer journey |
| touchpoints | Yes | Array of channel interactions with timestamps |
| converted | Yes | Boolean indicating whether the journey converted |
| revenue | Recommended | Conversion value for credit allocation |

### Touchpoint Fields

| Field | Required | Description |
|-------|----------|-------------|
| channel | Yes | Marketing channel name |
| timestamp | Yes | ISO-format timestamp of the interaction |
| interaction | Optional | Type of interaction (click, view, open, etc.) |

---

## Further Reading

- Google Analytics attribution model comparison documentation
- Facebook/Meta attribution window settings and their impact
- HubSpot multi-touch revenue attribution methodology
- Bizible/Marketo B2B attribution best practices
