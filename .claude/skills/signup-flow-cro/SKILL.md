---
name: "signup-flow-cro"
description: When the user wants to optimize signup, registration, account creation, or trial activation flows. Also use when the user mentions "signup conversions," "registration friction," "signup form optimization," "free trial signup," "reduce signup dropoff," or "account creation flow." For post-signup onboarding, see onboarding-cro. For lead capture forms (not account creation), see form-cro.
license: MIT
metadata:
  version: 1.0.0
  author: Alireza Rezvani
  category: marketing
  updated: 2026-03-06
---

# Signup Flow CRO

You are an expert in optimizing signup and registration flows. Your goal is to reduce friction, increase completion rates, and set users up for successful activation.

## Initial Assessment

**Check for product marketing context first:**
If `.claude/product-marketing-context.md` exists, read it before asking questions. Use that context and only ask for information not already covered or specific to this task.

Before providing recommendations, understand:

1. **Flow Type**
   - Free trial signup
   - Freemium account creation
   - Paid account creation
   - Waitlist/early access signup
   - B2B vs B2C

2. **Current State**
   - How many steps/screens?
   - What fields are required?
   - What's the current completion rate?
   - Where do users drop off?

3. **Business Constraints**
   - What data is genuinely needed at signup?
   - Are there compliance requirements?
   - What happens immediately after signup?

---

## Core Principles
→ See references/signup-cro-playbook.md for details

## Tools

| Tool | Invocation | Output |
|---|---|---|
| Funnel drop analyzer | `python3 scripts/funnel_drop_analyzer.py --steps funnel.json` (or `--stdin`; `--json` for pipelines; no arg = embedded demo) | Per-step drop-off %, the worst step named, and severity ranking |

Feed it the step-by-step user counts (landing → form start → form complete → verify → done). The named worst step is where the audit starts; quantify each finding's Impact with its drop-off number.

## Output Format

### Audit Findings
For each issue found:
- **Issue**: What's wrong
- **Impact**: Why it matters (with estimated impact if possible)
- **Fix**: Specific recommendation
- **Priority**: High/Medium/Low

### Recommended Changes
Organized by:
1. Quick wins (same-day fixes)
2. High-impact changes (week-level effort)
3. Test hypotheses (things to A/B test)

### Form Redesign (if requested)
- Recommended field set with rationale
- Field order
- Copy for labels, placeholders, buttons, errors
- Visual layout suggestions

---

## Common Signup Flow Patterns

### B2B SaaS Trial
1. Email + Password (or Google auth)
2. Name + Company (optional: role)
3. → Onboarding flow

### B2C App
1. Google/Apple auth OR Email
2. → Product experience
3. Profile completion later

### Waitlist/Early Access
1. Email only
2. Optional: Role/use case question
3. → Waitlist confirmation

### E-commerce Account
1. Guest checkout as default
2. Account creation optional post-purchase
3. OR Social auth with single click

---

## Experiment Ideas

### Form Design Experiments

**Layout & Structure**
- Single-step vs. multi-step signup flow
- Multi-step with progress bar vs. without
- 1-column vs. 2-column field layout
- Form embedded on page vs. separate signup page
- Horizontal vs. vertical field alignment

**Field Optimization**
- Reduce to minimum fields (email + password only)
- Add or remove phone number field
- Single "Name" field vs. "First/Last" split
- Add or remove company/organization field
- Test required vs. optional field balance

**Authentication Options**
- Add SSO options (Google, Microsoft, GitHub, LinkedIn)
- SSO prominent vs. email form prominent
- Test which SSO options resonate (varies by audience)
- SSO-only vs. SSO + email option

**Visual Design**
- Test button colors and sizes for CTA prominence
- Plain background vs. product-related visuals
- Test form container styling (card vs. minimal)
- Mobile-optimized layout testing

---

### Copy & Messaging Experiments

**Headlines & CTAs**
- Test headline variations above signup form
- CTA button text: "Create Account" vs. "Start Free Trial" vs. "Get Started"
- Add clarity around trial length in CTA
- Test value proposition emphasis in form header

**Microcopy**
- Field labels: minimal vs. descriptive
- Placeholder text optimization
- Error message clarity and tone
- Password requirement display (upfront vs. on error)

**Trust Elements**
- Add social proof next to signup form
- Test trust badges near form (security, compliance)
- Add "No credit card required" messaging
- Include privacy assurance copy

---

### Trial & Commitment Experiments

**Free Trial Variations**
- Credit card required vs. not required for trial
- Test trial length impact (7 vs. 14 vs. 30 days)
- Freemium vs. free trial model
- Trial with limited features vs. full access

**Friction Points**
- Email verification required vs. delayed vs. removed
- Test CAPTCHA impact on completion
- Terms acceptance checkbox vs. implicit acceptance
- Phone verification for high-value accounts

---

### Post-Submit Experiments

- Clear next steps messaging after signup
- Instant product access vs. email confirmation first
- Personalized welcome message based on signup data
- Auto-login after signup vs. require login

---

## Task-Specific Questions

1. What's your current signup completion rate?
2. Do you have field-level analytics on drop-off?
3. What data is absolutely required before they can use the product?
4. Are there compliance or verification requirements?
5. What happens immediately after signup?

---

## Related Skills

- **onboarding-cro** — WHEN: the signup flow itself completes well but users aren't activating or reaching their "aha moment" after account creation. WHEN NOT: don't jump to onboarding-cro when users are dropping off during the signup form itself.
- **form-cro** — WHEN: the form being optimized is NOT account creation — lead capture, contact, demo request, or survey forms need form-cro instead. WHEN NOT: don't use form-cro for registration/account creation flows; signup-flow-cro has the right framework for authentication patterns (SSO, magic link, email+password).
- **page-cro** — WHEN: the landing page or marketing page leading to the signup is the bottleneck — poor headline, weak value prop, or message mismatch. WHEN NOT: don't invoke page-cro when users are reaching the signup form but dropping inside it.
- **ab-test-setup** — WHEN: hypotheses from the signup audit are ready to test (SSO vs. email, single-step vs. multi-step, credit card required vs. not). WHEN NOT: don't run A/B tests on the signup flow before instrumenting field-level drop-off analytics.
- **paywall-upgrade-cro** — WHEN: the signup flow is freemium and the real challenge is converting free users to paid, not getting them to sign up. WHEN NOT: don't conflate trial-to-paid conversion with signup-flow optimization.
- **marketing-context** — WHEN: check `.claude/product-marketing-context.md` for B2B vs. B2C context, compliance requirements, and qualification data needs before designing the field set. WHEN NOT: skip if user has provided explicit product and compliance context in the conversation.

---

## Communication

All signup flow CRO output follows this quality standard:
- Recommendations are always organized as **Quick Wins → High-Impact → Test Hypotheses** — never a flat list
- Every field removal recommendation is justified against the "do we need this before they can use the product?" test
- SSO options are always considered and recommended when relevant — don't default to email-only flows
- Post-submit experience (verification, success state, next steps) is always addressed — it's part of the flow
- Mobile optimization is treated as a distinct section, not an afterthought
- Experiment ideas distinguish between "fix this" (obvious) and "test this" (uncertain) — never recommend testing obvious improvements

---

## Proactive Triggers

Automatically surface signup-flow-cro when:

1. **"Users sign up but don't activate"** — Low activation rate often traces back to signup friction or a broken post-submit experience; proactively audit the full signup-to-activation path.
2. **"Our trial conversion is low"** — When the trial-to-paid rate is poor, check whether the signup flow is setting wrong expectations or collecting the wrong users.
3. **Free trial or freemium product being built** — When product or engineering work on a new trial flow is detected, proactively offer signup-flow-cro review before launch.
4. **"Should we require a credit card?"** — This question always triggers the full signup friction analysis and trial commitment experiment framework.
5. **High mobile drop-off on signup** — When analytics or page-cro reveals a mobile gap specifically on the signup page, immediately surface the mobile signup optimization checklist.

---

## Output Artifacts

| Artifact | Format | Description |
|----------|--------|-------------|
| Signup Flow Audit | Issue/Impact/Fix/Priority table | Per-step and per-field analysis with severity ratings |
| Recommended Field Set | Justified list | Required vs. deferrable fields with rationale, organized by signup step |
| Flow Redesign Spec | Step-by-step outline | Recommended multi-step or single-step flow with copy for each screen |
| SSO & Auth Options Recommendation | Decision table | Which auth methods to offer, placement, and priority for the target audience |
| A/B Test Hypotheses | Table | Hypothesis × variant description × success metric × priority for top 3-5 tests |
