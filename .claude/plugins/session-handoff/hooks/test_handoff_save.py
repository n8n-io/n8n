"""Self-check for handoff-save.py. Run: python hooks/test_handoff_save.py"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

HOOK = Path(__file__).with_name("handoff-save.py")


def handoff(mem_dir, title="Cost fix", pick="Run the end-to-end test."):
    return (
        f"<!-- handoff-memory-dir: {mem_dir} -->\n"
        f"# Session Handoff — {title}\n\n"
        "## Where it started\nSomething.\n\n"
        f"## Pick up here\n{pick}\nSecond line.\n"
    )


def run(payload):
    return subprocess.run(
        [sys.executable, str(HOOK)], input=json.dumps(payload),
        capture_output=True, text=True, encoding="utf-8", timeout=30,
    )


def handoffs(mem):
    return sorted(mem.glob("handoff-*.md"))


with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)
    mem = tmp / "memory"
    mem.mkdir()
    (mem / "MEMORY.md").write_text(
        "- [Topic](project_x.md) — keep me\n"
        "- [Latest session handoff, 2026-01-01](handoff-2026-01-01-0900.md) — old\n"
        "- [Other](feedback_y.md) — keep me too\n",
        encoding="utf-8",
    )

    # 1. Final message passed directly in the payload.
    r = run({"hook_event_name": "Stop", "last_assistant_message": handoff(mem)})
    assert r.returncode == 0, r.stderr
    files = handoffs(mem)
    assert len(files) == 1, files
    body = files[0].read_text(encoding="utf-8")
    assert body.startswith(f"---\nname: {files[0].stem}\ndescription: Session handoff — Cost fix\n"), body
    assert "handoff-memory-dir" not in body, "marker must be stripped"
    assert "# Session Handoff — Cost fix" in body
    index = (mem / "MEMORY.md").read_text(encoding="utf-8").splitlines()
    assert index[0] == "- [Topic](project_x.md) — keep me", index
    assert index[2] == "- [Other](feedback_y.md) — keep me too", index
    assert sum("](handoff-" in l for l in index) == 1, index
    assert f"]({files[0].name}) — prior session summary. Pick up here: Run the end-to-end test. Second line." in index[1], index
    assert "saved" in r.stdout, r.stdout

    # 2. Second handoff in the same minute must not overwrite the first.
    r = run({"hook_event_name": "Stop", "last_assistant_message": handoff(mem, "Again", "Next.")})
    assert len(handoffs(mem)) == 2, handoffs(mem)
    index = (mem / "MEMORY.md").read_text(encoding="utf-8")
    assert index.count("](handoff-") == 1 and "Pick up here: Next." in index, index

    # 3. No payload field: fall back to the transcript's last assistant reply.
    transcript = tmp / "t.jsonl"
    lines = [
        {"type": "user", "message": {"role": "user", "content": "session handoff"}},
        {"type": "assistant", "requestId": "r1", "message": {"role": "assistant", "content": [{"type": "thinking", "thinking": ""}]}},
        {"type": "assistant", "requestId": "r1", "message": {"role": "assistant", "content": [{"type": "text", "text": handoff(mem, "From transcript", "T.")}]}},
    ]
    transcript.write_text("\n".join(json.dumps(l) for l in lines), encoding="utf-8")
    run({"hook_event_name": "Stop", "transcript_path": str(transcript)})
    assert len(handoffs(mem)) == 3
    assert "Pick up here: T." in (mem / "MEMORY.md").read_text(encoding="utf-8")

    # 4. Ordinary replies are ignored, including ones that merely mention a handoff.
    for text in ["All done.", "# Session Handoff — no marker\n## Pick up here\nx", "see <!-- handoff-memory-dir: x --> later"]:
        r = run({"hook_event_name": "Stop", "last_assistant_message": text})
        assert r.returncode == 0 and r.stdout == "", (text, r.stdout)
    assert len(handoffs(mem)) == 3

    # 5. MEMORY.md missing: created with just the pointer.
    mem2 = tmp / "fresh"
    mem2.mkdir()
    run({"hook_event_name": "Stop", "last_assistant_message": handoff(mem2)})
    assert (mem2 / "MEMORY.md").read_text(encoding="utf-8").count("](handoff-") == 1

    # 6. Exact strings and ruled-out entries are saved byte for byte, and stay out of the pointer.
    mem3 = tmp / "exact"
    mem3.mkdir()
    exact = "`Error: ENOENT: no such file, open 'C:\\Users\\x\\a b.json'` — from `npm run build` | 2>&1"
    text = (
        f"<!-- handoff-memory-dir: {mem3} -->\n"
        "# Session Handoff — Exact\n\n"
        f"## Exact strings\n- {exact}\n\n"
        "## Tried and ruled out\n- Pinning node 18 — still fails (2026-10-10)\n\n"
        "## Pick up here\nFix the path.\n"
    )
    run({"hook_event_name": "Stop", "last_assistant_message": text})
    saved = handoffs(mem3)[0].read_text(encoding="utf-8")
    assert f"- {exact}\n" in saved and "(2026-10-10)" in saved, saved
    pointer = (mem3 / "MEMORY.md").read_text(encoding="utf-8")
    assert pointer.endswith("Pick up here: Fix the path.\n") and "ENOENT" not in pointer, pointer

    # 7. The commit the working folder is on goes into the frontmatter.
    def git(*args, cwd):
        return subprocess.run(["git", *args], cwd=cwd, input="", capture_output=True, text=True, check=True).stdout.strip()

    repo = tmp / "repo"
    repo.mkdir()
    git("init", "-q", cwd=repo)
    # commit-tree, not commit: a global hooks path on the maintainer's machine must not run here.
    tree = git("mktree", cwd=repo)  # empty input -> empty tree
    sha = git("-c", "user.name=t", "-c", "user.email=t@example.com", "commit-tree", tree, "-m", "init", cwd=repo)
    git("update-ref", "HEAD", sha, cwd=repo)
    mem4 = tmp / "commit"
    mem4.mkdir()
    top = git("rev-parse", "--show-toplevel", cwd=repo)
    run({"hook_event_name": "Stop", "cwd": str(repo), "last_assistant_message": handoff(mem4)})
    saved = handoffs(mem4)[0].read_text(encoding="utf-8")
    assert f"metadata:\n  type: project\n  commit: {sha}\n  folder: {top}\n---\n" in saved, saved

    # 7b. Uncommitted edits to tracked files: flagged, since the commit is not what was tested.
    (repo / "f.txt").write_text("v1", encoding="utf-8")
    git("add", "f.txt", cwd=repo)
    sha = git("-c", "user.name=t", "-c", "user.email=t@example.com", "commit-tree", git("write-tree", cwd=repo), "-m", "f", cwd=repo)
    git("update-ref", "HEAD", sha, cwd=repo)
    (repo / "f.txt").write_text("v2", encoding="utf-8")
    (repo / "untracked.txt").write_text("x", encoding="utf-8")
    mem5 = tmp / "dirty"
    mem5.mkdir()
    run({"hook_event_name": "Stop", "cwd": str(repo), "last_assistant_message": handoff(mem5)})
    saved = handoffs(mem5)[0].read_text(encoding="utf-8")
    assert f"  commit: {sha}\n  folder: {top}\n  dirty: true\n---\n" in saved, saved
    # Untracked files alone do not count as dirty.
    (repo / "f.txt").write_text("v1", encoding="utf-8")
    mem6 = tmp / "clean"
    mem6.mkdir()
    run({"hook_event_name": "Stop", "cwd": str(repo), "last_assistant_message": handoff(mem6)})
    saved = handoffs(mem6)[0].read_text(encoding="utf-8")
    assert f"  folder: {top}\n---\n" in saved and "dirty" not in saved, saved

    # 8. No usable commit: saved anyway, frontmatter unchanged.
    empty_repo = tmp / "empty-repo"
    empty_repo.mkdir()
    git("init", "-q", cwd=empty_repo)
    for i, (cwd, env) in enumerate([
        (str(tmp), None),                                       # not a repo
        (str(empty_repo), None),                                # repo with no commits
        (str(tmp / "missing"), None),                           # folder does not exist
        (str(repo), {**os.environ, "PATH": ""}),                # git not on PATH
    ]):
        m = tmp / f"nocommit{i}"
        m.mkdir()
        r = subprocess.run([sys.executable, str(HOOK)], input=json.dumps(
            {"hook_event_name": "Stop", "cwd": cwd, "last_assistant_message": handoff(m)}),
            capture_output=True, text=True, encoding="utf-8", timeout=30, env=env)
        assert r.returncode == 0 and "saved" in r.stdout, (cwd, r.stdout, r.stderr)
        saved = handoffs(m)[0].read_text(encoding="utf-8")
        assert "commit:" not in saved and "folder:" not in saved and "metadata:\n  type: project\n---\n" in saved, (cwd, saved)
    # Cases 1-6 sent no cwd at all.
    assert all("commit:" not in f.read_text(encoding="utf-8") for f in handoffs(mem)), "no cwd must mean no commit"

print("ok")
