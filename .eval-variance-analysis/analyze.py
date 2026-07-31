#!/usr/bin/env python3
import json, statistics as st
from collections import defaultdict

P = json.load(open("parsed.json"))

def meta(n): return P[str(n)].get("meta") or {}

print("="*100)
print("RUN-LEVEL OVERVIEW")
print("="*100)
hdr = f"{'run':>4} {'branch':<22} {'iter':>4} {'cases':>5} {'PR%':>6} {'dur_s':>7} {'avg_build_s':>11} {'avg_exec_s':>10} {'cost_usd':>8} {'avg_turns':>9} {'pass/iter'}"
print(hdr)
for n in [18,19,21,22,24,25,26,27,28,29,30,31,38,39,50,51,52]:
    r = P[str(n)]; m = meta(n)
    agg = r["summary"]["agg"].get("PR", {})
    print(f"{n:>4} {r['branch']:<22} {r['iterations']:>4} {r['cases_selected']:>5} "
          f"{agg.get('rate','?'):>6} {m.get('duration_s','?'):>7} {m.get('avg_build_s','?'):>11} "
          f"{m.get('avg_exec_s','?'):>10} {m.get('total_build_cost_usd','?'):>8} {m.get('avg_build_turns','?'):>9} "
          f" {m.get('pass_rate_per_iter','')}")

# ---------------- Group B: 7 same-config master iter=1 full-suite runs ----------
runsB = [18,19,21,22,24,25,26]
print()
print("="*100)
print("GROUP B: 7x master full-suite (23 cases, iterations=1) — unit-level pass matrix")
print("="*100)
# unit key = (case, kind, name)
units = defaultdict(dict)  # key -> run -> pass(bool)
casecat = defaultdict(lambda: defaultdict(list))  # case -> run -> fail categories
for n in runsB:
    for case, card in P[str(n)]["cards"].items():
        for u in card["units"]:
            key = (case, u["kind"], u["name"][:60])
            units[key][n] = u["pass"]
            if not u["pass"]:
                casecat[case][n].append(u["category"])

# per-case pass fraction per run
cases = sorted({k[0] for k in units})
print(f"\nPer-case unit pass fraction (passed/total units) per run:")
print(f"{'case':<38}" + "".join(f"{('#'+str(n)):>7}" for n in runsB) + f"{'spread':>8}")
case_spread = {}
for c in cases:
    fracs = []
    row = f"{c:<38}"
    for n in runsB:
        vals = [v[n] for k, v in units.items() if k[0] == c and n in v]
        f = sum(vals)/len(vals) if vals else None
        fracs.append(f)
        row += f"{(str(sum(vals))+'/'+str(len(vals))):>7}"
    spread = max(fracs) - min(fracs)
    case_spread[c] = spread
    row += f"{spread*100:>7.0f}pp"
    print(row)

print("\nMost unstable units (units that flip across the 7 runs):")
flips = []
for k, v in units.items():
    vals = [v[n] for n in runsB if n in v]
    if len(set(vals)) > 1:
        flips.append((k, sum(vals), len(vals)))
flips.sort(key=lambda x: min(x[1], x[2]-x[1]), reverse=True)
for (case, kind, name), p, t in flips:
    pat = "".join("P" if units[(case,kind,name)].get(n) else ("F" if n in units[(case,kind,name)] else "-") for n in runsB)
    print(f"  {case:<38} {kind:<12} {name[:45]:<47} {p}/{t} passes  [{pat}]")
print(f"\n  {len(flips)} of {len(units)} units flip at least once across the 7 runs")
stable_pass = sum(1 for k,v in units.items() if all(v.get(n) for n in runsB if n in v) and len(set(v.get(n) for n in runsB if n in v))==1)
stable_fail = sum(1 for k,v in units.items() if all(v.get(n)==False for n in runsB if n in v) and len(set(v.get(n) for n in runsB if n in v))==1)
print(f"  always-pass: {stable_pass}, always-fail: {stable_fail}, flipping: {len(flips)}")

# overall rate variance decomposition: contribution of flipping units
rates = []
for n in runsB:
    vals = [v[n] for v in units.values() if n in v]
    rates.append(sum(vals)/len(vals))
print(f"\nOverall unit pass-rate per run: {['%.1f%%' % (r*100) for r in rates]}")
print(f"  mean={st.mean(rates)*100:.1f}%  sd={st.pstdev(rates)*100:.2f}pp  range={min(rates)*100:.1f}-{max(rates)*100:.1f}%")

# contribution: each flipping unit contributes (max-min)=1 unit = 1/65 = 1.54pp potential
contrib = defaultdict(int)
for (case,kind,name),p,t in flips:
    contrib[case]+=1
print("\nFlip counts by case (each flip can move the headline by 1/65 = 1.5pp):")
for c, cnt in sorted(contrib.items(), key=lambda x:-x[1]):
    cats = set(cat for n in runsB for cat in casecat[c].get(n,[]) if cat)
    print(f"  {c:<38} {cnt} flipping unit(s)   fail categories seen: {sorted(cats)}")

# failure category totals across runs B
print("\nFailure-category counts per run (from cards):")
for n in runsB:
    cats = defaultdict(int)
    for case, card in P[str(n)]["cards"].items():
        for u in card["units"]:
            if not u["pass"]:
                cats[u["category"] or ("expectation" if u["kind"]=="expectation" else "?")] += 1
    print(f"  #{n}: {dict(cats)}")

# ---------------- Group C: 27 vs 28 (iter=5) ----------------
print()
print("="*100)
print("GROUP C: runs 27 vs 28 — master full-suite, iterations=5 (pass@5 / pass^5 per case)")
print("="*100)
rows27 = {r["case"]: r for r in P["27"]["summary"]["case_rows"]}
rows28 = {r["case"]: r for r in P["28"]["summary"]["case_rows"]}
print(f"{'case':<38}{'@5 #27':>7}{'@5 #28':>7}{'d@5':>6} |{'^5 #27':>7}{'^5 #28':>7}{'d^5':>6}")
d5s, dh5s = [], []
for c in sorted(set(rows27)|set(rows28)):
    a,b = rows27.get(c), rows28.get(c)
    if a and b:
        d5 = b["passAtK"]-a["passAtK"]; dh = b["passHatK"]-a["passHatK"]
        d5s.append(abs(d5)); dh5s.append(abs(dh))
        print(f"{c:<38}{a['passAtK']:>6}%{b['passAtK']:>6}%{d5:>+5}pp |{a['passHatK']:>6}%{b['passHatK']:>6}%{dh:>+5}pp")
print(f"\n mean |d pass@5| = {st.mean(d5s):.1f}pp ; mean |d pass^5| = {st.mean(dh5s):.1f}pp")

# per-iteration verdicts for 27/28
for n in (27, 28):
    per_iter = defaultdict(lambda: [0,0])
    for v in P[str(n)]["verdicts"]:
        if v["iter"] is not None:
            per_iter[v["iter"]][0] += v["pass"]
            per_iter[v["iter"]][1] += 1
    rates = {i: f"{100*p/t:.0f}% ({p}/{t})" for i,(p,t) in sorted(per_iter.items())}
    print(f" #{n} per-iteration scenario pass rates: {rates}")

# scenario-verdict-level case x iteration flip analysis for 27/28
print("\n Within-run iteration instability (cases whose scenario verdicts differ across the 5 builds), pooled over #27+#28:")
iter_instab = defaultdict(lambda: defaultdict(list))  # (run, case) -> scenario -> [pass by iter]
for n in (27,28):
    tmp = defaultdict(dict)
    for v in P[str(n)]["verdicts"]:
        if v["case"]:
            tmp[(v["case"], v["scenario"])][v["iter"]] = v["pass"]
    unstable = sorted({c for (c,s),d in tmp.items() if len(set(d.values()))>1})
    for c in unstable:
        pats = {s: "".join("P" if d.get(i) else "F" for i in range(5)) for (cc,s),d in tmp.items() if cc==c and len(set(d.values()))>1}
        print(f"  #{n} {c}: " + ", ".join(f"{s}=[{p}]" for s,p in pats.items()))

# ---------------- Group A: single-case runs ----------------
print()
print("="*100)
print("GROUP A: single-case (contact-form-automation, iterations=5) runs")
print("="*100)
print(f"{'run':>4} {'branch':<22} {'verdicts':>8} {'passed':>7} {'pass@5':>7} {'pass^5':>7} {'cost_usd':>8} {'turns':>6} {'avg_build_s':>11} {'avg_exec_s':>10} {'dur_s':>7}")
for n in [29,30,31,38,39,50,51,52]:
    r = P[str(n)]; m = meta(n)
    vs = r["verdicts"]; p = sum(v["pass"] for v in vs)
    row = r["summary"]["case_rows"][0] if r["summary"]["case_rows"] else {}
    print(f"{n:>4} {r['branch']:<22} {len(vs):>8} {p:>7} {row.get('passAtK','?'):>6}% {row.get('passHatK','?'):>6}% "
          f"{m.get('total_build_cost_usd','?'):>8} {m.get('avg_build_turns','?'):>6} {m.get('avg_build_s','?'):>11} {m.get('avg_exec_s','?'):>10} {m.get('duration_s','?'):>7}")
    fails = [v for v in vs if not v["pass"]]
    if fails:
        for v in fails:
            print(f"       FAIL iter={v['iter']} scenario={v['scenario']} cat={v['category']}")

# cost stats for group A masters
for label, ns in [("master 29-39", [29,30,31,38,39]), ("all single-case", [29,30,31,38,39,50,51,52])]:
    costs = [meta(n)["total_build_cost_usd"] for n in ns]
    builds = [meta(n)["avg_build_s"] for n in ns]
    execs = [meta(n)["avg_exec_s"] for n in ns]
    durs = [meta(n)["duration_s"] for n in ns]
    turns = [meta(n)["avg_build_turns"] for n in ns]
    print(f"\n {label}: cost mean={st.mean(costs):.2f} sd={st.pstdev(costs):.2f} cv={st.pstdev(costs)/st.mean(costs)*100:.0f}% range={min(costs)}-{max(costs)}")
    print(f"   avg_build_s mean={st.mean(builds):.0f} sd={st.pstdev(builds):.0f} range={min(builds)}-{max(builds)} | avg_exec_s mean={st.mean(execs):.0f} sd={st.pstdev(execs):.0f} | turns mean={st.mean(turns):.1f} range={min(turns)}-{max(turns)} | duration_s range={min(durs)}-{max(durs)}")

# ---------------- Cost / duration variance, full-suite ----------------
print()
print("="*100)
print("COST & DURATION (full-suite runs)")
print("="*100)
for label, ns in [("iter=1 (7 runs)", runsB), ("iter=5 (27,28)", [27,28])]:
    costs = [meta(n)["total_build_cost_usd"] for n in ns]
    durs = [meta(n)["duration_s"] for n in ns]
    builds = [meta(n)["avg_build_s"] for n in ns]
    execs = [meta(n)["avg_exec_s"] for n in ns]
    turns = [meta(n)["avg_build_turns"] for n in ns]
    print(f" {label}: total cost mean=${st.mean(costs):.0f} sd=${st.pstdev(costs):.1f} cv={st.pstdev(costs)/st.mean(costs)*100:.0f}% range=${min(costs)}-${max(costs)}")
    print(f"   duration_s mean={st.mean(durs):.0f} sd={st.pstdev(durs):.0f} range={min(durs)}-{max(durs)} | avg_build_s range={min(builds)}-{max(builds)} | avg_exec_s range={min(execs)}-{max(execs)} | turns range={min(turns)}-{max(turns)}")

# verify-time stats
print("\nVerifier time per verdict (s):")
for n in [18,24,27,28]:
    vt = [v["verify_s"] for v in P[str(n)]["verdicts"]]
    print(f"  #{n}: n={len(vt)} mean={st.mean(vt):.1f} median={st.median(vt)} p90={sorted(vt)[int(0.9*len(vt))]} max={max(vt)}")
# exec-time stats
print("Scenario exec time (s):")
for n in [18,24,27,28]:
    et = [e["exec_s"] for e in P[str(n)]["execs"]]
    print(f"  #{n}: n={len(et)} mean={st.mean(et):.0f} median={st.median(et)} max={max(et)}")

# infra markers
print()
print("="*100)
print("INFRA MARKERS")
print("="*100)
for n in [18,19,21,22,24,25,26,27,28,29,30,31,38,39,50,51,52]:
    r = P[str(n)]
    fw = sum(1 for v in r["verdicts"] if v["category"]=="framework_issue")
    print(f"  #{n}: verifier_retries={r['verifier_retries']} mock_retries={r['mock_retries']} framework_issue_verdicts={fw} "
          f"builds={len(r['builds'])}/{(r['cases_selected'] or 0)*(r['iterations'] or 1)} expected")
