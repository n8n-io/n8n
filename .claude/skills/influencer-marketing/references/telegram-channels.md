# Telegram Channel Ads

Buying a post in a Telegram channel is influencer marketing with a different measurement model. There is no likes-based engagement rate, no ranking feed, and the slot is usually sold by the channel's admin rather than by a creator persona. Use this reference when the user wants to advertise in Telegram channels, vet a channel before paying, or price a post.

> **Disclosure:** this reference was contributed by the team behind TGScope, a Telegram analytics tool listed among the vetting options under [Tools](#tools). The benchmarks below come from TGScope's own studies of public Telegram channels (see [Sources](#sources)). They are a single vendor's dataset, so treat them as directional and check a channel against its own history before paying.

## Contents
- How Telegram channel ads are bought
- Vetting a channel
- Pricing a post
- Tools
- Sources

## How Telegram Channel Ads Are Bought

| Route | How it works | Fits when |
|---|---|---|
| **Direct deal with the admin** | Most channels print an ad contact (a username or link) in their description. Price, format and how long the post stays up are agreed in chat. | You have picked specific channels and want control over the creative. |
| **Ad marketplaces and agencies** | Third parties resell placements across many channels and handle payment. | You need volume across many channels quickly. |
| **Telegram Ads** | Telegram's own self-serve platform for short sponsored messages (up to 160 characters) shown in public channels with 1,000+ subscribers. You target channels, topics or languages and pay for impressions. | You want reach without negotiating and accept a text-only format. |

Direct deals are often quoted as "1/24", "1/48" or "1/72": the post stays at the top of the channel for one hour (no other posts) and in the feed for 24, 48 or 72 hours before it is deleted. Permanent posts cost more. See [Pricing a Post](#pricing-a-post) for what each window is worth.

Paid posts are ads. Apply the disclosure rules of your market and of the channel's audience (SKILL.md §4); Russian-language channels, for example, must label ads by law.

## Vetting a Channel

Run these checks before paying. For most public channels the web preview at `t.me/s/<username>` shows recent posts with their view counters, which is enough for checks 1–5.

**1. Reach: views ÷ subscribers.** Take the median views of 10–20 posts that are at least a week old (newer posts are still collecting views) and divide by the subscriber count. Compare with active channels of the same size:

| Subscribers | Median reach | Bottom 10% | Top 10% |
|---|---|---|---|
| 10K–20K | 8.3% | 1.4% | 30% |
| 20K–50K | 8.0% | 1.4% | 35% |
| 50K–100K | 6.4% | 1.0% | 25% |
| 100K–300K | 6.0% | 0.9% | 26% |
| 300K–1M | 5.8% | 1.0% | 27% |
| 1M+ | 4.0% | 0.7% | 27% |

A channel in the bottom 10% for its size is selling mostly subscribers who never open it. Size does not protect you: 64 of 229 channels above a million subscribers reach fewer than 2%.

**2. Compare within topic and language.** Baselines differ several-fold:

| Topic (median reach) | | Language (median reach) | |
|---|---|---|---|
| War & military | 13.5% | Ukrainian | 17% |
| Music | 12% | Uzbek | 13% |
| News & current affairs | 9.2% | Russian | 9.3% |
| Technology & IT | 8.3% | Persian | 7.1% |
| Crypto & trading | 6.2% | English | 6.3% |
| Movies, TV & streaming | 4.6% | Arabic | 5.8% |
| Betting & gambling | 3.8% | Chinese | 3.5% |
| Shopping, deals & giveaways | 3.3% | Burmese | 2.8% |

A 4% deals channel is ordinary; a 4% war channel is weak.

**3. Check that it is active.** The ratio only means something for channels that post every week. Channels that have been silent for six months or more show a median ratio of 31%, against 6% for channels that posted in the last week. A high ratio on a quiet channel is not a loyal audience.

**4. Count the ads.** Scroll the last 20–30 posts. Among channels with 10K–100K subscribers, ad-heavy channels reach 3.9% of subscribers per post and ad-free ones 9.0%. Your post also competes with every other ad published that day.

**5. Check for ad networks.** One in five channels above 10,000 subscribers lists the same ad contact as at least one other channel; 3,866 contacts sell five channels or more, and the largest is listed by 358. At the same size, channels in a network reach fewer of their subscribers than independent ones:

| Subscribers | In a network | Independent |
|---|---|---|
| 10K–100K | 6.7% | 8.2% |
| 100K–1M | 4.7% | 6.6% |
| 1M+ | 2.9% | 5.4% |

Search the ad contact from the description to see what else it sells, and price bundles on their combined expected views rather than on the number of channels.

**6. Check the channel's age against its story.** Telegram does not show when a channel was created, but its numeric ID gives a period: since late 2017 Telegram has issued channel IDs from blocks that change every few months. A channel presenting itself as a new project while holding an ID from years earlier was created as something else and renamed or sold, together with whatever audience it had.

**7. Ask for the admin's statistics.** Admins see Telegram's built-in channel statistics (views, followers gained and lost, traffic sources). Screenshots of the last 30 days settle most doubts, and a refusal to share them is a signal.

## Pricing a Post

**Forecast from the channel's own history.** Expected views ≈ the median views of its recent week-old posts. Ads perform close to regular posts: across 1,104 posts marked as ads in 761 channels, the typical ad got 98% of the views of a regular post in the same channel.

**Compare on CPM, not on price per subscriber.** CPM = price ÷ expected views × 1,000. Two channels with the same subscriber count and price can differ several times on CPM.

**Account for the deletion window.** Share of a permanent post's views that a post collects before it is deleted:

| Deleted after | Typical share of views | Middle half of posts |
|---|---|---|
| 24 hours | 50% | 39–68% |
| 48 hours | 62% | 50–81% |
| 72 hours | 67% | 56–83% |
| 7 days | 92% | 80–100% |

A 24-hour post is worth about half of a permanent one. Recompute the CPM on the views the window actually buys.

**Do not pay extra for a time slot.** In Russian- and Ukrainian-language channels, posts published between 9:00 and 21:00 local time ended within 1% of each other in views after a week; posts published after midnight collected about 5% more.

**Measure each placement separately.** Give every channel its own link or promo code (SKILL.md §6), because a channel's audience can be loyal to the channel and indifferent to its ads.

## Tools

Options for vetting public channels. The checks above work with the first option alone.

- **Manual check (free).** The `t.me/s/<username>` preview plus the arithmetic above. Slow for more than a handful of channels, needs nothing.
- **Telegram's built-in statistics.** Exact numbers including traffic sources, but only the admin can see them, so you depend on screenshots.
- **Telegram Ads.** Skips channel-by-channel vetting: Telegram reports impressions directly, at the cost of a 160-character text format.
- **Third-party Telegram analytics catalogs.** Several services index public channels with subscriber history and post views. Coverage, history depth and free limits vary.
- **TGScope** (from the contributor of this reference; free, no account). Compares a channel's reach with channels of the same size, language, and topic, forecasts ad views by deletion window, and finds channels that share an ad contact: [tgscope.io](https://tgscope.io).

## Sources

- [How many Telegram subscribers actually see a post](https://tgscope.io/rnd/telegram-channel-reach): 45,691 active channels above 10,000 subscribers observed June–July 2026. Reach by size, topic and language, ad load, inactive channels, view build-up, ad posts, posting hour.
- [Telegram's hidden ad networks](https://tgscope.io/rnd/telegram-channel-networks): shared ad contacts across 462,943 channel descriptions.
- [Dating Telegram channels by ID](https://tgscope.io/rnd/telegram-channel-id-clock): how channel IDs map to creation periods.
