# Project memory (owner: benkas418)

Loaded in every Claude Code session on this repository. Update it when a decision,
a tool or a lesson must survive the session. Keep it under 150 lines.

## Owner and projects

- The owner writes in French; answer in French. Preferences: direct, verified results,
  honest limits, no automatic agreement.
- **Reports to the owner (2026-11-13: "Tes rapports, je ne les comprends pas")**: plain words,
  short sentences, few numbers. No jargon (log loss, ECE, PSI, IC, millième, calibration, edge).
  Say what happened, what it means for his bets, and what to do. One example beats a table.
- **football-intel/**: football prediction platform (Python, FastAPI, PostgreSQL).
  Source of truth: `football-intel/docs/DECISIONS.md` (D1–D86), `docs/RESULTS.md`,
  `docs/DATA_SOURCES.md`. Active model `routed_competition`; it equals the market and
  has no measured edge (CLV −2.5 % at average price, D54).
- **PitUp**: delivery marketplace in Lubumbashi (customers, partner shops, couriers).
  Not in this repository. Use the `prediction-modeling` skill for what to log.
- Work branches: `ccr-4d6bcf99-mmbgxo` and `claude/branche-higgsfield-974raq`; push both.

## Skills in .claude/skills (122) — pick by theme

38 come from master (marketingskills v2: copywriting, ad-creative, social, sms, offers,
referrals, onboarding, analytics, aso…; skill-creator, brainstorming, deep-research…).
Where names overlapped, master's newer version was kept. Main ones added by us:

| Theme | Skills |
|---|---|
| Agents, AI apps, automation | ai-agent-engineering, vercel-ai-sdk, activepieces-automation, agent-designer, agent-workflow-designer, rag-architect, senior-prompt-engineer |
| Claude Code itself | claude-code-workflow (+ Boris Cherny tips), karpathy-guidelines, fable-method (explicit only), deep-work-mode (our own), claude-agent-sdk-app (build own agents, e.g. Cassie) |
| Football data and models | football-data-sources, prediction-modeling, statistical-analyst, senior-data-scientist, experiment-designer, pandas-pro |
| Video (Higgsfield) | seedance-video (our own), html-reel, video-to-superprompt, video-content-strategist, cinematic-scroll-site |
| Marketing, copy, social | copywriting, copy-editing, content-strategy, content-humanizer, social-content, social-media-manager, social-media-analyzer, ad-creative, paid-ads, marketing-psychology, launch-strategy, referral-program, pricing-strategy, marketing-context, marketing-ideas |
| Growth, product (PitUp) | decision-council (our own: 5 views + verdict), page-cro, signup-flow-cro, onboarding-cro, churn-prevention, ab-test-setup, analytics-tracking, campaign-analytics, local-seo-manager, app-store-optimization, product-discovery, product-analytics, roast |
| Design, UI/UX, 3D | design-taste-frontend, no-ai-design-slop, audit-ai-design-slop, ui-design-system, ux-researcher-designer, landing-page, pricing-page, tailwindcss, gsap, animation-systems, build-awwwards-quality-sites, cinematic-scroll-storytelling, threejs, build-threejs-scroll-worlds, webgl-3d-object, 3d-orbit-inspect-demo, react-3d-web, design-first-ui-prompting |
| Code, data, deploy | python-pro, fastapi-expert, postgres-pro, sql-pro, database-designer, typescript-pro, javascript-pro, react-expert, nextjs-developer, react-native-expert, flutter-expert, api-designer, debugging-wizard, test-master, secure-code-guardian, devops-engineer, docker-development, ci-cd-pipeline-builder, data-quality-auditor |

Handoffs: skill `handoff-notes` writes notes to `.claude/handoffs/` (committed). Read the
newest one when the owner says "reprends où on s'est arrêtés". Project plugins
(`.claude/plugins/*`, incl. session-handoff) do NOT load in fresh cloud sessions.

## Repositories the owner sent (2026-10-29) and their status

| Repository | Status |
|---|---|
| Leonxlnx/taste-skill | Installed as design-taste-frontend |
| OneFootball scraper idea | Integrated in football-intel (D50) |
| openfootball/football.json, eddwebster/football_analytics, hudl/open-data, soccerdata, worldfootballR, understat | Evaluated; knowledge in football-data-sources; xG tested, no gain (D55) |
| tunjayoff/sofascore_scraper | Tool; Sofascore blocks cloud IPs; residential proxy approved (D56), needs `SOFASCORE_CLIENT__PROXY` |
| multica-ai/andrej-karpathy-skills, alirezarezvani, Jeffallan, MengTo skills | 74 MIT skills installed |
| ComposioHQ, Seedance skill repos (no licence) | Replaced by our own seedance-video; 3 Composio skills not kept |
| microsoft/ai-agents-for-beginners, bojieli/ai-agent-book | Distilled into ai-agent-engineering |
| shanraisshan/claude-code-best-practice | Distilled into claude-code-workflow |
| vercel/ai, activepieces, playcanvas/react, 3D portfolio, Astra prompt repos | Distilled into vercel-ai-sdk, activepieces-automation, react-3d-web, cinematic-scroll-site |
| UppuluriKalyani/ML-Nexus | Distilled into prediction-modeling (random splits = main mistake) |
| Alishahryar1/free-claude-code | Tool (proxy to other model providers); reinstall with the setup script |
| David-E-Kay/claude-session-handoff | Vendored in .claude/plugins (works locally only); replaced in cloud by skill handoff-notes |
| ww-w-ai/super-token-saver | Not enabled: injects instructions that force sub-agent delegation and edits ~/.claude/settings.json; its report command can publish a public gist. Install on a local machine only if wanted |
| sajidmahamud835/MarketSync-EA | Rejected: its "AI" returns random stop-loss/take-profit; would place real trades |
| DavidHDev/react-bits (2026-10-30), web-leb.com | Not vendored: React only, and its licence (MIT + Commons Clause) forbids redistributing the components, even ported, so not in this public repo. Usable in a private React app (PitUp) via `npx shadcn@latest add @react-bits/<Name>-JS-CSS`. web-leb: community snippets, no clear licence |
| github/spec-kit (2026-11-04) | Not installed here: our DECISIONS.md and PR process already cover it. MIT; worth using (`uv tool install specify-cli`) when a new app starts from zero, e.g. PitUp |
| nadimtuhin/claude-token-optimizer (2026-11-04) | Not used: its prune targets session notes we do not keep; startup docs here are ~7.7k tokens (n8n AGENTS.md 5.7k, upstream file we must not edit). Usage goes to long sessions and tool output |
| black-dash77/ora-mcp (2026-11-04) | Rejected: local SQLite memory, lost at each cloud container reset; its CLAUDE.md text ("never read a file without first consulting ORA") trades verification for stale memory |
| nextlevelbuilder/ui-ux-pro-max-skill (2026-11-04) | Installed as ui-ux-pro-max (MIT; core skill only, tests dropped). Use for UX checks (touch 44px, bottom nav ≤5, forms, a11y) via `scripts/search.py`; design-taste-frontend still decides the look when they disagree |
| dickwu/apple-design-skill (2026-11-04) | Not vendored: reproduces Apple's copyrighted HIG text with no licence. Clone to the scratchpad and read a page (tab bars, navigation) when needed |
| designmodo/Flat-UI, nexu-io/open-design, hendurhance/ui-ux (2026-11-04) | Not used. Flat-UI: 2013-2018 Bootstrap 3 kit. open-design: a 363 MB design-agent app with telemetry on by default and a paid cloud. ui-ux: a reading list whose book mirrors come from shadow libraries (Anna's Archive, LibGen): never copy those files |
| santmun/crear-agente (2026-11-04) | Not vendored: Spanish beginner course (LATAM tone, OpenAI) that would talk to the owner in Spanish. Its Cloudflare Workers cron-agent pattern is distilled into ai-agent-engineering (useful for PitUp automations) |
| Graphify-Labs/graphify (2026-11-06) | Installed: skill `/graphify` in .claude/skills/graphify; CLI `graphifyy` 0.9.103 via the setup script. Its Read/Grep hooks and root CLAUDE.md block were removed (hooks fail when the CLI is missing). Use on football-intel/, not on all of n8n. `graphify update <dir>` = local AST, no API cost |
| kalil0321/reverse-api-engineer (2026-11-12) | Not used for football: the missing data (betPawa, OneFootball history API, Understat, ESPN) is behind terms that forbid collection, and the tool's own rules say to respect them. MIT; fine for sites we own or have permission for (PitUp) |
| dcaribou/transfermarkt-datasets (2026-11-13) | Used once (CC0, frozen at 2026-07-06): line-ups for the rotation test D78. Download: `curl -LO https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/transfermarkt-datasets.duckdb` |
| SKZL-AI/boris-cherny-claude-code-playbook, Sahir619/fable-method, anthropics/claude-plugins-official (2026-11-16) | Installed: tips in claude-code-workflow/references; fable-method skill (MIT, made explicit-only); agent-sdk-dev turned into skill claude-agent-sdk-app (Apache-2.0). Other official plugins: `/plugin marketplace add anthropics/claude-plugins-official` on a local machine |
| anthropics/anthropic-sdk-typescript (2026-11-16) | Library, not a skill: `npm i @anthropic-ai/sdk` in the app that needs it (Cassie). Needs an API key, so a paid account |
| aiwithremy/claude-skills-llm-council, mrtooher/fable-mode (2026-11-16) | Not vendored (no licence). Ideas rewritten as our own skills decision-council and deep-work-mode; both run inline unless the owner asks for agents |
| DannyMac180/fable-advisor (2026-11-16) | Not installed: delegates work to subagents; its own measure shows about 2.8x the cost on small tasks |
| Braffolk/fable5-world-demo, SebLague/Path-Creator, mhgolkar/Arrow, ellisonleao/magictools, Roobyx/awesome-game-design, opencodeiiita/GamingSphere, hesreallyhim/awesome-claude-code (2026-11-16) | Not installed: game projects and link lists, not skills. 3D world demo (MIT, Three.js) distilled into threejs/references/procedural-world-lessons.md; Path-Creator is Unity; Arrow is a Godot narrative tool. GamingSphere has no licence; awesome-claude-code is CC BY-NC-ND |
| Austin1serb/Anthropic-Leaked-Source-Code (2026-11-16) | Refused, not downloaded: leaked proprietary code. Cassie is built on the official Claude Agent SDK instead |
| UXAspects/UXAspects, SixArm/ui-ux-design-guide, notsobigcompany/BigUIPaging (2026-11-17) | Not installed: Angular component library (our site is plain JS); a UI/UX glossary with no licence file (our design skills cover it); SwiftUI paging for iOS (only if PitUp gets a native iOS app). The site cleanup was done with our own design skills instead (D85) |
| higgsfield-ai/higgsfield, o3de, ai-agent frameworks lists | Not relevant (GPU training framework; game engine — owner may revisit) |
| 3641397194-wq/gpt6-Astra, claude-code-best/claude-code, asgeirtj/system_prompts_leaks | Refused: jailbreak injector with unknown relay; unauthorised reconstruction of proprietary code; leaked confidential prompts |

## Owner's betting habits (betPawa; stated 2026-10-30)

- Key days: Friday to Sunday. Bookmaker: betPawa. Main markets: first goal, 1UP/2UP, BTTS.
- Premier League: every match; bets on the team that scores first (or against the one that cracks first).
- Bundesliga: every match; BTTS and 1UP/2UP ("very open league": checked, 3.1-3.6 goals per match,
  60-71 % over 2.5; BTTS 57-62 %, no higher than the Premier League).
- Serie A: only Como, Inter, AC Milan, Bologna, Lazio (Bologna added 2026-10-30); first goal or 1UP.
- Liga: Barcelona, Real Madrid, Betis, Atletico Madrid, Villarreal.
- Ligue 1: only PSG. UEFA cups: to discuss later.
- Maintenance (2026-11-04): the owner declined a scheduled Claude Code guard task; do not create
  one again unless asked. Lecture du jour (D77) runs on GitHub Models for free (D78); an Anthropic key, if added later, takes over. The owner has no card for paid APIs: prefer free, keyless sources; a free football odds API blocked his key (2026-11-12).
- Always give the fair odds (1/p) and say that a bet has value only above them; the model has no
  proven edge over the market, BTTS is its weakest market, 1UP/FG assume goals in random order.

## National teams (D82)

Own model `models/national.py` (Elo + Poisson), data from martj42/international_results (CC0) and
the OneFootball calendar (`NATIONAL_SLUGS`). `INT-*` competitions are excluded from club data in
`load_matches`. New edition = new OneFootball id: find it with `onefootball.com/en/competition/x-<id>`
(redirects to the named page). Tickets (D83, D84): national matches with bookmaker prices, plus 25 named teams (`NATIONAL_ALWAYS`: DR Congo, big European, South American and African sides, USA, Mexico, Japan), priced or not.
`HOME_ABROAD` (Ukraine, Israel) plays home matches on neutral ground.

## Daily cycle trigger (D79)

GitHub stopped all scheduled runs of this repository on 2026-11-07. The daily cycle now starts
from Supabase: pg_cron job `football-intel-daily` (03:23 UTC) → `ops.dispatch_daily_cycle()` →
GitHub workflow_dispatch, with the Vault secret `github_dispatch_token` (fine-grained PAT, only
benkas418-alt/n8n, Actions read/write). **It expires 2027-02-11**: remind the owner in January.
Check failures in `net._http_response`. The n8n workflows are disabled; do not re-enable them.

## Tools outside the repository

The cloud container is reset between sessions. Reinstall the external tools with
`football-intel/scripts/claude-cloud-setup.sh` (or set it as the environment setup script).

## Lessons (do not repeat)

- `pkill -f`/`pgrep -f` with a pattern that also appears in the current command kills
  the current shell (exit 144). Find PIDs in one call, kill them in another.
- uv in the image is old (0.11): install a recent uv with pip in a venv for Python 3.14.
- sofascore_scraper crashes on Python 3.13 (`_ThreadHandle`); use Python 3.14.
- Big GitHub repos (hudl/open-data) stall through the proxy; fetch only needed folders.
- Shot/feature files change column names between seasons: check coverage per period.
- Environment setup script runs before the repo exists: it must be self-contained and end with `exit 0`.
- Never trust a "best price" CLV or a random-split score; compare on recent data.
- GitHub Actions: env paths use `github.workspace` (repo root) while `working-directory` steps
  use relative paths; keep both pointing to the same folder, and use `set -o pipefail` with tar.
  A mismatch lost the trained model after every run (fixed 2026-10-30, PR #10).
- After a cycle, check `last_prediction` and the step summary, not only the green run: the
  pipeline logs a failed step and still exits 0.
- Container restarts lose the local venv and Postgres: recreate the venv in the scratchpad,
  `service postgresql start`; the local model file lives in /tmp/claude-0/fi-run (run from there).

# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.
