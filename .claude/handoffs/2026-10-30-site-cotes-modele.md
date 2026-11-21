# Handoff 2026-10-30: site, odds, model state

## Done today (PR #8 to #13, all merged into master)

- Match list: 21 days instead of the first 100 matches (D63). Predictions over the same 21 days.
- Bug fixed: the daily workflow lost the model file after each run, so no prediction was made
  after 2026-10-29. Model retrained (routed_competition v2, accepted vs naive). 205/205 matches
  have probabilities on the site.
- The Odds API key works (secret `ODDS_API_KEY`). 14 competitions, once a day (morning).
  491 credits left on 2026-10-30. 132/205 matches had a bookmaker average; 17 aliases added
  (PR #12) for the next run. FA Cup, Copa del Rey, Coppa Italia, Coupe de France: not offered
  by The Odds API now (no credit spent). D64.
- football-data.co.uk fixtures.csv still listed 27-29/10 only: league odds come when it updates.
- Weekly e-mail: SMTP login failed ("Connection unexpectedly closed"). PR #13 removes spaces
  from the Gmail app password and retries on port 465. Manual workflow
  `util-football-intel-email-test.yml` sends one test e-mail. After a new Gmail app password,
  the test e-mail arrived (2026-10-30 15:09 UTC). First weekly PDF: Monday 2026-11-02.
- Upstream n8n checks skip football-intel-only changes (PR #14); 11 stuck CI: Master runs cancelled.

## Open

- betPawa odds: only OddsPapi (betPawa Cameroun, 250 req/month free); terms not verified;
  owner has not created a key. betPawa site terms forbid bots (art. 6.4.2).
