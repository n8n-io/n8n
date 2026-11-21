# Stale Verification Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (this repo does not dispatch subagents). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A resumed session learns when the code has changed since the handoff was written, so it reruns the handoff's Verification commands instead of trusting them.

**Architecture:** `handoff-save.py` already runs when the handoff reply finishes. It also asks git for the commit the working folder is on and writes it into the handoff file's frontmatter as `commit:`. The skill's resume steps gain one step: if the handoff has a `commit:`, run `git diff --stat <commit>`; any files listed mean the Verification results may be stale and get rerun before they are relied on.

**Tech Stack:** Python 3 stdlib (`subprocess`), git CLI, Markdown skill text.

**Spec:** No separate spec. Source is the Knowledge-Scout finding of 2026-10-17 on Project Sentinel ("record git HEAD and the files each verification covered … mark a verification stale when any of those files has changed"), cut down and agreed with David on 2026-10-19:
- Record the commit only. Do **not** record per-file coverage: the writer would have to guess which files each check covered, and the Verification section already lists the commands to rerun.
- The hook records it, not the model: the handoff is one reply with no tool calls (skill hard rule 1), so the writer cannot run git.

## Global Constraints

- Hooks never block and always exit 0 (`hooks/handoff-save.py:9`, `:104-109`). A git failure of any kind must leave the handoff saved exactly as today, minus the `commit:` line.
- Stdlib only. No new dependency.
- Claude side only. The Codex skill (`codex/skills/session-handoff/SKILL.md`) writes its handoff itself and is out of scope; see Deferred.
- No local paths in committed files (the repo is public-ready).
- Before merging, from the worktree: `python hooks/test_context_warn.py && python hooks/test_handoff_task.py && python hooks/test_chapters.py && python hooks/test_handoff_save.py` (each prints `ok`), and `claude plugin validate .` (only the missing-`version` warning is expected). After merging: `claude plugin update session-handoff@session-handoff`.

## Grounding in existing code

| Category | Existing pattern | Cite |
|---|---|---|
| Naming | Hook files are `kebab-case.py`; functions are short `snake_case` verbs/nouns (`save`, `section`, `last_text_from_transcript`) | `hooks/handoff-save.py:21,43,48` |
| Error handling | Swallow and carry on: bad input returns `None`/early return; `main()` wrapped in `try/except Exception: pass`; `sys.exit(0)` always | `hooks/handoff-save.py:86-109` |
| Logging | None to files. The only output is one `{"systemMessage": ...}` JSON line on stdout | `hooks/handoff-save.py:103` |
| Data access | `pathlib.Path`, `write_text(..., encoding="utf-8")`; `cwd` read from the hook payload | `hooks/handoff-save.py:66-69`, `hooks/chapters.py:280` |
| Subprocess | `subprocess` with `stdin/stdout/stderr` set explicitly | `hooks/chapters.py:592-593` |
| Tests | `hooks/test_<hook>.py`, plain `assert` with the failing value as message, temp dirs, the hook run via `subprocess` with a JSON payload, numbered `# N.` cases, `print("ok")` at the end | `hooks/test_handoff_save.py:21-25,43-57,106` |

There is no existing git call in any hook. The `git -C <dir> rev-parse HEAD` call below is new; it follows the subprocess style above.

## Review Focus

1. **Folder is not a git repo, or a repo with no commits yet** — the handoff saves normally with no `commit:` line. Test case 7.
2. **git is missing or hangs** — same: saved, no `commit:` line, no delay beyond a 5-second timeout. Test case 7 (empty `PATH`).
3. **Payload has no `cwd`** — saved, no `commit:` line. Existing cases 1–6 pass no `cwd`; case 8 asserts they carry no `commit:`.
4. **Handoff written in a worktree, resumed in the main folder (or the reverse)** — worktrees share one commit store, so `git diff --stat <commit>` works from either. If that commit has since been deleted, git says so and the skill tells the user the check could not be done. Covered by skill text (Task 2), no automated test.
5. **Uncommitted edits at resume time** — `git diff --stat <commit>` compares against the files on disk, so these count as "changed" and trigger a rerun. That errs toward rerunning, which is the safe direction. New untracked files are not listed; accepted ceiling, named in a `ponytail:` comment.

---

### Task 1: Record the commit when the handoff is saved

**Files:**
- Modify: `hooks/handoff-save.py` (`save()` at `:48-83`, `main()` at `:86-101`, docstring `:2-10`)
- Test: `hooks/test_handoff_save.py`

**Interfaces:**
- Produces: `head_commit(cwd) -> str | None` in `hooks/handoff-save.py`; `save(text: str, commit: str | None = None)`. Saved frontmatter, when a commit was found:
  ```
  ---
  name: <stem>
  description: Session handoff — <title>
  metadata:
    type: project
    commit: <40-char sha>
  ---
  ```
  Without one, the frontmatter is byte-for-byte what it is today.

- [ ] **Step 1: Write the failing tests** — append to `hooks/test_handoff_save.py`, before `print("ok")`:

```python
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
    run({"hook_event_name": "Stop", "cwd": str(repo), "last_assistant_message": handoff(mem4)})
    saved = handoffs(mem4)[0].read_text(encoding="utf-8")
    assert f"metadata:\n  type: project\n  commit: {sha}\n---\n" in saved, saved

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
        assert "commit:" not in saved and "metadata:\n  type: project\n---\n" in saved, (cwd, saved)
    # Cases 1-6 sent no cwd at all.
    assert all("commit:" not in f.read_text(encoding="utf-8") for f in handoffs(mem)), "no cwd must mean no commit"
```

Add `import os` to the imports.

- [ ] **Step 2: Run it and confirm it fails for the right reason**

Run: `python hooks/test_handoff_save.py`
Expected: `AssertionError` from case 7 printing a saved file with no `commit:` line. Cases 1–6 still pass. Case 8 passes vacuously at this point — that is expected, and Step 4's mutation check is what proves it can fail.

- [ ] **Step 3: Implement `head_commit(cwd) -> str | None` and thread it through `save()`**

- `head_commit`: `None` if `cwd` is falsy. Otherwise `subprocess.run(["git", "-C", cwd, "rev-parse", "--verify", "-q", "HEAD"], capture_output=True, text=True, timeout=5, stdin=subprocess.DEVNULL)`; return the stripped stdout when `returncode == 0` and it is non-empty, else `None`. Any exception (`FileNotFoundError` for missing git, `TimeoutExpired`, `OSError`) returns `None`.
- `save(text, commit=None)`: insert `f"  commit: {commit}\n"` after `"  type: project\n"` only when `commit` is truthy.
- `main()`: `path = save(text, head_commit(payload.get("cwd")))`.
- Docstring: one added sentence — it also records the commit the working folder is on, so a resumed session can tell whether the code moved since.
- `ponytail:` comment on `head_commit`: commit only, no per-file coverage; untracked files at resume are not detected; add file tracking only if a stale result is seen slipping through.

- [ ] **Step 4: Run the tests, then prove case 8 can fail**

Run: `python hooks/test_handoff_save.py` → Expected: `ok`.
Mutation: copy `hooks/handoff-save.py` to the scratchpad, change `head_commit` to return `"x"` instead of `None` on failure, run → Expected: `AssertionError` in case 8. Restore from the copy (not `git checkout`), run again → `ok`.

- [ ] **Step 5: Run the full suite and commit**

Run: `python hooks/test_context_warn.py && python hooks/test_handoff_task.py && python hooks/test_chapters.py && python hooks/test_handoff_save.py` → each prints `ok`.

```bash
git add hooks/handoff-save.py hooks/test_handoff_save.py
git commit -m "Record the commit a handoff was written at"
```

### Task 2: Resume step that flags stale verification

**Files:**
- Modify: `skills/session-handoff/SKILL.md` — "Reading a handoff in a fresh session" (numbered steps at `:59-61`), and the hook description under "Where the handoff goes" (`:38`)
- Modify: `README.md` — the `hooks/handoff-save.py` bullet (`:101`)

**Interfaces:**
- Consumes: the `commit:` frontmatter line from Task 1.

- [ ] **Step 1: Add the resume step** — new step 3 between the current steps 2 and 3, roughly:

  > 3. If the handoff's frontmatter has a `commit:` line, run `git diff --stat <commit>` in the working folder. If it lists any files, the code has changed since the handoff was written: tell the user its Verification results may be stale, and rerun those commands before relying on anything they covered. If git reports the commit as unknown, say the staleness check could not be done. No `commit:` line means the handoff predates this check; skip it.

  Renumber the old step 3 to 4.

- [ ] **Step 2: Mention it where the hook is described** — `SKILL.md:38` gains a clause that the hook also records the working folder's git commit in the frontmatter; `README.md:101` gains one sentence saying the same and why (so a resumed session knows when to rerun its checks).

- [ ] **Step 3: Validate and commit**

Run: `claude plugin validate .` → Expected: only the missing-`version` warning.

```bash
git add skills/session-handoff/SKILL.md README.md
git commit -m "Flag stale verification when resuming from a handoff"
```

- [ ] **Step 4: Live check (after merge, at Gate 2 time)** — write one real handoff in this repo, confirm the saved file carries `commit:`, make a trivial edit, resume in a fresh session, and confirm the resume reports the change and reruns the Verification commands. This is the only end-to-end check of the skill text.

## Deferred

- **Codex skill** (`codex/skills/session-handoff/SKILL.md`): its writer saves the file itself and could add the commit with its own git call. Left out to keep this Claude-only, per the plugin's Claude-first decision. Add when Codex handoffs are in daily use.
- **Per-file coverage** (the full Sentinel version): add only if a resumed session is seen trusting a result whose files changed while the commit check stayed quiet.
