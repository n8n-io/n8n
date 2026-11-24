# Ad Copy Frameworks

Reference for selecting the right copy framework based on product type and campaign goal. Each framework includes a structure template and platform-specific length constraints.

## Framework selection matrix

| Product type | Pain-point heavy? | Transformation story? | Feature-led? | Recommended framework |
|---|---|---|---|---|
| SaaS / B2B | ✅ | | | PAS (Problem-Agitate-Solve) |
| Coaching / courses | | ✅ | | BAB (Before-After-Bridge) |
| Ecommerce / physical | | | ✅ | FAB (Features-Advantages-Benefits) |
| Content / info product | ✅ | ✅ | | AIDA (Attention-Interest-Desire-Action) |
| App / tool launch | | | ✅ | 4P (Promise-Picture-Proof-Push) |
| Services / consulting | ✅ | ✅ | | Star-Story-Solution |

## The 6 frameworks

### PAS — Problem → Agitate → Solve
**Best for:** Pain-point products, SaaS solving specific frustrations

```
Problem:  Name the exact pain (1 sentence)
Agitate:  Twist the knife — what happens if they don't fix it (1-2 sentences)
Solve:    Your product is the answer (1 sentence + CTA)
```

### BAB — Before → After → Bridge
**Best for:** Transformation products, coaching, courses

```
Before:   Current painful state (1 sentence)
After:    Desired state they'll achieve (1 sentence)
Bridge:   Your product connects the two (1 sentence + CTA)
```

### AIDA — Attention → Interest → Desire → Action
**Best for:** Content marketing, info products, broad audiences

```
Attention: Hook with a surprising stat or question
Interest:  Explain why this matters to them
Desire:    Show social proof or specific outcomes
Action:    Clear CTA with urgency
```

### FAB — Features → Advantages → Benefits
**Best for:** Product-led, ecommerce, feature-rich offerings

```
Feature:    What it has (spec/capability)
Advantage:  Why that matters vs alternatives
Benefit:    What the user gains (outcome)
```

### 4P — Promise → Picture → Proof → Push
**Best for:** App launches, tools, direct response

```
Promise:  Bold claim (1 headline)
Picture:  Vivid scenario of life with the product
Proof:    Social proof, stats, testimonial
Push:     Strong CTA with urgency/scarcity
```

### Star-Story-Solution
**Best for:** Personal brands, services, consulting

```
Star:      Introduce the hero (the customer, not you)
Story:     Their struggle (relatable narrative)
Solution:  How your service transforms their situation
```

## Platform-specific constraints

| Platform | Headline | Body | CTA |
|---|---|---|---|
| Google RSA | 30 chars × 15 headlines | 90 chars × 4 descriptions | Auto from list |
| Meta Feed | 40 chars (before truncation) | 125 chars primary text (before "See more") | Button from list |
| Meta Stories | 40 chars overlay | Minimal — visual-first | Swipe up / button |
| LinkedIn Sponsored | 70 chars intro text visible | 150 chars before truncation | Button from list |
| TikTok | Overlay text in video | Caption 100 chars | Button from list |
| Microsoft | 30 chars × 15 headlines | 90 chars × 4 descriptions | Auto from list |

## Brand DNA extraction (7 voice axes)

Before writing ad copy, extract the brand's voice profile on these 7 axes:

```json
{
  "formal_casual": 0.7,       // 0 = corporate formal, 1 = casual/friendly
  "bold_subtle": 0.6,         // 0 = understated, 1 = bold/provocative
  "technical_human": 0.4,     // 0 = jargon-heavy, 1 = plain language
  "serious_playful": 0.5,     // 0 = gravitas, 1 = humor/wit
  "traditional_innovative": 0.8, // 0 = established, 1 = cutting-edge
  "exclusive_inclusive": 0.6,  // 0 = luxury/elite, 1 = accessible/everyone
  "data_emotional": 0.5       // 0 = stats-driven, 1 = story-driven
}
```

Save as `brand-profile.json` for reuse across campaigns. Each axis is 0.0-1.0.
