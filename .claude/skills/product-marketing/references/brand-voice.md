# Brand Voice

Voice is how the brand sounds everywhere. Tone is how much of that voice you turn up or down for a given moment. A support reply to someone whose payroll failed and a launch post use the same voice at very different tones.

The context file keeps a short voice summary that every skill reads. This reference covers how to build the full profile, how to adjust tone by context, and how other skills should apply it.

## Build the profile from evidence

Three adjectives picked in a meeting ("friendly, bold, expert") don't constrain anything, because every brand claims them. Build the profile from writing that already exists and already works.

**Sources, strongest first:**

1. **Copy that performed.** The email with the best reply rate, the ad that scaled, the landing page that converts. Pick by the numbers. What the team likes is a weaker signal.
2. **The founder's or team's own writing.** Posts, memos, talks, sales emails they wrote themselves. Early-stage brands usually sound like the founder, whether or not anyone decided that.
3. **Sales and support conversations.** How the team explains the product out loud is often clearer than the website.
4. **Customer reviews and interviews.** These give vocabulary more than voice: the words buyers use for the problem and for you. They feed **Customer Language** in the context file.
5. **Copy you'd never write.** A competitor page or a draft that felt wrong. Saying why it's wrong defines the edges of your voice faster than describing the middle.

**Steps:**

1. Collect 10–20 samples, each labeled with its channel and, where you have it, how it performed.
2. Note traits you can observe: sentence length, first person ("we," "I") or not, contractions, how much jargon, whether claims are backed by numbers or stories, whether there's humor and where, how bad news is handled.
3. Write 3–5 voice attributes. Each one needs a **means**, a **doesn't mean**, and a real line from the samples. The "doesn't mean" column does the work: "direct" that doesn't rule out curt, or "playful" that doesn't rule out jokes in an outage notice, won't change a draft.
4. Test it. Put an unlabeled draft written to the profile next to a competitor's copy and ask someone who knows the brand which is yours. If they can't tell, the attributes are too generic.
5. Confirm with the user. Voice is a choice the brand makes. You can infer a draft from samples, but the user decides.

**Example profile** (a fictional invoicing tool for freelancers):

| Attribute | Means | Doesn't mean | Line from the samples |
|---|---|---|---|
| Plain-spoken | Short words, numbers over adjectives, money stated in dollars | Dumbed down or vague | "You'll get paid in 2 days instead of 30." |
| On the freelancer's side | Takes the user's view against slow-paying clients | Snarky about clients by name | "We'll chase the late ones so you can get back to work." |
| Calm about money | States fees, failures, and fixes without drama | Cold or legalistic | "Your payout is late because the bank flagged it. Here's what to send them." |
| Dry humor, rarely | One light line where the stakes are low | Jokes in billing, errors, or anything about late payment | "Yes, you can invoice in your pajamas." |

## Tone by context

Hold the attributes constant and change the intensity. Fill one row per context the brand writes in.

| Context | Turn up | Turn down | Rule of thumb |
|---|---|---|---|
| **Support** | Calm, plain steps, ownership of the problem | Humor, marketing claims | Answer first. If it's our fault, say so in the first line. |
| **Launch** | Energy carried by specifics: what's new, who it's for, one number | Superlatives and adjectives | If the launch post would read the same with a competitor's name in it, it's too generic. |
| **Errors and in-product messages** | What happened and what to do next | Blame, cleverness, apology loops | One sentence on what happened, one on the fix. No jokes when someone is blocked. |
| **Sales and outbound** | Peer-to-peer, short, one ask | Hype, feature lists | Write like one operator emailing another. |
| **Social** | Opinions, personality, the founder's voice | Corporate hedging | The loosest the brand gets, still inside the attributes. |
| **Billing, legal, incidents** | Precision | Personality | Exact numbers, dates, and next steps. Voice shows only in plainness. |

## Before and after

Same fictional brand. The "before" versions are what a generic draft looks like; the "after" versions apply the profile and the tone row.

**Launch announcement**
- Before: "We're excited to announce our powerful new automated reminders feature, designed to help you streamline your invoicing workflow."
- After: "Invoices now chase themselves. Turn on reminders and we'll nudge late clients at 3, 7, and 14 days, from your email address, in your words."

**Support reply**
- Before: "Thank you for reaching out. We apologize for any inconvenience this may have caused. Our team is looking into the matter."
- After: "That payout should have landed Tuesday. It's stuck because the bank asked for a tax form, which we should have told you about. Upload it here and the money moves the same day."

**Error message**
- Before: "Error: Invalid input. Please try again."
- After: "That client email has a typo in it (gmial.com). Fix it and we'll send the invoice."

**Sales email opener**
- Before: "I hope this email finds you well. I wanted to reach out to introduce our innovative invoicing solution."
- After: "Saw you're hiring two more contractors. More projects usually means more client invoices to chase. Worth a 10-minute look at how we handle that?"

## Words

General AI-sounding words and plain swaps are already covered in **copywriting** (`references/ai-tells.md`) and **copy-editing** (`references/plain-english-alternatives.md`). The brand word list is for terms specific to this brand:

| List | What goes in it | Example |
|---|---|---|
| **Terms we own** | What the product calls things, used the same way everywhere | "Payout," never "withdrawal" or "transfer" |
| **Customer words** | The buyer's phrases for the problem, from reviews and calls | "Chasing invoices," "net-60 hell" |
| **Never use** | Words that break the voice, with the reason | "Seamless" (we have edge cases and say so); "hustle" (our users are tired of it) |
| **Category words to avoid** | Terms every competitor uses that make you sound like them | "All-in-one financial platform" |

Keep the reason next to each "never use" word. A list without reasons gets ignored or overapplied.

## Personal voice

When drafting as a specific person (a founder's posts, an exec's emails, a CEO's launch note), keep a separate short profile for that person and read it before the brand profile. Capture:

- How they open and close messages
- Sentence habits (length, fragments, questions, favorite phrases)
- Emoji, punctuation, and formatting habits
- Templates for message types they send often
- Things they never say

Refresh it from their recent writing every quarter or so, and fold in the edits they make to your drafts. Their edits are the most accurate voice data you'll get. Store these next to the context file, for example `.agents/voice/<name>.md`.

## How other skills apply it

- **Drafting skills** (copywriting, emails, social, ad-creative, cold-email, launch): read the attributes and the tone row for the channel before writing. Check the draft against each attribute's "doesn't mean" column before handing it over.
- **copy-editing**: in its voice pass, judge the draft against the profile instead of general taste. Flag lines that break an attribute and say which one.
- **Brand-voice review output:** the revised copy, then one line per change naming the attribute or tone rule it serves. Skip the line when the change is a plain typo or fact fix.
- **When samples conflict with the profile:** if top-performing copy keeps breaking the profile in the same way, the profile is probably wrong. Raise it with the user, log it in the **Learnings** section of the context file, and update the profile if they agree.

---

*Tone-by-context, word lists, and per-person voice guides adapted from Wispr Flow's brand-voice skill, published under MIT in [skills-marketing-library](https://github.com/retieedra-profound/skills-marketing-library). Rewritten and extended here.*
