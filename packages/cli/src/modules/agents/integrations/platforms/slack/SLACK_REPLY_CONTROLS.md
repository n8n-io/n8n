# Slack reply controls

Builders can enable **Only respond when @mentioned** in Channel Settings after
Slack setup. The setting belongs to the agent's Slack connection. It works with
managed and manual Slack apps.

## Behavior

The setting defaults to off for new and existing connections. An absent
`onlyRespondWhenMentioned` value preserves the existing behavior.

When the setting is on:

- A mention can start a conversation and subscribe its thread.
- Channel messages and group direct messages require a mention. This includes
  replies in subscribed threads.
- One-to-one direct messages continue to start and resume conversations without
  a mention.
- An untagged shared message does not fetch attachments, reset a session, enqueue
  agent work, or show a thinking status.
- Thread subscriptions remain saved. Turning the setting off restores automatic
  follow-up processing in those threads.
- A later mention reads the Slack thread history, within the existing limits,
  so the agent can use the messages that did not start work.

Save uses the existing channel update operation. For a published agent, it
rebuilds the connection with the saved settings. The rule then applies to new
messages, including messages in existing threads. Work that has already started
continues. For an unpublished agent, the saved rule takes effect on publish.

The rule controls replies to inbound messages. It does not restrict scheduled
work, outbound Slack tools, or approval actions. Access restrictions remain
separate from reply controls.

## Response sensitivity investigation

Recommendation: ship the deterministic mention-only option first. Investigate a
separate response sensitivity control for automatic follow-ups. Model sampling
temperature controls output variation. It does not reliably control whether the
agent replies.

A useful control needs a defined decision before the main agent starts work:

- Low sensitivity: respond only when the message clearly needs the agent.
- High sensitivity: respond when the agent can add useful information.
- Explicit mentions and one-to-one direct messages always proceed.
- Mention-only mode always blocks untagged shared messages, at every sensitivity.

Before adding a slider:

1. Collect a sanitized set of internal Slack conversations. Include direct
   questions, human conversation, acknowledgments, and ambiguous follow-ups.
2. Ask reviewers to mark which messages need an agent reply.
3. Compare the current optional-reply prompt with a separate relevance decision
   at several thresholds. Measure unwanted replies, missed replies, latency, and
   model cost.
4. Check that higher sensitivity consistently accepts more messages. A slider
   needs an ordered result that builders can predict.
5. Test the preferred approach with internal users. Define acceptable results
   before offering a public control.

Record the evaluation results and the proposed control in follow-up work.
Do not expose a slider until the thresholds have a useful, tested meaning.
