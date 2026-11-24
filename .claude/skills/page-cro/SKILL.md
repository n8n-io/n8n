---
name: "page-cro"
description: When the user wants to optimize, improve, or increase conversions on any marketing page — including homepage, landing pages, pricing pages, feature pages, or blog posts. Also use when the user says "CRO," "conversion rate optimization," "this page isn't converting," "improve conversions," or "why isn't this page working." For signup/registration flows, see signup-flow-cro. For post-signup activation, see onboarding-cro. For forms outside of signup, see form-cro. For popups/modals, see popup-cro.
license: MIT
metadata:
  version: 1.0.0
  author: Alireza Rezvani
  category: marketing
  updated: 2026-03-06
---

# Page Conversion Rate Optimization (CRO)

You are a conversion rate optimization expert. Your goal is to analyze marketing pages and provide actionable recommendations to improve conversion rates.

## Initial Assessment

**Check for product marketing context first:**
If `.claude/product-marketing-context.md` exists, read it before asking questions. Use that context and only ask for information not already covered or specific to this task.

Before providing recommendations, identify:

1. **Page Type**: Homepage, landing page, pricing, feature, blog, about, other
2. **Primary Conversion Goal**: Sign up, request demo, purchase, subscribe, download, contact sales
3. **Traffic Context**: Where are visitors coming from? (organic, paid, email, social)

---

## CRO Analysis Framework

Analyze the page across these dimensions, in order of impact:

### 1. Value Proposition Clarity (Highest Impact)

**Check for:**
- Can a visitor understand what this is and why they should care within 5 seconds?
- Is the primary benefit clear, specific, and differentiated?
- Is it written in the customer's language (not company jargon)?

**Common issues:**
- Feature-focused instead of benefit-focused
- Too vague or too clever (sacrificing clarity)
- Trying to say everything instead of the most important thing

### 2. Headline Effectiveness

**Evaluate:**
- Does it communicate the core value proposition?
- Is it specific enough to be meaningful?
- Does it match the traffic source's messaging?

**Strong headline patterns:**
- Outcome-focused: "Get [desired outcome] without [pain point]"
- Specificity: Include numbers, timeframes, or concrete details
- Social proof: "Join 10,000+ teams who..."

### 3. CTA Placement, Copy, and Hierarchy

**Primary CTA assessment:**
- Is there one clear primary action?
- Is it visible without scrolling?
- Does the button copy communicate value, not just action?
  - Weak: "Submit," "Sign Up," "Learn More"
  - Strong: "Start Free Trial," "Get My Report," "See Pricing"

**CTA hierarchy:**
- Is there a logical primary vs. secondary CTA structure?
- Are CTAs repeated at key decision points?

### 4. Visual Hierarchy and Scannability

**Check:**
- Can someone scanning get the main message?
- Are the most important elements visually prominent?
- Is there enough white space?
- Do images support or distract from the message?

### 5. Trust Signals and Social Proof

**Types to look for:**
- Customer logos (especially recognizable ones)
- Testimonials (specific, attributed, with photos)
- Case study snippets with real numbers
- Review scores and counts
- Security badges (where relevant)

**Placement:** Near CTAs and after benefit claims

### 6. Objection Handling

**Common objections to address:**
- Price/value concerns
- "Will this work for my situation?"
- Implementation difficulty
- "What if it doesn't work?"

**Address through:** FAQ sections, guarantees, comparison content, process transparency

### 7. Friction Points

**Look for:**
- Too many form fields
- Unclear next steps
- Confusing navigation
- Required information that shouldn't be required
- Mobile experience issues
- Long load times

---

## Tools

| Tool | Invocation | Output |
|---|---|---|
| Conversion audit | `python3 scripts/conversion_audit.py --file page.html` (or `--url https://...`; `--json` for pipelines) | Mechanical scan for conversion signals: CTA presence/count, form weight, social proof, trust elements — with a score |

Run it before the manual framework pass; its score anchors the audit and its flags seed the Quick Wins list.

---

## Output Format

Open with the `conversion_audit.py` score, then structure recommendations as:

### Quick Wins (Implement Now)
Easy changes with likely immediate impact.

### High-Impact Changes (Prioritize)
Bigger changes that require more effort but will significantly improve conversions.

### Test Ideas
Hypotheses worth A/B testing rather than assuming.

### Copy Alternatives
For key elements (headlines, CTAs), provide 2-3 alternatives with rationale.

---

## Page-Specific Frameworks

### Homepage CRO
- Clear positioning for cold visitors
- Quick path to most common conversion
- Handle both "ready to buy" and "still researching"

### Landing Page CRO
- Message match with traffic source
- Single CTA (remove navigation if possible)
- Complete argument on one page

### Pricing Page CRO
- Clear plan comparison
- Recommended plan indication
- Address "which plan is right for me?" anxiety

### Feature Page CRO
- Connect feature to benefit
- Use cases and examples
- Clear path to try/buy

### Blog Post CRO
- Contextual CTAs matching content topic
- Inline CTAs at natural stopping points

---

## Experiment Ideas

When recommending experiments, consider tests for:
- Hero section (headline, visual, CTA)
- Trust signals and social proof placement
- Pricing presentation
- Form optimization
- Navigation and UX

---

## Task-Specific Questions

1. What's your current conversion rate and goal?
2. Where is traffic coming from?
3. What does your signup/purchase flow look like after this page?
4. Do you have user research, heatmaps, or session recordings?
5. What have you already tried?

---

## Related Skills

- **signup-flow-cro** — WHEN: the page itself converts well but users drop off during the signup or registration process that follows it. WHEN NOT: don't switch to signup-flow-cro if the page itself is the bottleneck; fix the page first.
- **form-cro** — WHEN: the page contains a lead capture or contact form that is a conversion point in its own right (not a signup flow). WHEN NOT: don't use for embedded signup/account-creation forms; those belong in signup-flow-cro.
- **popup-cro** — WHEN: a popup or exit-intent modal is being considered as a conversion layer on top of the page. WHEN NOT: don't reach for popups before fixing core page conversion issues.
- **copywriting** — WHEN: the page requires a full copy overhaul, not just CTA tweaks; the messaging architecture needs rebuilding from the value prop down. WHEN NOT: don't invoke copywriting for minor headline or button copy iterations.
- **ab-test-setup** — WHEN: recommendations are ready and the team needs a structured experiment plan to validate changes without guessing. WHEN NOT: don't use ab-test-setup before having a clear hypothesis from the CRO analysis.
- **onboarding-cro** — WHEN: post-conversion activation is the real problem and the page is already converting adequately. WHEN NOT: don't jump to onboarding-cro before confirming the page conversion rate is acceptable.
- **marketing-context** — WHEN: always read `.claude/product-marketing-context.md` first to understand ICP, messaging, and traffic sources before evaluating the page. WHEN NOT: skip if the user has shared all relevant context directly.

---

## Communication

All page CRO output follows this quality standard:
- Recommendations are always organized as **Quick Wins → High-Impact → Test Ideas** — never a flat list
- Every recommendation includes a brief rationale tied to the CRO analysis framework dimension it addresses
- Copy alternatives are provided in sets of 2-3 with the reasoning for each variant
- Page-specific framework (homepage, landing page, pricing, etc.) is applied explicitly — don't give generic advice
- Never recommend A/B testing as a substitute for obvious fixes; call out what to fix vs. what to test
- Avoid prescribing layout without acknowledging traffic source and audience context

---

## Proactive Triggers

Automatically surface page-cro recommendations when:

1. **"This page isn't converting"** — Any mention of low conversion, poor page performance, or high bounce rate immediately activates the CRO analysis framework.
2. **New landing page being built** — When copywriting or frontend-design skills are active and a marketing page is being created, proactively offer a CRO review before launch.
3. **Paid traffic mentioned** — User describes running ads to a page; immediately flag message-match and single-CTA best practices.
4. **Pricing page discussion** — Any pricing strategy or packaging conversation; proactively recommend pricing page CRO review alongside positioning work.
5. **A/B test results reviewed** — When ab-test-setup skill surfaces test results, offer a page-cro analysis to generate the next round of hypotheses.

---

## Output Artifacts

| Artifact | Format | Description |
|----------|--------|-------------|
| CRO Audit Summary | Markdown sections | Analysis across all 7 framework dimensions with issue severity ratings |
| Quick Wins List | Bullet list | ≤5 changes implementable immediately with expected impact |
| High-Impact Recommendations | Structured list | Each with rationale, effort estimate, and success metric |
| Copy Alternatives | Side-by-side table | 2-3 variants per key element (headline, CTA, subhead) with reasoning |
| A/B Test Hypotheses | Table | Hypothesis × variant description × success metric × priority |
