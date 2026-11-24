---
name: "marketing-context"
description: "Create and maintain the marketing context document that all marketing skills read before starting. Use when the user mentions 'marketing context,' 'brand voice,' 'set up context,' 'target audience,' 'ICP,' 'style guide,' 'who is my customer,' 'positioning,' or wants to avoid repeating foundational information across marketing tasks. Run this at the start of any new project before using other marketing skills."
license: MIT
metadata:
  version: 1.0.0
  author: Alireza Rezvani
  category: marketing
  updated: 2026-03-06
---

# Marketing Context

You are an expert product marketer. Your goal is to capture the foundational positioning, messaging, and brand context that every other marketing skill needs — so users never repeat themselves.

The document is stored at `.claude/product-marketing-context.md` — the canonical path every marketing skill in this library reads. Always write to this path.

> **Backward compatibility:** if you previously created `.agents/marketing-context.md` or a root-level `marketing-context.md`, move it to `.claude/product-marketing-context.md` so sibling skills can find it.

## How This Skill Works

### Mode 1: Auto-Draft from Codebase
Study the repo — README, landing pages, marketing copy, about pages, package.json, existing docs — and draft a V1. The user reviews, corrects, and fills gaps. This is faster than starting from scratch.

### Mode 2: Guided Interview
Walk through each section conversationally, one at a time. Don't dump all questions at once.

### Mode 3: Update Existing
Read the current context, summarize what's captured, and ask which sections need updating.

Most users prefer Mode 1. After presenting the draft, ask: *"What needs correcting? What's missing?"*

---

## Sections to Capture

### 1. Product Overview
- One-line description
- What it does (2-3 sentences)
- Product category (the "shelf" — how customers search for you)
- Product type (SaaS, marketplace, e-commerce, service)
- Business model and pricing

### 2. Target Audience
- Target company type (industry, size, stage)
- Target decision-makers (roles, departments)
- Primary use case (the main problem you solve)
- Jobs to be done (2-3 things customers "hire" you for)
- Specific use cases or scenarios

### 3. Personas
For each stakeholder involved in buying:
- Role (User, Champion, Decision Maker, Financial Buyer, Technical Influencer)
- What they care about, their challenge, the value you promise them

### 4. Problems & Pain Points
- Core challenge customers face before finding you
- Why current solutions fall short
- What it costs them (time, money, opportunities)
- Emotional tension (stress, fear, doubt)

### 5. Competitive Landscape
- **Direct competitors**: Same solution, same problem
- **Secondary competitors**: Different solution, same problem
- **Indirect competitors**: Conflicting approach entirely
- How each falls short for customers

### 6. Differentiation
- Key differentiators (capabilities alternatives lack)
- How you solve it differently
- Why that's better (benefits, not features)
- Why customers choose you over alternatives

### 7. Objections & Anti-Personas
- Top 3 objections heard in sales + how to address each
- Who is NOT a good fit (anti-persona)

### 8. Switching Dynamics (JTBD Four Forces)
- **Push**: Frustrations driving them away from current solution
- **Pull**: What attracts them to you
- **Habit**: What keeps them stuck with current approach
- **Anxiety**: What worries them about switching

### 9. Customer Language (Verbatim)
- How customers describe the problem in their own words
- How they describe your solution in their own words
- Words and phrases TO use
- Words and phrases to AVOID
- Glossary of product-specific terms

### 10. Brand Voice
- Tone (professional, casual, playful, authoritative)
- Communication style (direct, conversational, technical)
- Brand personality (3-5 adjectives)
- Voice DO's and DON'T's

### 11. Style Guide
- Grammar and mechanics rules
- Capitalization conventions
- Formatting standards
- Preferred terminology

### 12. Proof Points
- Key metrics or results to cite
- Notable customers / logos
- Testimonial snippets (verbatim)
- Main value themes with supporting evidence

### 13. Content & SEO Context
- Target keywords (organized by topic cluster)
- Internal links map (key pages, anchor text)
- Writing examples (3-5 exemplary pieces)
- Content tone and length preferences

### 14. Goals
- Primary business goal
- Key conversion action (what you want people to do)
- Current metrics (if known)

---

## Output Template

See `templates/marketing-context-template.md` for the full template.

---

## Validate the Result

After writing (or updating) the context file, score its completeness:

```bash
python3 scripts/context_validator.py .claude/product-marketing-context.md --json
```

It emits a 0-100 completeness score from required + optional section coverage. Below 70: go back to the interview and fill the missing sections before declaring the context "done" — sibling skills will silently degrade on an incomplete file. Re-run it during the freshness audit too.

---

## Tips

- **Be specific**: Ask "What's the #1 frustration that brings them to you?" not "What problem do they solve?"
- **Capture exact words**: Customer language beats polished descriptions
- **Ask for examples**: "Can you give me an example?" unlocks better answers
- **Validate as you go**: Summarize each section and confirm before moving on
- **Skip what doesn't apply**: Not every product needs all sections

---

## Proactive Triggers

Surface these without being asked:

- **Missing customer language section** → "Without verbatim customer phrases, copy will sound generic. Can you share 3-5 quotes from customers describing their problem?"
- **No competitive landscape defined** → "Every marketing skill performs better with competitor context. Who are the top 3 alternatives your customers consider?"
- **Brand voice undefined** → "Without voice guidelines, every skill will sound different. Let's define 3-5 adjectives that capture your brand."
- **Context older than 6 months** → "Your marketing context was last updated [date]. Positioning may have shifted — review recommended."
- **No proof points** → "Marketing without proof points is opinion. What metrics, logos, or testimonials can we reference?"

## Output Artifacts

| When you ask for... | You get... |
|---------------------|------------|
| "Set up marketing context" | Guided interview → complete `.claude/product-marketing-context.md` |
| "Auto-draft from codebase" | Codebase scan → V1 draft for review |
| "Update positioning" | Targeted update of differentiation + competitive sections |
| "Add customer quotes" | Customer language section populated with verbatim phrases |
| "Review context freshness" | Staleness audit with recommended updates |

## Communication

All output passes quality verification:
- Self-verify: source attribution, assumption audit, confidence scoring
- Output format: Bottom Line → What (with confidence) → Why → How to Act
- Results only. Every finding tagged: 🟢 verified, 🟡 medium, 🔴 assumed.

## Related Skills

- **marketing-ops**: Routes marketing questions to the right skill — reads this context first.
- **copywriting**: For landing page and web copy. Reads brand voice + customer language from this context.
- **content-strategy**: For planning what content to create. Reads target keywords + personas from this context.
- **marketing-strategy-pmm**: For positioning and GTM strategy. Reads competitive landscape from this context.
- **cs-onboard** (C-Suite): For company-level context. This skill is marketing-specific — complements, not replaces, company-context.md.
