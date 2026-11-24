"""Self-check for chapters.py. Run: python hooks/test_chapters.py"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

# A real model in the user's environment would let `record` spawn live summaries mid-test;
# the stub-server section below sets both back on purpose. Must run before `import chapters`.
for _var in ("CHAPTER_SUMMARY_MODEL", "CHAPTER_OLLAMA_URL"):
    os.environ.pop(_var, None)

sys.path.insert(0, str(Path(__file__).parent))
import chapters  # noqa: E402

HOOK = Path(__file__).with_name("chapters.py")
CWD = "C:/work/proj"
TS = "2026-09-26T10:00:00Z"


def user(content, **kw):
    return {"type": "user", "message": {"role": "user", "content": content},
            "cwd": CWD, "gitBranch": "feat", "timestamp": TS, **kw}


def asst(*blocks):
    return {"type": "assistant", "message": {"role": "assistant", "content": list(blocks)},
            "cwd": CWD, "gitBranch": "feat", "timestamp": TS}


def text(t):
    return {"type": "text", "text": t}


def tool(tid, name, **inp):
    return {"type": "tool_use", "id": tid, "name": name, "input": inp}


def result(tid, content, err=False):
    return user([{"type": "tool_result", "tool_use_id": tid, "content": content, "is_error": err}],
                toolUseResult={})


# --- Task 1: prompt classification ---
P = chapters.prompt_text
assert P(user("fix the bug")) == "fix the bug"
assert P(user([text("fix the bug")])) == "fix the bug"
assert P(user("<command-message>session-handoff</command-message>\n<command-name>/session-handoff</command-name>")) == "/session-handoff"
assert P(user("<command-name>/model</command-name><command-message>model</command-message><command-args>opus</command-args>")) == "/model opus"
assert P(user("<!-- attach -->\n> quoted\nmy question")).endswith("my question")
assert P(user('<scheduled-task name="tare-usage-report" file="x">\nbody')) == "scheduled: tare-usage-report"
assert P(user("<system-reminder>\nnote\n</system-reminder>\nreal ask")) == "real ask"
assert P(user("<system-reminder>\nnote only\n</system-reminder>")) is None
assert P(user("<task-notification>\n<summary>done</summary>")) is None
assert P(user("<local-command-stdout>Set model</local-command-stdout>")) is None
assert P(user([text("[Request interrupted by user]")])) is None
assert P(user([text("[Request interrupted by user for tool use]")])) is None
assert P(user("skill body", isMeta=True)) is None
assert P(user("summary", isCompactSummary=True)) is None
assert P(user("sub", isSidechain=True)) is None
assert P(result("t1", "file contents")) is None
assert P(user([{"type": "tool_result", "tool_use_id": "t1", "content": "x"}, text("extra")])) is None
assert P(asst(text("hi"))) is None
assert P(user("<unknown-tag>x</unknown-tag>")) is None
assert P(user('<pasted_content id="ab">\nstuff\n</pasted_content>\nmy note')).startswith("<pasted_content")
assert P(user("<!-- reply -->\n> quoted\nanswer")).endswith("answer")

# --- Task 1a: three-way classify; unknown shapes are named, never prompts ---
C = chapters.classify
IMG = {"type": "image", "source": {}}
assert C(user("fix the bug")) == ("prompt", "fix the bug", "")
assert C(result("t1", "x")) == C(asst(text("hi"))) == ("skip", "", "")
assert C(user("<system-reminder>\nnote only\n</system-reminder>")) == ("skip", "", "")
assert C(user("<task-notification>\n<summary>done</summary>")) == ("skip", "", "")
assert C(user("<odd-tag a=1>x</odd-tag>")) == ("unknown", "odd-tag", "<odd-tag a=1>x</odd-tag>")
assert C(user("<system-reminder>r</system-reminder>\n<odd>hi")) == ("unknown", "odd", "<odd>hi"), "sample drops reminders"
assert len(C(user("<odd>" + "y" * 300))[2]) == 200
assert C(user([IMG])) == ("unknown", "no-text", "image")
assert C(user([IMG, text("<system-reminder>r</system-reminder>")])) == ("unknown", "no-text", "image"), "image + reminder only"
assert C(user("")) == ("unknown", "no-text", "empty")
assert C(user("<command-args>x</command-args>"))[:2] == ("unknown", "command-args")
assert chapters.feed([], user([IMG])) is False, "an unknown shape never opens a chapter"

# --- Task 1: building chapters ---
chs = []
for e in [
    asst(text("before any prompt is ignored")),
    user("first ask"),
    asst(text("Looking."), tool("t1", "Read", file_path="a.py")),
    result("t1", "SECRET FILE BODY"),
    asst(tool("t2", "Edit", file_path="b.py"), tool("t3", "Bash", command="pytest -q")),
    result("t2", "ok"),
    result("t3", "boom", err=True),
    asst(tool("t4", "AskUserQuestion", questions=[{"question": "Which way?"}])),
    result("t4", 'User answered: "Which way?"="Left"'),
    user("<task-notification>\n<summary>build finished</summary>"),
    asst(text("Done. Chose left.")),
    user("second ask"),
    asst(text("Second answer.")),
]:
    chapters.feed(chs, e)

assert len(chs) == 2, chs
c = chs[0]
assert c["prompt"] == "first ask"
assert c["replies"] == ["Looking.", "Done. Chose left."], c["replies"]
assert [a["tool"] for a in c["actions"]] == ["Read", "Edit", "Bash", "AskUserQuestion", "task-notification"], c["actions"]
assert c["actions"][0]["arg"] == "a.py"
assert c["actions"][2] == {"tool": "Bash", "arg": "pytest -q", "tool_use_id": "t3", "failed": True}
assert c["actions"][3]["arg"] == "Which way?"
assert c["actions"][4]["arg"] == "build finished"
assert c["decisions"] == ['User answered: "Which way?"="Left"'], c["decisions"]
assert c["files"] == {"a.py": False, "b.py": True}, c["files"]
assert "SECRET FILE BODY" not in json.dumps(chs), "raw tool output must never be stored"
assert c["branch"] == "feat" and c["started_at"] == TS
assert chs[1]["prompt"] == "second ask" and chs[1]["replies"] == ["Second answer."]
assert chapters.feed(chs, asst(text("more"))) is True and chs[1]["replies"][-1] == "more"

# --- Task 2: store + record ---
def run(*args, payload=None, env=None, cwd=None):
    return subprocess.run([sys.executable, str(HOOK), *args], input=json.dumps(payload) if payload is not None else "",
                          capture_output=True, text=True, encoding="utf-8", timeout=30, env=env, cwd=cwd)


def write_lines(path, entries, mode="w"):
    with open(path, mode, encoding="utf-8") as f:
        for e in entries:
            f.write(json.dumps(e) + "\n")


import sqlite3  # noqa: E402

assert chapters.project_key("C:/work/proj/.claude/worktrees/topic-x") == chapters.project_key("C:/work/proj")
assert chapters.project_key("C:/work/proj/sub") != chapters.project_key("C:/work/proj")

with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    env = {**os.environ, "CHAPTER_INDEX_DB": str(tmp / "idx.db")}
    tr = tmp / "s1.jsonl"
    pay = {"hook_event_name": "Stop", "session_id": "s1", "transcript_path": str(tr), "cwd": CWD + "/.claude/worktrees/w"}

    write_lines(tr, [user("first ask"), asst(text("Did it. Then more."), tool("t1", "Edit", file_path="x.py")),
                     result("t1", "RAW")])
    r = run("record", payload=pay, env=env)
    assert r.returncode == 0 and r.stdout == "", (r.returncode, r.stdout, r.stderr)
    db = sqlite3.connect(tmp / "idx.db")
    rows = db.execute("SELECT id, project, prompt, revision, plain_line FROM chapters").fetchall()
    assert len(rows) == 1, rows
    assert rows[0][1] == chapters.project_key(CWD), rows
    assert rows[0][4] == '"first ask" — Did it. Files: x.py*', rows[0][4]
    assert "RAW" not in json.dumps(db.execute("SELECT * FROM chapters").fetchall())
    assert db.execute("SELECT tool FROM sessions WHERE session_id='s1'").fetchone()[0] == "claude"

    # Same chapter grows: updated in place, revision bumps, no duplicate.
    write_lines(tr, [asst(text("Finished."))], "a")
    run("record", payload=pay, env=env)
    rows = db.execute("SELECT id, revision, plain_line FROM chapters").fetchall()
    assert len(rows) == 1 and rows[0][1] == 2 and "Finished." in rows[0][2], rows

    # Re-running with nothing new changes nothing.
    run("record", payload=pay, env=env)
    assert db.execute("SELECT revision FROM chapters").fetchone()[0] == 2

    # A trailing partial line is deferred, not lost.
    with open(tr, "a", encoding="utf-8") as f:
        f.write(json.dumps(user("second ask"))[:20])
    run("record", payload=pay, env=env)
    assert db.execute("SELECT COUNT(*) FROM chapters").fetchone()[0] == 1
    with open(tr, "a", encoding="utf-8") as f:
        f.write(json.dumps(user("second ask"))[20:] + "\n")
    run("record", payload=pay, env=env)
    assert [r[0] for r in db.execute("SELECT prompt FROM chapters ORDER BY id")] == ["first ask", "second ask"]

    # Unknown shapes: logged, never a chapter; a repeat bumps the count; a no-op re-run does not.
    tr3 = tmp / "s3.jsonl"
    write_lines(tr3, [user("<odd-tag>x</odd-tag>"), user("real ask"), user([{"type": "image", "source": {}}])])
    pay3 = {**pay, "session_id": "s3", "transcript_path": str(tr3)}
    run("record", payload=pay3, env=env)
    write_lines(tr3, [user("<odd-tag>y</odd-tag>")], "a")
    run("record", payload=pay3, env=env)
    run("record", payload=pay3, env=env)
    assert dict(db.execute("SELECT shape, count FROM unknown_shapes")) == {"odd-tag": 2, "no-text": 1}
    assert db.execute("SELECT sample, session_id, reviewed FROM unknown_shapes WHERE shape='odd-tag'").fetchone() \
        == ("<odd-tag>x</odd-tag>", "s3", 0)
    assert [r[0] for r in db.execute("SELECT prompt FROM chapters WHERE session_id='s3'")] == ["real ask"]

    # Two writers at once on the same session: no duplicates.
    tr2 = tmp / "s2.jsonl"
    write_lines(tr2, [user(f"ask {i}") for i in range(30)])
    pay2 = {**pay, "session_id": "s2", "transcript_path": str(tr2)}
    procs = [subprocess.Popen([sys.executable, str(HOOK), "record"], stdin=subprocess.PIPE, env=env,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) for _ in range(2)]
    for p in procs:
        p.communicate(json.dumps(pay2).encode(), timeout=30)
    assert db.execute("SELECT COUNT(*) FROM chapters WHERE session_id='s2'").fetchone()[0] == 30

    # Garbage payload / missing transcript: exit 0, silent.
    assert run("record", payload={"session_id": "x", "transcript_path": str(tmp / "nope.jsonl")}, env=env).returncode == 0
    r = subprocess.run([sys.executable, str(HOOK), "record"], input="not json", capture_output=True, text=True, env=env)
    assert r.returncode == 0 and r.stdout == "", r.stdout

    # A transcript with no recognisable lines is logged, not recorded.
    bad = tmp / "bad.jsonl"
    bad.write_text("garbage\nmore garbage\n", encoding="utf-8")
    run("record", payload={**pay, "session_id": "bad", "transcript_path": str(bad)}, env=env)
    assert "bad" in (tmp / "chapter-index.log").read_text(encoding="utf-8")

    # A malformed line (bare string in a content list) is logged as a parse error, not fatal:
    # the good chapter before it still lands and the offset still advances.
    tr4 = tmp / "s4.jsonl"
    write_lines(tr4, [user("real ask"), asst("oops")])
    pay4 = {**pay, "session_id": "s4", "transcript_path": str(tr4)}
    run("record", payload=pay4, env=env)
    row4 = db.execute("SELECT offset FROM sessions WHERE session_id='s4'").fetchone()
    assert row4 and row4[0] == tr4.stat().st_size, row4
    assert [r[0] for r in db.execute("SELECT prompt FROM chapters WHERE session_id='s4'")] == ["real ask"]
    assert any(sh.startswith("parse-error:") for sh, in db.execute("SELECT shape FROM unknown_shapes"))

    # A stale saved offset is logged, not silently skipped: the transcript shrank, or the session's file moved.
    log = tmp / "chapter-index.log"
    text_now = log.read_text(encoding="utf-8")
    assert "shorter than" not in text_now and "path changed" not in text_now, "normal runs above never trip it"
    write_lines(tr4, [user("x")])
    run("record", payload=pay4, env=env)
    assert "shorter than" in log.read_text(encoding="utf-8")
    moved = tmp / "moved.jsonl"
    write_lines(moved, [user("real ask"), asst("oops"), user("next ask")])
    run("record", payload={**pay4, "transcript_path": str(moved)}, env=env)
    run("record", payload={**pay4, "transcript_path": str(moved)}, env=env)
    assert log.read_text(encoding="utf-8").count("path changed") == 1, "logged once, when it changes"
    db.close()

# --- Task 3: lookup ---
with tempfile.TemporaryDirectory() as tmp:  # lookups against a missing database create nothing
    env = {**os.environ, "CHAPTER_INDEX_DB": str(Path(tmp) / "none.db")}
    for args in (["list"], ["show", "1"], ["output", "1", "1"], ["status"], ["unknowns"],
                 ["unknowns", "--mark-reviewed", "x"]):
        r = run(*args, env=env)
        assert r.returncode == 0 and r.stdout.strip() == "No chapters recorded yet.", (args, r.stdout, r.stderr)
    assert run("summary", "s1", env=env).stdout.strip() == "null"
    assert os.listdir(tmp) == [], os.listdir(tmp)

with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    env = {**os.environ, "CHAPTER_INDEX_DB": str(tmp / "idx.db")}
    proj = tmp / "proj"
    proj.mkdir()
    tr = tmp / "s1.jsonl"
    write_lines(tr, [
        {**user("first ask"), "cwd": str(proj)},
        asst(text("Reading."), tool("t1", "Read", file_path="a.py")),
        result("t1", "A" * 5000),
        asst(text("Done first.")),
        {**user("second ask"), "cwd": str(proj)},
        asst(text("x" * 7000)),
    ])
    run("record", payload={"session_id": "s1", "transcript_path": str(tr), "cwd": str(proj)}, env=env)

    out = run("list", env=env, cwd=str(proj)).stdout
    assert "Session 2026-09-26 (feat)" in out, out
    assert out.index("#1") < out.index("#2"), out
    assert '"first ask" — Done first. Files: a.py' in out, out
    assert run("list", env=env, cwd=str(tmp)).stdout.strip() == "No chapters recorded for this project.", "other project must be empty"
    assert "#1" in run("list", "--all-projects", env=env, cwd=str(tmp)).stdout

    show = run("show", "1", env=env).stdout
    assert "Prompt: first ask" in show and " 1. Read a.py" in show and "Done first." in show, show
    assert "AAAA" not in show, "show must not include raw output"
    long = run("show", "2", env=env).stdout
    assert "[truncated — use --full]" in long and len(long) < 6500, len(long)
    assert "[truncated" not in run("show", "2", "--full", env=env).stdout

    sm = json.loads(run("summary", "s1", env=env).stdout)
    assert sm["id"] == 2 and sm["revision"] == 1 and sm["ai_line"] is None and sm["plain_line"].startswith('"second ask"'), sm
    assert run("summary", "nope", env=env).stdout.strip() == "null"

    tu = tmp / "u.jsonl"
    write_lines(tu, [{**user("<odd-tag>q</odd-tag>"), "cwd": str(proj)}])
    run("record", payload={"session_id": "u", "transcript_path": str(tu), "cwd": str(proj)}, env=env)
    u = run("unknowns", env=env).stdout
    assert "odd-tag  x1" in u and "session u" in u and "<odd-tag>q</odd-tag>" in u, u
    assert "Unknown shapes awaiting review: 1" in run("status", env=env).stdout
    assert run("unknowns", "--mark-reviewed", "odd-tag", env=env).stdout.strip() == "Marked odd-tag as reviewed."
    assert "odd-tag" not in run("unknowns", env=env).stdout
    assert "(reviewed)" in run("unknowns", "--all", env=env).stdout
    assert "Unknown shapes awaiting review: 0" in run("status", env=env).stdout

    o = run("output", "1", "1", env=env).stdout
    assert o.startswith("AAA") and "[truncated at 3000 chars]" in o and len(o) < 3100, o[:50]
    tr.unlink()
    assert "no longer exists" in run("output", "1", "1", env=env).stdout
    assert "No such chapter" in run("show", "99", env=env).stdout

    st = run("status", env=env).stdout
    assert "Last recorded:" in st and "Recent errors: none" in st, st
    (tmp / "chapter-index.log").write_text("2999-01-01T00:00:00 ERROR boom\n", encoding="utf-8")
    assert run("list", "--all-projects", env=env).stdout.startswith("WARNING: recording has failed"), "warning line"
    assert run("summary", "s1", env=env).stdout.startswith("{"), "summary stays pure JSON"
    assert "boom" in run("status", env=env).stdout

# --- Task 3 fix round 1: a broken DB must not be swallowed silently ---
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    dbfile = tmp / "idx.db"
    dbfile.touch()  # 0-byte file: sqlite opens it fine but it has no tables
    env = {**os.environ, "CHAPTER_INDEX_DB": str(dbfile)}
    r = run("status", env=env)
    assert r.returncode == 0 and r.stdout.strip() and "Lookup failed" in r.stdout, r
    r = run("summary", "any-id", env=env)
    assert r.returncode == 0 and r.stdout.strip() == "null", r
    r = run("list", env=env)
    assert r.returncode == 0 and "Lookup failed" in r.stdout, r
    assert not (tmp / "chapter-index.log").exists(), "lookup failures must not look like recording failures"

# --- Task 4: import + rebuild ---
with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    env = {**os.environ, "CHAPTER_INDEX_DB": str(tmp / "idx.db")}
    root = tmp / "projects"
    for proj, sid in (("p1", "a1"), ("p2", "b1")):
        (root / proj / sid).mkdir(parents=True)  # subagent transcripts live in a subfolder: never imported
        write_lines(root / proj / f"{sid}.jsonl", [user(f"ask {sid}"), asst(text("Done."))])
        write_lines(root / proj / sid / "agent-x.jsonl", [user("SUBAGENT ask"), asst(text("sub"))])
    r = run("import", str(root), env=env)
    assert r.returncode == 0 and r.stdout.strip() == "Imported 2 transcripts: 2 chapters written.", r
    r = run("import", str(root), env=env)
    assert r.stdout.strip() == "Imported 2 transcripts: 0 chapters written.", r  # re-run is a no-op
    con = sqlite3.connect(tmp / "idx.db")
    assert con.execute("SELECT COUNT(*) FROM chapters").fetchone()[0] == 2
    assert not con.execute("SELECT 1 FROM chapters WHERE prompt LIKE 'SUBAGENT%'").fetchone()
    con.close()
    assert run("rebuild", "a1", env=env).stdout.strip() == "Rebuilt 1 sessions: 1 chapters written."
    assert run("rebuild", "nope", env=env).stdout.strip() == "No recorded session nope."

    # rebuild under a changed rule: in-process, so the rule can change between record and rebuild
    tr = root / "p1" / "r1.jsonl"
    write_lines(tr, [user("keep this"), asst(text("A.")), user("zz later"), asst(text("B.")), user("<odd-tag> x"),
                     user("<new-tag> y")])
    saved = chapters.DB_PATH, chapters.LOG_PATH, chapters.NOT_PROMPTS
    chapters.DB_PATH, chapters.LOG_PATH = tmp / "idx.db", tmp / "chapter-index.log"  # never the real DB
    try:
        assert len(chapters.record({"session_id": "r1", "transcript_path": str(tr)})) == 2
        con = sqlite3.connect(tmp / "idx.db")
        with con:  # pretend new-tag was never seen: rebuild must still log it (invariant 7)
            con.execute("DELETE FROM unknown_shapes WHERE shape='new-tag'")
        con.close()
        chapters.NOT_PROMPTS = saved[2] + ("zz",)  # the changed rule: "zz ..." is no longer a prompt
        out = chapters.cmd_rebuild("r1", False)
        assert out == "Rebuilt 1 sessions: 1 chapters written.", out
        con = sqlite3.connect(tmp / "idx.db")
        rows = con.execute("SELECT prompt, replies FROM chapters WHERE session_id='r1'").fetchall()
        assert rows == [("keep this", json.dumps(["A.", "B."]))], rows
        assert con.execute("SELECT count FROM unknown_shapes WHERE shape='odd-tag'").fetchone()[0] == 1, "no double count"
        assert con.execute("SELECT count FROM unknown_shapes WHERE shape='new-tag'").fetchone() == (1,), "new shape logged"
        con.close()
        (root / "p2" / "b1.jsonl").unlink()
        out = chapters.cmd_rebuild(None, True)
        assert "Left untouched (transcript gone): b1" in out and "Rebuilt 2 sessions" in out, out
        con = sqlite3.connect(tmp / "idx.db")
        assert con.execute("SELECT prompt FROM chapters WHERE session_id='b1'").fetchone() == ("ask b1",)
        con.close()
    finally:
        chapters.DB_PATH, chapters.LOG_PATH, chapters.NOT_PROMPTS = saved

# --- Task 5: the length-warning hook's fixed line is not part of the reply ---
def hook(content):
    return {"type": "attachment", "attachment": {"type": "hook_success", "hookEvent": "UserPromptSubmit",
            "content": content}, "cwd": CWD, "timestamp": TS}


WARN = "⚠️ Context check: 150k tokens used. Consider running a session handoff, then /compact or a fresh session."
chs = []
for e in (user("warned ask"), hook("[CONTEXT WARNING] Context is at 150k"), asst(text(WARN + "\n\nReal answer. More.")),
          asst(text(WARN + "\n\nSecond.")),
          user("unwarned ask"), asst(text(WARN + "\n\nKept: no hook fired.")),
          user("warned, reworded"), hook("[CONTEXT WARNING] Context is at 160k"), asst(text("Heads up, long chat.\n\nX.")),
          user("other hook"), hook("[PROSE STYLE] ..."), asst(text(WARN + "\n\nY."))):
    chapters.feed(chs, e)
assert chs[0]["replies"][0] == "Real answer. More.", chs[0]["replies"]
assert chs[0]["replies"][1:] == [WARN + "\n\nSecond."], "only the first reply after the hook is trimmed"
assert chs[1]["replies"] == [WARN + "\n\nKept: no hook fired."], "no hook, no trim"
assert chs[2]["replies"] == ["Heads up, long chat.\n\nX."], "hook fired but no fixed line: nothing removed"
assert chs[3]["replies"][0].startswith(WARN), "a different hook does not count"
chs = []
for e in (user("only the warning"), hook("[CONTEXT WARNING] x"), asst(text(WARN)), asst(text("Done."))):
    chapters.feed(chs, e)
assert chs[0]["replies"] == ["Done."], chs[0]["replies"]

# --- Task 5: Ollama summary lines ---
import http.server  # noqa: E402
import threading  # noqa: E402
import time  # noqa: E402


class Stub(http.server.BaseHTTPRequestHandler):
    answer, delay, bodies, during = "Added the import command", 0, [], None

    def do_POST(self):
        Stub.bodies.append(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
        time.sleep(Stub.delay)
        if Stub.during:
            Stub.during()
        out = json.dumps({"response": Stub.answer}).encode()
        self.send_response(200)
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Stub)
threading.Thread(target=srv.serve_forever, daemon=True).start()
STUB = f"http://127.0.0.1:{srv.server_port}"


def ai(db, cid):
    con = sqlite3.connect(db)
    try:
        return con.execute("SELECT ai_line FROM chapters WHERE id=?", (cid,)).fetchone()[0]
    finally:
        con.close()


with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    db, tr = tmp / "idx.db", tmp / "s5.jsonl"
    write_lines(tr, [user("summarise me"), asst(text("x " * 5000), tool("t1", "Edit", file_path="a.py")),
                     user("second"), asst(text("B."))])
    saved = chapters.DB_PATH, chapters.LOG_PATH, chapters.SUMMARY_MODEL, chapters.OLLAMA_URL
    chapters.DB_PATH, chapters.LOG_PATH = db, tmp / "chapter-index.log"  # never the real DB
    chapters.OLLAMA_URL = STUB
    try:
        (c1, r1), (c2, r2) = chapters.record({"session_id": "s5", "transcript_path": str(tr)})
        chapters.SUMMARY_MODEL = ""  # invariant 5: no model, no request
        assert chapters.summarise(c1, r1) is False and not Stub.bodies and ai(db, c1) is None
        chapters.SUMMARY_MODEL = "m"
        Stub.answer = "  "
        assert chapters.summarise(c1, r1) is False and ai(db, c1) is None, "a blank answer is still rejected"
        Stub.answer = "  Added the import command \n"
        assert chapters.summarise(c1, r1 - 1) is False and ai(db, c1) is None, "stale revision never written"

        def grow():  # the chapter gets a new revision while the model is still answering
            con = sqlite3.connect(db)
            with con:
                con.execute("UPDATE chapters SET revision=revision+1 WHERE id=?", (c1,))
            con.close()
        Stub.during = grow
        assert chapters.summarise(c1, r1) is False and ai(db, c1) is None, "revision moved during the call"
        Stub.during, r1 = None, r1 + 1
        assert chapters.summarise(c1, r1) is True and ai(db, c1) == "Added the import command"
        b = Stub.bodies[-1]
        assert b["model"] == "m" and b["stream"] is False and "summarise me" in b["prompt"] and "Edit a.py" in b["prompt"], b
        assert "routine reminder" in b["prompt"], "the model is told the length warning is not the work"
        assert len(b["prompt"]) <= 4500, len(b["prompt"])  # ~4000-char cap on what is sent
        chapters.OLLAMA_URL = "http://127.0.0.1:9"  # nothing listens: silent failure, plain_line stays
        assert chapters.summarise(c2, r2) is None and ai(db, c2) is None, "None = model not reached"
        assert not (tmp / "chapter-index.log").exists(), "a summary failure is not a recording failure"
        chapters.OLLAMA_URL = STUB
        Stub.answer = "**Work Done:** Added the import command.\n\n- More detail."  # a rule-breaking answer is cleaned, not lost
        assert chapters.cmd_summarise_missing() == "Summarised 1 of 1 chapters.", "fills only lines still missing"
        assert ai(db, c2) == "Added the import command.", ai(db, c2)
        con = sqlite3.connect(db)
        with con:  # a chapter that grows gets a new revision; its old ai_line no longer describes it
            con.execute("UPDATE chapters SET ai_line='old' WHERE id=?", (c2,))
        con.close()
        write_lines(tr, [asst(text("C."))], mode="a")
        assert chapters.record({"session_id": "s5", "transcript_path": str(tr)})[0][0] == c2
        assert ai(db, c2) is None, "growth clears the stale ai_line"
        write_lines(tr, [user(f"more {i}") for i in range(4)], mode="a")
        chapters.record({"session_id": "s5", "transcript_path": str(tr)})
        Stub.answer = "  "  # rejected answers are normal, so they never stop a backfill
        assert chapters.cmd_summarise_missing() == "Summarised 0 of 5 chapters."
        chapters.OLLAMA_URL = "http://127.0.0.1:9"  # but an unreachable model stops it, not ~40 silent minutes
        out = chapters.cmd_summarise_missing()
        assert out.startswith("Stopped after 3 of 5 chapters"), out
    finally:
        chapters.DB_PATH, chapters.LOG_PATH, chapters.SUMMARY_MODEL, chapters.OLLAMA_URL = saved

    # end to end: the Stop hook returns at once and a detached process writes ai_line later
    env = {**os.environ, "CHAPTER_INDEX_DB": str(db), "CHAPTER_OLLAMA_URL": STUB}
    env.pop("CHAPTER_SUMMARY_MODEL", None)
    Stub.bodies.clear()
    write_lines(tr, [user("third, no model"), asst(text("D."))], mode="a")
    r = run("record", payload={"session_id": "s5", "transcript_path": str(tr)}, env=env)
    assert r.returncode == 0 and r.stdout == "", r
    con = sqlite3.connect(db)
    c3 = con.execute("SELECT MAX(id) FROM chapters").fetchone()[0]
    con.close()
    Stub.answer, Stub.delay = "Ran the fourth step", 3
    write_lines(tr, [user("fourth"), asst(text("E."))], mode="a")
    t0 = time.time()
    r = run("record", payload={"session_id": "s5", "transcript_path": str(tr)}, env={**env, "CHAPTER_SUMMARY_MODEL": "m"})
    assert r.returncode == 0 and r.stdout == "" and time.time() - t0 < 2.5, (r, time.time() - t0)  # never waits on Ollama
    c4 = c3 + 1
    for _ in range(100):
        if ai(db, c4):
            break
        time.sleep(0.1)
    assert ai(db, c4) == "Ran the fourth step", "detached summarise wrote the line"
    assert ai(db, c3) is None and len(Stub.bodies) == 1, "no model set: nothing was asked"
    Stub.delay = 0
srv.shutdown()

# clean_line: shapes seen from the real model (qwen2.5:1.5b) that used to be thrown away
L = chapters.clean_line
assert L("two\nlines") == "two"
assert L("\n  **Work Done:** Replied to it.\n\n- more") == "Replied to it."
assert L("**Work Done in Turn:** Ran it.") == "Ran it."
assert L("**Work Description:** Resumed it.") == "Resumed it."
assert L("- **Archive four stale sessions:** Found four.") == "Archive four stale sessions: Found four.", "real content kept"
assert L("Fixed it. " + "y " * 150) == "Fixed it.", "over the cap: first sentence"
assert L("Short one. Second one.") == "Short one. Second one.", "under the cap: kept whole"
assert L("z" * 250) == "z" * 199 + "…", "one long sentence: cut at 200"
assert L("  \n ") == ""

print("ok")
