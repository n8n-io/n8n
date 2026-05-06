## Reporting a Vulnerability

If you discover a (suspected) security vulnerability, please report it through our [Vulnerability Disclosure Program](https://n8n.notion.site/n8n-vulnerability-disclosure-program).
Here's a full security/stability report for your apps:

---

## 🔍 Findings

### ⚠️ Unexpected Errors — `node` project

| Issue | Details | Risk |
|---|---|---|
| **NODE-3**: `TypeError: n is not a function` | 4 events, 4 users affected. Crash during `Sentry.init()` — a Sentry integration's `setupOnce()` receives a non-function. **Unhandled.** | 🟡 Medium |
| **NODE-4**: `TypeError: Cannot read properties of null (reading 'useState')` | 1 event in `NotificationProvider`. React hook called outside a valid component context. **Unhandled.** | 🟡 Medium |

---

### 🚨 Suspicious Traffic — Flagged IPs & Domains

From **NODE-3** events, errors came from **3 different IPs across 3 different domains** — including:
- `http://coalive.click/` — unknown/suspicious domain
- `https://bnowldvj32-lugaud6trq-ue.a.run.app/` — Google Cloud Run URL (could be a bot/scanner)
- `https://coachellablog-hrflgnd5.manus.space/` — unknown deployment

These IPs hit production and triggered unhandled crashes:
- `34.203.172.76` (AWS IP — likely a bot/crawler)
- `154.16.95.202` (suspicious residential/VPN IP)
- `2607:f8b0:4001:c47::9` (Google IPv6 — Googlebot or scanner)

---

### 📈 Traffic Spike — May 5–6

A large spike in HTTP traffic occurred on **May 5–6**, with ~2,500+ span events in 4h windows. Most traffic is internal (`/__manus__/logs`, `/api/trpc/webVitals.record`) — likely development tooling, not malicious.

---

## ✅ Recommendations

1. **NODE-3** — Fix the Sentry integration version mismatch causing `setupOnce()` to fail. Check that `routingInstrumentation` is a valid function before passing it.
2. **NODE-4** — Ensure `NotificationProvider` wraps components using `useState` properly at the React tree root.
3. **Block or rate-limit** requests from `coalive.click` and `34.203.172.76` if they're not legitimate users.
4. **Add `allowUrls`** to your Sentry config to filter noise from unknown domains hitting your app.
5. Consider setting up **Sentry Alerts** for unhandled errors and traffic anomalies.

Want me to help set up alerts or dig deeper into any of these?
