# Activation Models

The activation model is *how* you let a user experience value before they pay. It shapes signup volume, conversion, and the entire onboarding path. Pick the model before you design the flow.

## The 5 activation models

### 1. Freemium
A free tier that never expires, with paid tiers for more capacity or features.

- Best when: the free tier delivers real value *and* naturally hits limits that motivate upgrading.
- Risk: give away too much and users never need to pay (see Evernote below).

### 2. Free trial
Full (or near-full) access for a fixed window: **3, 7, 14, or 30 days**.

- Shorter trials create urgency and force faster time-to-value; longer trials suit complex products with longer setup.
- **Credit-card requirement is a tradeoff to test**: it adds signup friction and can change who enters the trial. A higher trial→paid rate among those who provide a card does not by itself mean more paying customers from the same incoming traffic.
- [ChartMogul's 2026 report](https://chartmogul.com/reports/saas-conversion-report-2/) (200 B2B products): card-required trials convert ~30% trial→paid, over 5x no-card trials. That's observational and comes on fewer signups, so decide on visitor→paid, not trial→paid.
- Compare visitor→trial × trial→paid = visitor→paid over the same conversion horizon and eligible traffic. Include net contribution per visitor, refunds, early churn, and support costs. For example, 10% signup × 10% trial conversion = 1% visitor→paid; 3% signup × 25% trial conversion = 0.75%, despite the higher trial conversion. These are illustrative inputs.
- Where practical, randomize eligible visitors between clearly disclosed trial terms and wait for complete follow-up. Choose the gate from the whole funnel and retained customer economics.

### 3. Paid trial
A low-cost paid entry, typically **$7–10 for 7 days**.

- Filters out tire-kickers while lowering the barrier vs. full price.
- Signals seriousness on both sides and pre-collects payment details.

### 4. Money-back guarantee
Charge full price up front, with a no-questions refund window.

- Removes purchase risk without giving anything away for free.
- Works when the product delivers value quickly enough to beat the refund window.

### 5. Consultation / white-glove
A human conversation (demo, call, or hands-on setup) gates access — the **Superhuman** model.

- Best for high-touch, high-price, or complex products where a human ensures the user reaches value.
- Doesn't scale cheaply, but converts and retains well when done right.

## Model-Market Fit

**Model-Market Fit (Brian Balfour): "your market dictates your model."**

You don't get to freely choose your activation model — your market chooses it for you. Price point, buyer sophistication, sales complexity, time-to-value, and competitor norms all constrain what will work. A self-serve $20/mo tool and a $50k enterprise platform cannot use the same model. Match the model to the market before optimizing the onboarding inside it.

## The Evernote vs. Notion parable

Two lessons on how much to give away:

- **Evernote — gave away too much free.** The free tier was generous enough that most users never needed to upgrade. Free was a destination, not a doorway. Growth without matching monetization.
- **Notion — hook, then limit.** Let users experience real value, then hit meaningful limits (blocks, members, features) that create a natural, well-timed reason to pay.

The principle: **the free experience should hook, not satisfy.** Give enough value to prove the product and build the habit — but structure the limits so that continued value requires upgrading.

## Choosing

1. Start from your market (Model-Market Fit), not your preference.
2. Decide the card-vs-no-card tradeoff explicitly: volume of leads vs. quality of leads.
3. Design the free/trial experience to hook and then limit — never to fully satisfy.
4. Whatever the model, the onboarding inside it still needs the shortest possible path to value (see [minimum-path-to-value.md](minimum-path-to-value.md)).
