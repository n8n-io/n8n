#!/usr/bin/env python3
"""Parse MCP eval job logs into structured per-run records."""
import json, re, sys
from datetime import datetime

RUNS = {
    52: ("logs_52.txt", "tmp/rlbase-23622769"),
    51: ("logs_51.txt", "tmp/rlfix-on-23622769"),
    50: ("logs_50.txt", "tmp/rlfix-on-23622769"),
    39: ("logs_39.txt", "master"),
    38: ("logs_38.txt", "master"),
    31: ("logs_31.txt", "master"),
    30: ("logs_30.txt", "master"),
    29: ("logs_29.txt", "master"),
    28: ("logs_28.txt", "master"),
    27: ("logs_27.txt", "master"),
    26: ("logs_26.txt", "master"),
    25: ("logs_25.txt", "master"),
    24: ("logs_24.txt", "master"),
    22: ("logs_22.txt", "master"),
    21: ("logs_21.txt", "master"),
    19: ("logs_19.txt", "master"),
    18: ("logs_18.txt", "master"),
}

re_ts = re.compile(r"^(\S+Z) ")
re_args = re.compile(r"tsx evaluations/cli/index\.ts (.+)$")
re_build_ok = re.compile(r"\[([a-z0-9-]+)#(\d+)\] ok → (\w+)")
re_snapshot = re.compile(r"\[([a-z0-9-]+)\] wrote verifier snapshot: .*workflow-([a-z0-9]+)_")
re_verdict = re.compile(r"\[([a-z0-9-]+)\] (PASS|FAIL) (?:\[(\w+)\] )?verify=(\d+)s")
re_exec = re.compile(r"\[([a-z0-9-]+)\] exec=(\d+)s \((\d+) nodes\)")
re_meta = re.compile(r"Updated experiment metadata: (\{.*\})")
re_cases_sel = re.compile(r"lang-tracer: (\d+) case\(s\) after selection")
re_case_row = re.compile(r"^\s{4}([a-z0-9-]+)\s{2,}(\d+/\d+|notVerified|[^\s]+)\s{2,}(\d+)%\s+(\d+)%\s*$")
re_agg = re.compile(r"^\s+(PR|baseline)\s+([\d.]+)%\s+\(N=(\d+)\)")
re_delta = re.compile(r"^\s+Δ\s+([+-][\d.]+)pp")
re_head = re.compile(r"▶ (\d+) regressions · (\d+) likely regressions · (\d+) worth watching")
re_head2 = re.compile(r"(\d+) improvements · (\d+) stable · pass rate ([+-][\d.]+)pp vs baseline")
re_failcat = re.compile(r"^\s+(\w+)\s+(\d+) \((\d+\.\d)%\)\s+(\d+) \((\d+\.\d)%\)")
re_verifier_retry = re.compile(r"\[verifier\] attempt (\d)/3 failed")
re_mock_retry = re.compile(r"Mock generation failed .* retrying")

out = {}
for num, (path, branch) in RUNS.items():
    lines = open(path).read().split("\n")
    rec = {
        "run_number": num, "branch": branch, "args": None, "iterations": None,
        "filter": None, "cases_selected": None, "meta": None,
        "builds": [], "verdicts": [], "execs": [],
        "summary": {"case_rows": [], "agg": {}, "failcats": {}},
        "verifier_retries": 0, "mock_retries": 0,
    }
    wf2case = {}
    pending = {}  # scenario -> (wfid, ts)
    in_case_table = False
    for ln in lines:
        m = re_args.search(ln)
        if m:
            rec["args"] = m.group(1)
            im = re.search(r"--iterations (\d+)", ln)
            fm = re.search(r"--filter ([^\s]+)", ln)
            rec["iterations"] = int(im.group(1)) if im else None
            rec["filter"] = fm.group(1) if fm else None
        m = re_cases_sel.search(ln)
        if m: rec["cases_selected"] = int(m.group(1))
        m = re_build_ok.search(ln)
        if m:
            case, it, wfid = m.group(1), int(m.group(2)), m.group(3)
            wf2case[wfid.lower()] = (case, it)
            ts = re_ts.match(ln)
            rec["builds"].append({"case": case, "iter": it, "wfid": wfid, "ts": ts.group(1) if ts else None})
        m = re_snapshot.search(ln)
        if m:
            pending[m.group(1)] = m.group(2)
        m = re_verdict.search(ln)
        if m:
            scen, res, cat, vs = m.group(1), m.group(2), m.group(3), int(m.group(4))
            wfid = pending.pop(scen, None)
            case, it = wf2case.get(wfid, (None, None)) if wfid else (None, None)
            rec["verdicts"].append({"scenario": scen, "pass": res == "PASS", "category": cat,
                                    "verify_s": vs, "case": case, "iter": it})
        m = re_exec.search(ln)
        if m:
            rec["execs"].append({"scenario": m.group(1), "exec_s": int(m.group(2)), "nodes": int(m.group(3))})
        m = re_meta.search(ln)
        if m:
            try: rec["meta"] = json.loads(m.group(1))
            except Exception: pass
        if re_verifier_retry.search(ln): rec["verifier_retries"] += 1
        if re_mock_retry.search(ln): rec["mock_retries"] += 1
        # terminal summary
        stripped = re.sub(r"^\S+Z ", "", ln)
        m = re_head.search(stripped)
        if m: rec["summary"]["agg"].update(regressions=int(m.group(1)), likely=int(m.group(2)), watch=int(m.group(3)))
        m = re_head2.search(stripped)
        if m: rec["summary"]["agg"].update(improvements=int(m.group(1)), stable=int(m.group(2)), delta_pp=float(m.group(3)))
        m = re_agg.match(stripped)
        if m: rec["summary"]["agg"][m.group(1)] = {"rate": float(m.group(2)), "N": int(m.group(3))}
        if "Per-test-case results" in stripped:
            in_case_table = True; continue
        if in_case_table:
            m = re_case_row.match(stripped)
            if m:
                rec["summary"]["case_rows"].append({"case": m.group(1), "status": m.group(2),
                                                    "passAtK": int(m.group(3)), "passHatK": int(m.group(4))})
            elif rec["summary"]["case_rows"] and not stripped.strip().startswith(("─", "workflow")):
                if stripped.strip() and not re_case_row.match(stripped):
                    in_case_table = False
        m = re_failcat.match(stripped)
        if m and m.group(1) in ("builder_issue", "mock_issue", "framework_issue", "verifier_issue", "unknown"):
            rec["summary"]["failcats"][m.group(1)] = {"pr": int(m.group(2)), "pr_pct": float(m.group(3)),
                                                      "base": int(m.group(4)), "base_pct": float(m.group(5))}
    out[num] = rec

json.dump(out, open("parsed.json", "w"), indent=1)
for num in sorted(out, reverse=True):
    r = out[num]
    print(f"#{num} {r['branch']:<24} iter={r['iterations']} filter={r['filter']} cases={r['cases_selected']} "
          f"builds={len(r['builds'])} verdicts={len(r['verdicts'])} "
          f"unattributed={sum(1 for v in r['verdicts'] if v['case'] is None)} "
          f"case_rows={len(r['summary']['case_rows'])} meta={'y' if r['meta'] else 'N'} "
          f"vretry={r['verifier_retries']} mretry={r['mock_retries']}")
