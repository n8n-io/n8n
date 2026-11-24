# X (Twitter) Algorithm Playbook

How the X "For You" feed ranks posts, based on xAI's open-sourced algorithm ([xai-org/x-algorithm](https://github.com/xai-org/x-algorithm), May 2026 release — the Phoenix ranker and Grox content-understanding pipeline), and what to change in your posting practice because of it.

**Sourcing note:** the release publishes the ranking *structure* (which signals are scored and how they combine) but not the weight *values* (`params.rs` is withheld). Rules below are tagged **[verified]** when the mechanism is visible in the code, **[reported]** when the specific number or magnitude comes from secondary analysis of the release. Structure changes slowly; reported numbers age fast — treat them as directionally true.

## How ranking works (60-second version)

1. Candidate posts come from two sources: accounts the viewer follows (Thunder) and ML-retrieved posts from the global corpus (Phoenix retrieval). You are always competing for out-of-network reach, not just your followers' feeds.
2. Filters remove ineligible posts *before* scoring: too old, already seen or served, muted keywords, blocked/muted authors.
3. The Phoenix transformer predicts a probability for each engagement type — not one "quality score" but ~15 separate predictions.
4. Final score = weighted sum of those probabilities. Positive actions add; predicted negative actions (not-interested, mute, block, report) subtract.
5. An author-diversity scorer then decays the scores of repeated authors within a feed response, so your posts compete with each other.

The model has no hand-engineered "quality" features — it learns entirely from engagement histories. You can't optimize for the algorithm directly; you optimize for the specific *behaviors* it predicts. And notice what those behaviors are: staying to read, sending to a friend, following the author, joining the conversation. Those are the things a well-told story produces. Storytelling and genuine connection with your audience aren't a separate strategy from the mechanics below — they're what the mechanics reward. The rules tune distribution; the story earns the engagement.

## The signals your post is scored on [verified]

Every signal below is a separate weighted term in the scoring code:

| Signal | What to notice |
|--------|---------------|
| Favorite (like) | The baseline — and the weakest lever, given how many other signals exist |
| Reply | Conversation-starting posts earn a distinct signal |
| Repost | Public amplification |
| Quote **and** quoted-click | Two separate terms: engagement on a quote post *and* clicks through to the quoted post both score |
| Click | Opening the post detail |
| Profile click | Clicking through to your profile is its own scored action |
| Share, share-via-DM, share-via-copy-link | **Three separate share signals** — private sharing is explicitly modeled, not lumped into one |
| Video quality view | Only paid if video duration exceeds a minimum threshold (`MIN_VIDEO_DURATION_MS`); short clips earn zero video credit |
| Dwell (two forms) | Time spent reading is scored both as a threshold and as continuous time |
| Photo expand | Tapping to enlarge an image |
| Follow author | A post that converts a viewer into a follower earns its own signal |
| Not interested / mute / block / report | **Negative weights** — the model predicts these too, and they subtract from your score |

## The 10 rules

1. **Open with a specific claim in the first 8 words.** [reported] Dwell is scored two ways [verified], and scroll-past is the dwell-killer. Don't warm up — the hook *is* the post.

2. **Wait ~60 minutes between original posts.** [reported number] The author-diversity scorer is verified: within a feed response, each additional post from the same author gets a decayed score. Clustered posts cannibalize each other's reach.

3. **Name your topic in the first 10 words.** [reported] Topic-based candidate sourcing and followed-topic hydration are verified in the pipeline — the algorithm routes posts to topic followers, but only if it can tell what the topic is. Vague musings don't get routed.

4. **Write for the DM-forward, not the like.** [verified structure; relative weight reported] Share-via-DM is its own scored signal. The test for every post: "would someone send this to a friend?" beats "would someone like this?"

5. **Quote tweets score twice.** [verified structure] Quote engagement and quoted-click are separate terms. Quoting with added insight beats plain reposting — for both parties.

6. **Write for the follow.** [verified structure] Follow-author is a distinct signal. Posts that make a stranger think "I want more of this" outperform posts that make them think "ha, nice."

7. **Make them curious enough to click your profile.** [verified structure] Profile clicks are scored. This is the mechanical argument for a strong bio and pinned post: the algorithm rewards posts that trigger the click, and your profile converts it.

8. **Name specific things.** [verified mechanism] Two reasons: specificity is what enables topic routing (rule 3), and the muted-keyword filter removes posts *pre-scoring* — generic engagement-bait phrases are commonly muted; specific nouns ("Claude", "Stripe") rarely are.

9. **Video must clear the minimum duration — with captions.** [verified mechanism; ~8s reported] The video-quality-view weight only applies above `MIN_VIDEO_DURATION_MS`. Below the threshold, video earns zero video credit. Captions serve the dwell signals (most viewing is muted).

10. **Be present for the first 30 minutes.** [reported] Early replies compound: each reply you answer is a fresh engagement event, and reply chains feed the dwell and conversation signals. Post when you can stay, not when the scheduler fires.

## What kills reach [verified]

- **Muted keywords** — filtered before scoring even happens. Spammy CTA phrases and rage-bait vocabulary are widely muted.
- **Predicted negative actions** — if your post pattern-matches to content people block, mute, or hit "not interested" on, it's penalized *before anyone acts*. Engagement bait doesn't just annoy humans; it's a modeled negative.
- **Posting bursts** — author-diversity decay (rule 2). Your second post in an hour starts handicapped.
- **Already-seen content** — reposting the same content quickly hits the previously-seen/served filters. Evergreen reruns need spacing.

## Caveats

- **Weights are unpublished.** Claims like "shares are worth N× likes" are inference, not source. The safe conclusion is which behaviors are scored *at all* — and that private shares, follows, profile clicks, and dwell each matter independently.
- **This ages fast.** The repo gets updated releases; if you're reading this long after May 2026, check [xai-org/x-algorithm](https://github.com/xai-org/x-algorithm) for changes before treating numbers as current.
- **These rules are X-specific.** The general principles (hook early, specificity, reply presence) travel to other platforms; the mechanics (60-minute spacing, quote-double-counting, video minimums) do not.
