#!/usr/bin/env python3
"""prefix_diff.py -- find what changed between two consecutive Messages API requests
in the parts a thinking block is bound to (system, tools, and the earlier messages),
and say it in the API's own vocabulary.

Dependency-free (Python 3.8+). Two modes:

  1. DIFF consecutive request bodies of one conversation

       python3 prefix_diff.py capture.jsonl            # one request body per line, in send order
       python3 prefix_diff.py req_003.json req_004.json
       python3 prefix_diff.py captures/                # *.jsonl: one conversation per file (a wrapper
                                                       #   line's conversation_id overrides); pairs
                                                       #   never cross conversation boundaries
       python3 prefix_diff.py --json capture.jsonl     # machine-readable

     For every pair (N, N+1) it reports whether request N+1 still carries request N's
     system prompt, tool set and messages unchanged, and if not: a guessed kind/pattern
     (same words the API uses in its anthropic-thinking-prefix-mismatch header), the
     first changed path, and a Claude-Code-style attribution line such as
         system[0] changed at char 47: "...Be concise." -> "...Be concise. Current time: ..."

  2. SCAN a repository for the code paths that usually cause those edits

       python3 prefix_diff.py --scan path/to/repo [--ext py,ts,js]

     Prints file:line leads grouped by cause. These are regex heuristics -- LEADS to read,
     not findings. The diff mode (or the API's own response) is the evidence.

What the comparison ignores, on purpose (the API ignores them too):
  cache_control markers anywhere; an explicit strict: false / eager_input_streaming: false on a tool (the defaults);
  string content vs a single text block (same thing); leading/trailing whitespace of a
  text block, and whitespace-only text blocks; key order; tool ORDER in the tools array
  (tools bind as a name-keyed set); a defer_loading tool that no tool_reference (at any depth),
  tool-search result or tool_addition has named yet; thinking / redacted_thinking blocks themselves (they are what is validated, not
  part of the compared prefix) -- the API only requires that every kept thinking block
  after the first was minted right after the kept block now in front of it, so any
  CONTIGUOUS WINDOW of the original sequence replays fine (drop from the front, drop from
  the back, or both); a block removed from the middle, or a reorder, is flagged separately
  because the chain check fails for the block that follows the gap; request parameters
  outside system / tools / messages. A URL-sourced image or document is compared without
  its URL string: a rotated URL to the same bytes is a MATCH here and at the API, but the
  same URL serving different bytes is a break the API catches and this script cannot see.

Interior whitespace, tool_use.input bytes, tool_result text, image bytes, a tool's strict /
eager_input_streaming flags and every other difference count.

A pair where the later request keeps the earlier one's messages up to some point and replaces
everything after it, with NO replayed thinking block at or after that point (a branch, a
regenerate, a retry of the last turn), is reported as MATCH with a "branch" note: nothing the
API would check has changed. This assumes consecutive requests of one conversation; a capture
that skips requests can make a real edit look like a branch.

This script's kind/pattern is a guess from the bodies alone; the API's own response (the
input_transformations entries, the 400 text, and the diagnosis header when present) is the
authority when they differ. One modelling limit to keep in mind: the pair diff compares each
request with the previous one, while the API judges each replayed block against the request that
produced it. The two agree for an append-only or steadily edited history; they differ when a
harness alternates prompts per model and restores them (handled: the diff then compares against
the last request on the same model) and for blocks minted before a later-referenced tool entered
the prefix (the "at most" count). In particular its counts of removed, inserted and modified items can differ from these, and its
treatment of image and document bytes may become finer-grained than the whole-source comparison here.
"""
import argparse
import difflib
import glob
import json
import os
import re
import sys

# With stdout/stderr redirected to a pipe (as under a tool runner), CPython on Windows encodes with
# the ANSI code page and errors="strict", so one character outside it (an emoji in an excerpt of a
# changed block) would abort the run mid-report. Never raise on output.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(errors="backslashreplace")
    except (AttributeError, ValueError):  # a non-TextIOWrapper stand-in; nothing to configure
        pass

IGNORED_TOOL_KEYS = {"cache_control"}          # strict and eager_input_streaming ARE compared
MEDIA_TYPES = {"image", "document", "image_url", "document_url"}
INT_LIMIT = 2 ** 63


def clean(obj):
    """Recursively drop None-valued keys, collapse integral floats (1.0 -> 1), and sort nothing
    (fp() sorts keys). Applied to every compared value."""
    if isinstance(obj, dict):
        return {k: clean(v) for k, v in obj.items() if v is not None}
    if isinstance(obj, list):
        return [clean(v) for v in obj]
    if isinstance(obj, float) and obj.is_integer() and abs(obj) < INT_LIMIT:
        return int(obj)
    return obj


def canon_tool_entry(entry):
    """One tools[] entry or by-value tool definition, in the shape the API compares: the API
    stores a member left at its default as the member spelled out, so `type: "custom"` equals
    type absent, `description: ""` equals description absent, `allowed_callers: ["direct"]`
    equals allowed_callers absent, and a custom entry's strict / eager_input_streaming default
    to False (their VALUES are compared; cache_control is not)."""
    entry = clean({k: v for k, v in entry.items() if k not in IGNORED_TOOL_KEYS})
    if entry.get("description") == "":
        entry.pop("description")
    if entry.get("allowed_callers") == ["direct"]:
        entry.pop("allowed_callers")
    if not entry.get("type") or entry.get("type") == "custom":
        entry.pop("type", None)
        entry.setdefault("strict", False)
        entry.setdefault("eager_input_streaming", False)
    return entry

# ----------------------------------------------------------------------------- loading


def load_requests(paths):
    """Return a list of (label, body, conversation) in order. A .jsonl file yields one body per
    line; a .json file yields one body (or a list of bodies); a directory yields its *.json /
    *.jsonl sorted. The conversation key keeps pairs from crossing conversation boundaries (two
    conversations legitimately differ in the compared parts, so a cross-boundary pair is a false
    mismatch): each .jsonl FILE is one conversation -- a wrapper line's conversation_id overrides,
    so several conversations can share a file, as for the probe -- while bare .json bodies given
    together, on the command line or inside one directory, stay one conversation in sorted order
    (the two-.json-files usage)."""
    out = []

    def add_file(p, default_conv):
        with open(p, "r", encoding="utf-8") as f:
            if p.endswith(".jsonl"):
                conv = os.path.splitext(p)[0]
                for i, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        out.append(("%s:%d" % (os.path.basename(p), i), json.loads(line), conv))
                    except ValueError as e:
                        raise SystemExit("%s:%d: not valid JSON (%s)" % (p, i, e))
            else:
                try:
                    data = json.load(f)
                except ValueError as e:
                    raise SystemExit("%s: not valid JSON (%s)" % (p, e))
                if isinstance(data, list):
                    for i, b in enumerate(data, 1):
                        out.append(("%s[%d]" % (os.path.basename(p), i), b, default_conv))
                else:
                    out.append((os.path.basename(p), data, default_conv))

    for p in paths:
        if os.path.isdir(p):
            for fp in sorted(glob.glob(os.path.join(p, "*.json")) + glob.glob(os.path.join(p, "*.jsonl"))):
                add_file(fp, p)
        else:
            add_file(p, "")
    bodies = []
    for label, b, conv in out:
        if isinstance(b, dict) and "request" in b and isinstance(b["request"], dict) and "messages" in b["request"]:
            # a capture wrapper {request:..., conversation_id:..., headers:..., response:...}.
            # Only the documented conversation_id groups; a wrapper's id is a per-request stamp
            # in some captures and a correlation key in others, so it never decides grouping.
            if b.get("conversation_id"):
                conv = str(b["conversation_id"])
            b = b["request"]
        if not isinstance(b, dict) or "messages" not in b:
            raise SystemExit("%s: not a Messages API request body (no 'messages')" % label)
        bodies.append((label, b, conv))
    return bodies


def is_compaction_request(body):
    """True for a body carrying the top-level compaction field (beta compact-2026-09-04): a request for a summary, whose
    reply is the signed block (or nothing), not a conversation turn. drop_block_probe.py keeps the same predicate."""
    return isinstance(body, dict) and isinstance(body.get("compaction"), dict)


# ----------------------------------------------------------------------------- canonical view


def _text_block(text):
    return {"type": "text", "text": text}


def canon_blocks(content):
    """Normalise a content field (string or list of blocks) to the bound view: a list of
    blocks with cache_control removed, whitespace-only text dropped, text edges trimmed.
    Returns (blocks, thinking_signatures, thinking_text_by_signature)."""
    if content is None:
        return [], [], {}
    if isinstance(content, str):
        content = [_text_block(content)]
    if not isinstance(content, list):
        content = [content]
    blocks, sigs, texts = [], [], {}
    for wire_idx, b in enumerate(content):
        if not isinstance(b, dict):
            blocks.append({"type": "_raw", "value": b, "_wire": wire_idx})
            continue
        t = b.get("type")
        if t in ("thinking", "redacted_thinking"):
            sig = b.get("signature") or b.get("data") or ""
            sigs.append((wire_idx, sig))
            if t == "thinking":
                texts[sig] = b.get("thinking")   # kept so a later request's text can be compared (a modified block is a break)
            continue
        b = clean({k: v for k, v in b.items() if k != "cache_control"})
        tl = b.get("tool")
        if t == "tool_addition" and isinstance(tl, dict) and tl.get("type") == "tool_definition" \
                and isinstance(tl.get("definition"), dict):
            # compared in the API's canonical shape, exactly as a tools[] entry: a replay that only
            # spells out a default (type "custom", description "") is not an edit
            b["tool"] = dict(tl, definition=canon_tool_entry(tl["definition"]))
        if b.get("citations") in ([], None):
            b.pop("citations", None)
        if t == "text":
            txt = (b.get("text") or "")
            if txt.strip() == "":
                continue
            b["text"] = txt.strip()
        if t == "tool_result":
            if b.get("is_error") is False:
                b.pop("is_error")
            if isinstance(b.get("content"), str):
                b["content"] = [_text_block(b["content"])]
            if isinstance(b.get("content"), list):
                inner, _s, _t = canon_blocks(b["content"])
                b["content"] = inner
        if t in ("image", "document") and isinstance(b.get("source"), dict) and b["source"].get("type") == "url":
            # the API compares the bytes behind the URL, not the URL string: drop it, keep the rest
            b["source"] = {k: v for k, v in b["source"].items() if k != "url"}
            b["type"] = t + "_url"
        b["_wire"] = wire_idx
        blocks.append(b)
    return blocks, sigs, texts


def canon_system(system):
    blocks, _s, _t = canon_blocks(system if system is not None else [])
    return blocks


def _toolset_key(server):
    return "mcp_toolset:%s" % server if isinstance(server, str) and server else None


def canon_tools(tools, messages):
    """Inline tools as a name-keyed map; deferred tools kept separately and compared only
    once something in the messages names them (see walk). Server tools (type != custom) are
    keyed by type+name, MCP toolsets by server name. A compaction block's tool_changes field
    is not read. Once a compaction block has replaced the messages that named a deferred
    tool, that tool counts as unnamed and edits to it are not reported (diff_pair adds a
    note when the block has a tool_changes field). The exception is the first request that
    carries the block: it is compared against an earlier request whose messages still name
    the tool."""
    referenced = set()

    def walk(blocks):
        # a deferred tool binds once something names it: a tool_reference at any depth (including inside a
        # tool_result's content), a tool-search result's tool_references, or a tool_addition block in a
        # mid-conversation system message, by reference or by value (the docs do not say whether a
        # definition by value binds a deferred entry of the same name; counting it is the cautious choice)
        for b in blocks or []:
            if not isinstance(b, dict):
                continue
            t = b.get("type")
            if t == "tool_reference":
                name = b.get("tool_name") or b.get("name")
                if isinstance(name, str) and name:
                    referenced.add(name)
            elif t == "tool_addition":
                tool = b.get("tool") if isinstance(b.get("tool"), dict) else b
                if tool.get("type") == "tool_definition" and isinstance(tool.get("definition"), dict):
                    tool = tool["definition"]   # inline-tools-2026-09-15 sends a whole tools[] entry in this wrapper
                name = tool.get("name") or tool.get("tool_name")
                if tool.get("type") in ("mcp_toolset", "mcp_toolset_reference"):
                    name = _toolset_key(tool.get("mcp_server_name") or tool.get("server_name"))
                elif tool.get("server_name") and name and not str(name).startswith(str(tool["server_name"])):
                    name = "%s_%s" % (tool["server_name"], name)
                if isinstance(name, str) and name:
                    referenced.add(name)
            inner = b.get("content")
            if isinstance(inner, list):
                walk(inner)
            elif isinstance(inner, dict):
                walk([inner])
            refs = b.get("tool_references")
            if isinstance(refs, list):
                walk(refs)
            if isinstance(inner, dict) and isinstance(inner.get("tool_references"), list):
                walk(inner["tool_references"])

    for m in messages or []:
        c = m.get("content")
        if isinstance(c, list):
            walk(c)
    inline, deferred, server_names = {}, {}, {}
    for t in tools or []:
        if not isinstance(t, dict):
            continue
        t = canon_tool_entry(t)
        name = t.get("name")
        if isinstance(name, str) and name:
            key = name
        elif not name:
            key = "%s" % t.get("type")
        else:
            key = fp(name)
        if t.get("type") == "mcp_toolset" and _toolset_key(t.get("mcp_server_name")):
            key = _toolset_key(t["mcp_server_name"])
        elif t.get("type") and t.get("type") != "custom" and isinstance(name, str) and name:
            key = "%s:%s" % (t["type"], name)
            server_names[key] = name
        if t.get("defer_loading"):
            d = {k: v for k, v in t.items() if k != "defer_loading"}
            deferred[key] = d
        else:
            inline[key] = t
    # a server tool is keyed type:name, but a reference or a by-value definition names it by name alone
    referenced |= {k for k, n in server_names.items() if n in referenced}
    return inline, deferred, referenced


def canon_messages(messages):
    out = []
    for m in messages or []:
        blocks, sigs, texts = canon_blocks(m.get("content"))
        entry = {"role": m.get("role"), "content": blocks}
        for k in ("clear_at", "output_config"):
            if m.get(k) is not None:
                entry[k] = m[k]
        out.append({"msg": entry, "sigs": sigs, "texts": texts})
    return out


def _strip_wire(obj):
    if isinstance(obj, dict):
        return {k: _strip_wire(v) for k, v in obj.items() if k != "_wire"}
    if isinstance(obj, list):
        return [_strip_wire(v) for v in obj]
    return obj


def fp(obj):
    return json.dumps(clean(_strip_wire(obj)), sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def wire(block, fallback):
    return block.get("_wire", fallback) if isinstance(block, dict) else fallback


# ----------------------------------------------------------------------------- attribution


def first_diff_char(a, b):
    n = min(len(a), len(b))
    for i in range(n):
        if a[i] != b[i]:
            return i
    return n if len(a) != len(b) else -1


def excerpt(s, at, width=40):
    lo = max(0, at - 12)
    return ("..." if lo else "") + s[lo:at + width].replace("\n", "\\n") + ("..." if at + width < len(s) else "")


def attribute(label, old, new):
    """Claude-Code-style one-liner for a changed scalar/object."""
    so, sn = (old if isinstance(old, str) else fp(old)), (new if isinstance(new, str) else fp(new))
    at = first_diff_char(so, sn)
    if at < 0:
        return "%s changed (representation only)" % label
    return '%s changed at char %d: "%s" -> "%s"' % (label, at, excerpt(so, at), excerpt(sn, at))


# ----------------------------------------------------------------------------- the diff


def diff_system(a, b):
    """Returns list of attribution strings (empty if equal)."""
    notes = []
    n = max(len(a), len(b))
    for i in range(n):
        if i >= len(a):
            notes.append("system[%d] added: %s" % (i, excerpt(fp(b[i]), 0)))
        elif i >= len(b):
            notes.append("system[%d] removed: %s" % (i, excerpt(fp(a[i]), 0)))
        elif fp(a[i]) != fp(b[i]):
            if a[i].get("type") == "text" and b[i].get("type") == "text":
                notes.append(attribute("system[%d]" % i, a[i]["text"], b[i]["text"]))
            else:
                notes.append(attribute("system[%d]" % i, a[i], b[i]))
    return notes


def diff_tools(ta, tb):
    ia, da, refa = ta
    ib, db, refb = tb
    notes, set_changed = [], False
    for name in sorted(set(ia) | set(ib)):
        if name not in ib:
            notes.append("tools: %s removed" % name); set_changed = True
        elif name not in ia:
            notes.append("tools: %s added" % name); set_changed = True
        elif fp(ia[name]) != fp(ib[name]):
            for field in sorted(set(ia[name]) | set(ib[name])):
                if fp(ia[name].get(field)) != fp(ib[name].get(field)):
                    notes.append(attribute("tools: %s %s" % (name, field), ia[name].get(field, ""), ib[name].get(field, "")))
    # deferred tools: bound only once referenced in request N (the minting request's view)
    for name in sorted(refa | refb):
        if name in da or name in db:
            if name not in db:
                notes.append("tools: deferred %s (referenced) removed" % name); set_changed = True
            elif name not in da:
                pass  # newly loaded by reference: allowed
            elif fp(da[name]) != fp(db[name]):
                notes.append(attribute("tools: deferred %s (referenced)" % name, da[name], db[name]))
    return notes, set_changed


def block_type(b):
    return b.get("type") if isinstance(b, dict) else type(b).__name__


def _item_count(msgs):
    """Server-style item count: one item per message plus one per content block."""
    return sum(1 + len(x["msg"]["content"]) for x in msgs)


def _block_diffs(A, B, changed_idx):
    """Block-level opcodes for in-place message edits. Returns (mod, rem, ins, notes,
    first_path, first_pos) where mod/rem/ins are lists of (msg_index, block_type)."""
    mod, rem, ins, notes = [], [], [], []
    first_path, first_pos, first_wire = None, None, None
    for i in changed_idx:
        ai, bi = A[i]["msg"], B[i]["msg"]
        ca, cb = ai["content"], bi["content"]
        if ai.get("role") != bi.get("role") or ai.get("clear_at") != bi.get("clear_at"):
            notes.append("messages[%d] role or clear_at changed" % i)
            mod.append((i, "message"))
            if first_path is None:
                first_path, first_pos, first_wire = "messages.%d" % i, "at", (i, -1)
        bsm = difflib.SequenceMatcher(a=[fp(x) for x in ca], b=[fp(x) for x in cb], autojunk=False)
        for bop, a1, a2, b1, b2 in bsm.get_opcodes():
            if bop == "equal":
                continue
            if first_path is None:
                if bop == "delete":
                    w = wire(ca[a1 - 1], a1 - 1) if a1 else 0
                    first_path, first_pos = ("messages.%d.content.%d" % (i, w), "after" if a1 else "before")
                    first_wire = (i, wire(ca[a1], a1))
                else:
                    first_path, first_pos = ("messages.%d.content.%d" % (i, wire(cb[b1], b1)), "at")
                    first_wire = (i, wire(cb[b1], b1))
            if bop == "replace" and (a2 - a1) == (b2 - b1):
                for q in range(a2 - a1):
                    ta, tb = block_type(ca[a1 + q]), block_type(cb[b1 + q])
                    mod.append((i, ta))   # the API keys the change on the STORED (old) item's type
                    label = "messages[%d] (%s) content[%d] (%s%s)" % (i, ai["role"], wire(ca[a1 + q], a1 + q), ta, "" if ta == tb else " -> " + tb)
                    notes.append(attribute(label, ca[a1 + q], cb[b1 + q]))
            elif bop == "replace":
                # unequal lengths: pair old and new blocks of the same type in order and call those
                # changes; only the leftovers are removals / insertions
                old_q, new_q = list(range(a1, a2)), list(range(b1, b2))
                paired = []
                for q in old_q:
                    for r in new_q:
                        if r not in [pr for _, pr in paired] and block_type(ca[q]) == block_type(cb[r]):
                            paired.append((q, r))
                            break
                for q, r in paired:
                    mod.append((i, block_type(ca[q])))
                    notes.append(attribute("messages[%d] (%s) content[%d] (%s)" % (i, ai["role"], wire(ca[q], q), block_type(ca[q])), ca[q], cb[r]))
                for q in old_q:
                    if q not in [pq for pq, _ in paired]:
                        rem.append((i, block_type(ca[q])))
                        notes.append("messages[%d] (%s) content[%d] (%s) removed: %s" % (i, ai["role"], wire(ca[q], q), block_type(ca[q]), excerpt(fp(ca[q]), 0)))
                for r in new_q:
                    if r not in [pr for _, pr in paired]:
                        ins.append((i, block_type(cb[r])))
                        notes.append("messages[%d] (%s) content[%d] (%s) inserted: %s" % (i, ai["role"], wire(cb[r], r), block_type(cb[r]), excerpt(fp(cb[r]), 0)))
            else:
                for q in range(a1, a2):
                    rem.append((i, block_type(ca[q])))
                    notes.append("messages[%d] (%s) content[%d] (%s) removed: %s" % (i, ai["role"], wire(ca[q], q), block_type(ca[q]), excerpt(fp(ca[q]), 0)))
                for q in range(b1, b2):
                    ins.append((i, block_type(cb[q])))
                    notes.append("messages[%d] (%s) content[%d] (%s) inserted: %s" % (i, ai["role"], wire(cb[q], q), block_type(cb[q]), excerpt(fp(cb[q]), 0)))
    return mod, rem, ins, notes, first_path, first_pos, first_wire


def _classify_in_place(A, B, changed_idx):
    mod, rem, ins, notes, first_path, first_pos, first_wire = _block_diffs(A, B, changed_idx)
    n_mod, n_rem, n_ins = len(mod), len(rem), len(ins)
    if n_mod and not n_rem and not n_ins:
        kind = "blocks_modified"
    elif n_rem and not n_mod and not n_ins:
        kind = "blocks_removed"
    elif n_ins and not n_mod and not n_rem:
        kind = "blocks_inserted"
    else:
        kind = "blocks_replaced"
    touched = sorted(set(i for i, _ in mod + rem + ins) | set(changed_idx))
    first_message_only = touched and max(touched) == 0
    types_changed = {t for _, t in mod} | {t for _, t in rem} | {t for _, t in ins}
    only_media = bool(types_changed) and types_changed <= MEDIA_TYPES
    blocks_carried = sum(len(x["msg"]["content"]) for x in A)
    roles_touched = {A[i]["msg"]["role"] for i in touched}

    def user_text_removed(entry):
        i, t = entry
        return t == "text" and A[i]["msg"]["role"] == "user"

    def later_user_turns(i):
        return sum(1 for x in A[i + 1:] if x["msg"]["role"] == "user")

    pattern = "unknown"
    if kind == "blocks_modified":
        if types_changed <= {"image_url", "document_url"}:
            pattern = "image_url_resigned"
        elif types_changed <= {"tool_result"}:
            pattern = "tool_results_rewritten"
        elif types_changed <= {"tool_use", "server_tool_use", "mcp_tool_use"}:
            pattern = "tool_use_rewritten"
        elif roles_touched == {"system"}:
            pattern = "system_block_rerendered"
        elif only_media:
            pattern = "media_stripped"
        elif n_mod >= 4 and ((n_mod * 2 >= blocks_carried and len(types_changed) > 1) or n_mod >= blocks_carried):
            pattern = "reserialized"
        elif first_message_only:
            pattern = "first_message_rewritten"
    elif kind == "blocks_removed":
        if n_rem == 1:
            i, t = rem[0]
            if user_text_removed(rem[0]) and later_user_turns(i) <= 1 and i != 0:
                pattern = "reminder_stripped"
            elif only_media:
                pattern = "media_stripped"
            elif first_message_only:
                pattern = "first_message_rewritten"
            elif user_text_removed(rem[0]):
                pattern = "history_block_stripped"
        else:
            if roles_touched == {"system"}:
                pattern = "system_blocks_stripped"
            elif only_media:
                pattern = "media_stripped"
            elif first_message_only:
                pattern = "first_message_rewritten"
    elif kind == "blocks_inserted":
        if n_ins == 1 and ins[0][1] in ("text",) and ins[0][0] != 0:
            pattern = "block_inserted"
        elif any(t == "compaction" for _, t in ins):
            pattern = "compaction_summary"
        elif first_message_only:
            pattern = "first_message_rewritten"
    else:
        if only_media:
            pattern = "media_stripped"
        elif first_message_only:
            pattern = "first_message_rewritten"
    return {"kind": kind, "pattern": pattern, "notes": notes, "changed_validated": first_path,
            "position": first_pos, "items_modified": n_mod, "items_removed": n_rem, "items_inserted": n_ins,
            "messages_delta": 0, "first_changed_msg": min(touched), "first_changed_wire": first_wire, "reading": "in-place"}


def _classify_runs(A, B, ops):
    notes = []
    deletes = [op for op in ops if op[0] == "delete"]
    replaces = [op for op in ops if op[0] == "replace"]
    inserts = [op for op in ops if op[0] == "insert"]
    first_i1 = min(op[1] for op in ops)
    for op, i1, i2, j1, j2 in ops:
        if op == "delete":
            notes.append("messages[%d..%d] removed (%s)" % (i1, i2 - 1, ", ".join(A[q]["msg"]["role"] for q in range(i1, i2))))
        elif op == "insert":
            notes.append("%d message(s) inserted before messages[%d] (%s)" % (j2 - j1, i1, ", ".join(B[q]["msg"]["role"] for q in range(j1, j2))))
        else:
            notes.append("messages[%d..%d] replaced by %d message(s): %s" % (i1, i2 - 1, j2 - j1, excerpt(fp(B[j1]["msg"]), 0, 60)))
    removed_msgs = sum(i2 - i1 for op, i1, i2, j1, j2 in ops if op != "insert")
    inserted_msgs = sum(j2 - j1 for op, i1, i2, j1, j2 in ops if op != "delete")
    items_removed = sum(1 + len(A[q]["msg"]["content"]) for op, i1, i2, j1, j2 in ops if op != "insert" for q in range(i1, i2))
    items_inserted = sum(1 + len(B[q]["msg"]["content"]) for op, i1, i2, j1, j2 in ops if op != "delete" for q in range(j1, j2))
    res = {"notes": notes, "items_removed": items_removed, "items_inserted": items_inserted, "items_modified": 0,
           "messages_delta": inserted_msgs - removed_msgs, "first_changed_msg": first_i1, "reading": "runs"}
    removed_types = {block_type(b) for op, i1, i2, j1, j2 in ops if op != "insert" for q in range(i1, i2) for b in A[q]["msg"]["content"]}
    only_media = bool(removed_types) and removed_types <= MEDIA_TYPES and not inserts
    if len(deletes) == 1 and not replaces and not inserts:
        op, i1, i2, j1, j2 = deletes[0]
        res["kind"] = "blocks_removed"
        if i1 == 0 and (i2 - i1) >= 1:
            res.update(pattern="rolling_truncation", changed_validated="messages.0", position="before")
        elif all(A[q]["msg"]["role"] == "system" for q in range(i1, i2)) and (i2 - i1) >= 2:
            res.update(pattern="system_blocks_stripped", changed_validated="messages.%d" % (i1 - 1), position="after")
        elif only_media:
            res.update(pattern="media_stripped", changed_validated="messages.%d" % (i1 - 1), position="after")
        elif (i2 - i1) >= 2 and (i2 - i1) >= 2 * i1:
            res.update(pattern="tail_kept", changed_validated="messages.%d" % (i1 - 1), position="after")
        else:
            res.update(pattern="unknown", changed_validated="messages.%d" % (i1 - 1), position="after")
        return res
    if len(replaces) == 1 and not deletes and not inserts:
        op, i1, i2, j1, j2 = replaces[0]
        has_compaction = any(isinstance(b, dict) and b.get("type") == "compaction" for q in range(j1, j2) for b in B[q]["msg"]["content"])
        res["kind"] = "blocks_replaced"
        if has_compaction or (items_removed >= 8 and items_removed >= 2 * items_inserted and (j2 - j1) < (i2 - i1)):
            res.update(pattern="compaction_summary", changed_validated="messages.%d" % j1, position="at")
        elif (j2 - j1) < (i2 - i1):
            res.update(pattern="unknown", changed_validated="messages.%d" % j1, position="at",
                       note="shorter run in place, but fewer than 8 items removed: the API names this compaction_summary only past that size")
            res["notes"].append(res.pop("note"))
        else:
            res.update(pattern="unknown", changed_validated="messages.%d" % j1, position="at")
        return res
    if inserts and not deletes and not replaces:
        res.update(kind="blocks_inserted", pattern="unknown", changed_validated="messages.%d" % inserts[0][3], position="at")
        return res
    res.update(kind="many_changes" if len(ops) > 2 else "blocks_replaced", pattern="unknown",
               changed_validated="messages.%d" % first_i1, position="at")
    return res


def diff_messages(A, B):
    """A, B: canonical message lists (request N, request N+1). Returns a dict describing the
    messages-section verdict, or None when A is an unchanged prefix of B (chain warnings aside)."""
    fa = [fp(x["msg"]) for x in A]
    fb = [fp(x["msg"]) for x in B]
    res = {"notes": [], "thinking_notes": []}

    # thinking-chain check over the shared region: the API requires every kept thinking block
    # after the first to have been minted right after the kept block now in front of it, so the
    # kept blocks must be a contiguous window of the original sequence (any window). A missing
    # predecessor of a kept block, or a reorder, fails the block after the gap.
    shared = min(len(A), len(B))
    seq_a = [(i, s) for i in range(shared) for _w, s in A[i]["sigs"] if fa[i] == fb[i]]
    seq_b = [(i, s) for i in range(shared) for _w, s in B[i]["sigs"] if fa[i] == fb[i]]
    sa = [s for _i, s in seq_a]
    sb = [s for _i, s in seq_b]
    later = [(i, s) for i in range(shared, len(B)) for _w, s in B[i]["sigs"]]   # blocks minted after request N
    if sb and sa != sb and later and [s for s in sb if s in sa] and [s for s in sb if s in sa][-1] != sa[-1]:
        res["thinking_notes"].append(
            "the newest already-sent thinking block (messages[%d]) was removed while a later block (messages[%d]) remains: "
            "that later block was minted right after the removed one, so its recorded predecessor is gone (predecessor_missing)"
            % (seq_a[-1][0], later[0][0]))
    elif sb and sa != sb:
        kept = [s for s in sb if s in sa]
        new_in_b = [s for s in sb if s not in sa]
        idx = [sa.index(s) for s in kept]
        ok = (not new_in_b) and idx == sorted(idx) and (not idx or idx == list(range(idx[0], idx[0] + len(idx))))
        if not ok:
            if idx != sorted(idx):
                what = "re-sent in a different order (predecessor_reordered)"
            elif new_in_b:
                what = "re-sent with thinking blocks that were not in the earlier request"
            else:
                gaps = [sa[q] for q in range(idx[0], idx[-1]) if q not in idx]
                first_gap = next((i for i, s in seq_a if s in gaps), None)
                what = "re-sent with a thinking block removed from the MIDDLE of the kept run (first gap in messages[%s]); the kept block after the gap fails the predecessor check (predecessor_missing)" % first_gap
            res["thinking_notes"].append(
                "thinking blocks in the already-sent turns %s: the API accepts any contiguous window of the original "
                "blocks (drop from the front, from the back, or both) and nothing else" % what)

    # a thinking block replayed with different text than the earlier request sent under the same signature
    texts_a = {s: t for x in A for s, t in x.get("texts", {}).items()}
    for i, x in enumerate(B):
        for s, t in x.get("texts", {}).items():
            if s in texts_a and texts_a[s] != t:
                res["thinking_notes"].append(
                    "the thinking text of the block in messages[%d] differs from the earlier request that carried the same signature: "
                    "the API rejects a modified thinking block with a 400 (truncated, summarized or re-wrapped thinking is an edit)" % i)
                break

    if len(B) >= len(A) and fb[:len(A)] == fa:
        return None if not res["thinking_notes"] else {"pattern": None, "kind": None, **res}

    # branch / regenerate / retry: the shared head is intact up to the divergence and no replayed
    # thinking block sits at or after it -> nothing the API checks has changed
    k = 0
    while k < min(len(A), len(B)) and fa[k] == fb[k]:
        k += 1
    if all(i < k for i, _w in thinking_positions(B)):
        res.update({"kind": None, "pattern": None, "branch": True, "divergence": k})
        res["notes"].append("tail replaced from messages[%d] on, after the last replayed thinking block -- "
                            "nothing the API checks has changed (a compaction that replays no earlier thinking, a branch, a regenerate, or a retry)" % k)
        return res

    # two readings: in place (same positions, some messages differ) vs runs removed/replaced
    in_place = None
    if len(B) >= len(A):
        changed_idx = [i for i in range(len(A)) if fa[i] != fb[i]]
        in_place = _classify_in_place(A, B, changed_idx)
    sm = difflib.SequenceMatcher(a=fa, b=fb, autojunk=False)
    ops = [list(op) for op in sm.get_opcodes() if op[0] != "equal"]
    if ops and ops[-1][0] == "replace" and ops[-1][2] == len(fa) and (ops[-1][4] - ops[-1][3]) > (ops[-1][2] - ops[-1][1]):
        op, i1, i2, j1, j2 = ops[-1]          # A's tail replaced by a longer B tail = edit + new turns
        ops[-1] = ["replace", i1, i2, j1, j1 + (i2 - i1)]
    if ops and ops[-1][0] == "insert" and ops[-1][2] == len(fa):
        ops = ops[:-1]                         # the newly appended turns are expected
    runs = _classify_runs(A, B, [tuple(op) for op in ops]) if ops else None
    if in_place is not None and runs is not None:
        # server-style item costs: a changed message counts its own item plus its changed blocks
        cost_in_place = (in_place["items_modified"] + in_place["items_removed"] + in_place["items_inserted"]
                         + len([i for i in range(len(A)) if fa[i] != fb[i]]))
        cost_runs = runs["items_removed"] + runs["items_inserted"]
        chosen = in_place if cost_in_place <= cost_runs else runs
    else:
        chosen = in_place or runs
    if chosen is None:
        return None
    res.update(chosen)
    return res


def thinking_positions(B):
    """(msg_index, wire_block_index) of every thinking block in request N+1."""
    out = []
    for i, x in enumerate(B):
        for w, _s in x["sigs"]:
            out.append((i, w))
    return out


def _model_key(model):
    """Dated aliases of one model (claude-x-5-1 and claude-x-5-1-20260901, or -latest) read each other's blocks;
    compare on the undated name so they count as the same model here."""
    return re.sub(r"-(\d{8}|latest)$", "", model or "")


def compaction_start(messages):
    """Index of the message holding the last compaction block with non-null content, or 0. The API compares the
    messages from that block on (with server-side compaction the checked prefix restarts there); everything
    before it is outside the check, so a client that drops those messages has not edited anything."""
    start = None
    for i, m in enumerate(messages or []):
        c = m.get("content") if isinstance(m, dict) else None
        if isinstance(c, list):
            for b in c:
                if isinstance(b, dict) and b.get("type") == "compaction" and b.get("content") is not None:
                    start = i
    return start


def _has_signed_block(message):
    """True when a message holds a compaction block with a signature and a summary (the compact-2026-09-04 kind)."""
    c = message.get("content") if isinstance(message, dict) else None
    return isinstance(c, list) and any(isinstance(b, dict) and b.get("type") == "compaction" and b.get("signature")
                                       and b.get("content") is not None for b in c)


def _signed_block_alone(messages):
    """True when messages[0] is a compaction block signed with a summary (the compact-2026-09-04 block) sent as a message
    of its own. Before it, compaction blocks with null content and fallback blocks are skipped; after it, a pinned MCP
    listing (an mcp_tool_listing block) and null-content compaction blocks are skipped. Anything else returns False, and
    diff_pair falls back to the compaction-boundary comparison (nothing before the block is compared)."""
    first = (messages or [None])[0]
    c = first.get("content") if isinstance(first, dict) else None
    if not isinstance(c, list) or not c or not all(isinstance(b, dict) for b in c):
        return False
    signed = next((i for i, b in enumerate(c) if b.get("type") == "compaction" and b.get("signature")
                   and b.get("content") is not None), None)
    if signed is None:
        return False
    ignored = lambda b: b.get("type") == "compaction" and b.get("content") is None
    return (all(ignored(b) or b.get("type") == "fallback" for b in c[:signed])
            and all(ignored(b) or b.get("type") == "mcp_tool_listing" for b in c[signed + 1:]))


def _signed_blocks(messages):
    """Positions ("messages[i].content[j]") of every compaction block signed with a summary, in order as sent."""
    out = []
    for i, m in enumerate(messages or []):
        c = m.get("content") if isinstance(m, dict) else None
        for j, b in enumerate(c if isinstance(c, list) else []):
            if isinstance(b, dict) and b.get("type") == "compaction" and b.get("signature") and b.get("content") is not None:
                out.append("messages[%d].content[%d]" % (i, j))
    return out


def _carries_tool_changes(messages):
    first = (messages or [None])[0]
    c = first.get("content") if isinstance(first, dict) else None
    return any(isinstance(b, dict) and b.get("type") == "compaction" and "tool_changes" in b
               for b in (c if isinstance(c, list) else []))


def _kept_alignment(A_all, B_msgs):
    """For a later request whose messages[0] holds a compaction block the earlier request lacks: the index in the
    earlier request's messages that lines up with messages[1] of the later request, or None. The anchor is a thinking
    signature: a kept assistant message whose block the earlier request also carries fixes the offset (signatures are
    unique, so this is never a coincidence, where equal message bytes - a repeated "continue" - could be); with no such
    anchor this is the older shape (the block arrived in the reply and everything behind it is new) and None is
    returned. Several anchors vote by how many kept messages they line up byte for byte, the later offset on a tie.
    A kept message that was edited lines up all the same and the edit is then reported. Called only for a signed block
    sent as a message of its own (_signed_block_alone)."""
    fa = [fp(x["msg"]) for x in A_all]
    fb = [fp(x["msg"]) for x in B_msgs]
    sig_at = {}
    for j, x in enumerate(A_all):
        for _w, s in x["sigs"]:
            if s:   # an unsigned block anchors nothing: "" is not unique
                sig_at.setdefault(s, j)
    best, best_score = None, -1
    for k in range(1, len(B_msgs)):
        for _w, s in B_msgs[k]["sigs"]:
            j = sig_at.get(s) if s else None
            if j is None or j - (k - 1) < 0:
                continue
            offset = j - (k - 1)
            score = sum(1 for q in range(1, len(fb)) if offset + q - 1 < len(fa) and fa[offset + q - 1] == fb[q])
            if score > best_score or (score == best_score and offset > best):
                best, best_score = offset, score
    return best


def from_compaction(messages):
    """The messages the check compares: from the last applied compaction block's message on.
    Returns (messages, start index or None when there is no compaction block)."""
    s = compaction_start(messages)
    return ((messages or [])[s:] if s is not None else (messages or [])), s


def _signed_signature(message):
    """The signature of the first compaction block with a summary in a canonical message's content, or None."""
    c = message.get("content") if isinstance(message, dict) else None
    return next((b.get("signature") for b in (c if isinstance(c, list) else [])
                 if isinstance(b, dict) and b.get("type") == "compaction" and b.get("signature") and b.get("content") is not None), None)


def _pick_compaction_request(pending, A_all, kept_at):
    """Which of the pending compaction requests the adopting request took its block from: one whose messages are the
    first messages of the earlier request (or the earlier request's messages plus the reply), and, when a kept thinking
    block fixes the dropped range (kept_at), whose message count equals it; the latest such request wins. Returns
    (label, body, n) or (None, None, 0)."""
    tied = []
    a_fp = [fp(x["msg"]) for x in A_all]
    for label, body in pending or []:
        C_msgs = canon_messages(body.get("messages")) if isinstance(body.get("messages"), list) else []
        n = len(C_msgs)
        c_fp = [fp(x["msg"]) for x in C_msgs]
        # the request carried the first n messages of the earlier request, or every message of it plus the reply and
        # any tool results added before the compaction was sent: either way the block replaces a prefix of the earlier
        # request
        if n and a_fp and (a_fp[:n] == c_fp or c_fp[:len(a_fp)] == a_fp):
            tied.append((label, body, n))
    if kept_at is not None:
        exact = [t for t in tied if t[2] == kept_at]
        if exact:
            return exact[-1]
    return tied[-1] if tied else (None, None, 0)


def diff_pair(reqA, reqB, mint_models=None, compaction_requests=None):
    """mint_models: optional {signature: model id that produced the block}, built by run_diff from the
    capture order. Used only to separate blocks minted by the model now being called from blocks
    minted by another model, which are judged by the model check rather than this prefix comparison.
    compaction_requests: the captured compaction requests (beta compact-2026-09-04) not yet adopted, as (label, body),
    in capture order. When the later request adopts a block, the API checks the kept turns against the system prompt
    and tools of the compaction request that produced it, not the previous turn's, so that request becomes the
    reference side, and the adopting request must have dropped exactly the messages it carried. The result then
    carries adopted_compaction=True and reference_request=<label> (None when no captured request could be tied)."""
    B_sys = canon_system(reqB.get("system"))
    B_tools = canon_tools(reqB.get("tools"), reqB.get("messages"))
    B_msgs = canon_messages(reqB.get("messages"))
    b_start = compaction_start(reqB.get("messages"))
    compaction_note = None
    boundary_notes, boundary_mismatch, adopted, reference, reference_label, block_altered = [], None, False, reqA, None, False
    if b_start is not None:
        # The check restarts at the last applied compaction block. Everything before it is outside the comparison, so
        # the earlier request's messages before that block are replaced by the later request's own copy (identical by
        # construction) and the earlier request is aligned on the same compaction message after it. Indices therefore
        # stay those of the later request as sent, which is what the API's own diagnosis names. If the earlier request
        # does not carry the block (the compaction arrived in the reply to it), nothing after the boundary existed
        # before, so the earlier side contributes no prefix to compare against.
        A_all = canon_messages(reqA.get("messages"))
        signed_blocks = _signed_blocks(reqB.get("messages"))
        target = fp(B_msgs[b_start]["msg"])
        j = next((i for i, x in enumerate(A_all) if fp(x["msg"]) == target), None)
        if j is None:
            # The same signed block with different bytes (a round trip through domain objects trimmed its summary) is an
            # edit to a signed block, which the API rejects: find it by its signature, where the earlier request sent it
            # as a message of its own, so the comparison below reports the byte difference instead of treating the
            # block as new. A block whose signature changed too is caught further down, when nothing else was dropped.
            sig = _signed_signature(B_msgs[b_start]["msg"])
            j = next((i for i, x in enumerate(A_all) if sig and _signed_block_alone([x["msg"]]) and _signed_signature(x["msg"]) == sig), None)
            block_altered = j is not None
        kept_at = (_kept_alignment(A_all, B_msgs)
                   if j is None and b_start == 0 and _signed_block_alone(reqB.get("messages")) else None)
        if j is None and b_start == 0 and _signed_block_alone(reqB.get("messages")):
            label, creq, n = _pick_compaction_request(compaction_requests, A_all, kept_at)
            if kept_at == 1 and _signed_block_alone(reqA.get("messages")) and creq is None:
                # The earlier request already started with a signed block sent alone, the later one replaced it with
                # another block while dropping nothing else, and no captured compaction request ties to it. Compacting
                # again summarizes the old block and everything after it, so a legitimate new block drops more than one
                # message: this is the old block re-sent with an altered signature, an edit the API rejects. Compare the
                # two block messages.
                j, kept_at, block_altered = 0, None, True
        if j is None and b_start == 0 and _signed_block_alone(reqB.get("messages")):
            adopted = True
            if creq is not None:
                # The API checks the kept turns against the system prompt and tools the compaction request had, and
                # the adopting request must drop exactly the messages that request carried (fewer: the model sees
                # them twice; more: the kept turns no longer follow the summarized messages and their thinking fails).
                reference, reference_label = creq, label
                if kept_at is None:
                    # No kept thinking block anchors the dropped range, so take it from the compaction request: the kept
                    # messages are the earlier request's messages after the ones it summarized.
                    kept_at = n
                if kept_at > n:
                    boundary_mismatch = ("the adopting request dropped messages[0..%d] of the earlier request, but the compaction request "
                                         "(%s) carried only messages[0..%d]: the kept turns no longer directly follow the summarized "
                                         "messages, so their thinking fails the check" % (kept_at - 1, label, n - 1))
                elif kept_at < n:
                    boundary_notes.append("the adopting request dropped messages[0..%d] of the earlier request, but the compaction request "
                                          "(%s) carried messages[0..%d]: the summarized messages left behind the block are not rejected, "
                                          "the model sees them twice (summary, then verbatim), and whether the thinking inside them still "
                                          "verifies is not documented -- drop them" % (kept_at - 1, label, n - 1))
                if len(compaction_requests or []) > 1:
                    boundary_notes.append("%d compaction requests were pending; %s is the one whose messages tie to the dropped range"
                                          % (len(compaction_requests), label))
            elif compaction_requests:
                boundary_notes.append("no captured compaction request carries the first messages of the earlier request (%s pending), so "
                                      "the system prompt and tools the summary ran under, and the exact messages it summarized, were "
                                      "not verified" % ", ".join(l for l, _b in compaction_requests))
            else:
                boundary_notes.append("no compaction request was captured before this adoption, so the system prompt and tools it ran "
                                      "under, and the exact messages it summarized, were not verified")
        if j is None and kept_at is not None:
            # A signed block sent first, in place of the messages it summarizes (the compact-2026-09-04 shape): the
            # earlier request lacks the block, but the messages behind it are the earlier request's own later messages,
            # still checked against the summarized ones as they stood when the compaction request was sent. Align the
            # earlier request on a kept thinking block that it still carries (or on the captured compaction request's
            # message count), so an edit to a kept turn is reported.
            A_msgs = B_msgs[:1] + A_all[kept_at:]
            if kept_at >= len(A_all):
                compaction_note = ("the leading compaction block (messages[0] of the later request, which the earlier request does not "
                                   "carry) stands in for every message of the earlier request: nothing of it is kept, and the messages "
                                   "behind the block are taken as new (no kept thinking ties them to the earlier request)")
            else:
                compaction_note = ("compared the kept messages behind a leading compaction block (messages[0] of the later request, "
                                   "which the earlier request does not carry) against messages[%d..] of the earlier request: the block "
                                   "stands in for everything before those messages" % kept_at)
            if reference is not reqA:
                compaction_note += ("; system and tools on this pair are compared against the compaction request %s, which is what "
                                    "the API checks the kept turns against, not against the earlier turn" % reference_label)
        elif j is None and b_start == 0 and _has_signed_block((reqB.get("messages") or [None])[0]):
            A_msgs = B_msgs[:b_start]
            # with two signed blocks the warning below says why nothing was compared; this note would give a wrong reason
            compaction_note = None if len(signed_blocks) > 1 else ("the later request starts with a compaction block the earlier request does not carry, and no kept "
                               "thinking block behind it (in a message of its own, signed) ties the kept messages to the earlier "
                               "request: nothing was compared. The signed-block shape is checked only when the block is sent as a "
                               "message of its own and a kept turn's thinking, or a captured compaction request, ties it to the "
                               "earlier request")
        elif j is None:
            A_msgs = B_msgs[:b_start]
            compaction_note = ("compared from the compaction block in messages[%d] of the later request, which the earlier request "
                               "does not carry (it arrived in the reply): the check restarts there, so nothing before it is compared" % b_start)
        else:
            A_msgs = B_msgs[:b_start] + A_all[j:]
            compaction_note = ("compared from the compaction block in messages[%d] of the later request (messages[%d] of the earlier one): "
                               "the check restarts there, so earlier messages and thinking are outside it" % (b_start, j))
    else:
        A_msgs = canon_messages(reqA.get("messages"))
        signed_blocks = []
    A_sys = canon_system(reference.get("system"))
    A_tools = canon_tools(reference.get("tools"), reference.get("messages"))
    ambiguous_note = None
    if len(signed_blocks) > 1:
        # The API takes exactly one signed block with content per request (a duplicated block is a 400), so this
        # comparison describes a request the API rejects outright; reported as a warning, the way a broken chain is.
        ambiguous_note = ("%d signed compaction blocks with content (%s): the API accepts one per request and rejects this "
                          "request with a 400 -- send only the block the last compaction returned"
                          % (len(signed_blocks), ", ".join(signed_blocks)))

    sys_notes = diff_system(A_sys, B_sys)
    tool_notes, set_changed = diff_tools(A_tools, B_tools)
    msg = diff_messages(A_msgs, B_msgs)
    if boundary_mismatch and not (msg and msg.get("kind")):
        # Too many messages dropped at adoption: reported as the kept turns' thinking failing, the way the API would
        msg = {"kind": "blocks_removed", "pattern": "tail_kept", "changed_validated": "messages.1", "notes": [boundary_mismatch],
               "first_changed_msg": 1, "thinking_notes": list((msg or {}).get("thinking_notes", []))}
    elif boundary_mismatch:
        # every kept block fails from the boundary, whatever the edit inside the kept turns
        msg.setdefault("notes", []).append(boundary_mismatch)
        msg["first_changed_msg"], msg["first_changed_wire"] = 1, None
    if block_altered and msg and msg.get("kind"):
        msg.setdefault("notes", []).append("messages[0] is the signed compaction block of the earlier request with different bytes: the API "
                                           "rejects the whole request (a 400 whose error.details.error_code starts with compaction_) rather than dropping "
                                           "thinking, so the block counts on this row are what a corrected request would replay")

    in_check = [(i, w) for i, w in thinking_positions(B_msgs) if b_start is None or i >= b_start]   # blocks the check can judge
    replayed = len(in_check)
    demoted = []
    if adopted and replayed == 0 and (sys_notes or tool_notes):
        # The block stands first with no kept thinking behind it (a full compaction, or kept turns without thinking),
        # so a changed system prompt or tool set has nothing to invalidate: the declared boundary the recipe
        # recommends (compact everything, then change), accepted by the API. Reported as a note, not an edit.
        demoted = ["%s changed at a compaction boundary with no kept thinking behind the block: accepted by the API, "
                   "nothing to fail (%s)" % (" and ".join(s for s, n in (("system", sys_notes), ("tools", tool_notes)) if n),
                                              "; ".join(sys_notes + tool_notes))]
        sys_notes, tool_notes = [], []

    sections = []
    if sys_notes:
        sections.append("system")
    if tool_notes:
        sections.append("tools")
    if msg and msg.get("kind"):
        sections.append("messages")

    result = {"replayed_thinking_blocks": replayed, "sections": sections, "notes": [], "thinking_notes": []}
    if b_start is not None:
        result["compaction_boundary"] = b_start
    if adopted:
        result["adopted_compaction"] = True
        result["reference_request"] = reference_label
    if msg:
        result["thinking_notes"] = list(msg.get("thinking_notes", []))
    if ambiguous_note:
        result["thinking_notes"].append(ambiguous_note)
    extra_notes = demoted + boundary_notes
    if B_tools[1] and _carries_tool_changes(reqB.get("messages")):
        extra_notes.append("the compaction block carries tool_changes, which this script does not read: an edit to a "
                           "deferred tool that only the summarized messages named is reported on the first request "
                           "that carries the block and not on later ones")
    # The model is not part of the compared prefix, so a model change is NOT a prefix edit and never
    # turns a match into a mismatch. It is reported separately because the API runs a second, model
    # check on every replayed block, whose drops carry reason model_binding_mismatch.
    model_a, model_b = reqA.get("model"), reqB.get("model")
    if model_a and model_b and model_a != model_b:
        result["model_switch"] = {"from": model_a, "to": model_b}
        if replayed:
            model_note = (
                "model switch: %s -> %s with %d replayed thinking block(s). Not a prefix edit (the model is not part of what the "
                "signature binds), so this pair still reads as %s for the prefix check; the model check decides separately whether "
                "%s can read blocks produced by %s (a drop shows as reason=model_binding_mismatch, not prefix_binding_mismatch)."
                % (model_a, model_b, replayed, "MATCH" if not sections else "MISMATCH", model_b, model_a))
            if sections:
                model_note += (" If %s cannot read blocks produced by %s (a switch to an older model), the model check drops them as "
                               "model_binding_mismatch before the prefix check sees them, so this edit goes unreported on this request and "
                               "surfaces on the next request that runs on a model that can read them; if it can read them (a switch to a "
                               "newer model), the prefix check applies now." % (model_b, model_a))
        else:
            model_note = "model switch: %s -> %s (no replayed thinking block, so nothing for the model check to read)" % (model_a, model_b)
    else:
        model_note = None

    if not sections:
        result["verdict"] = "match"
        if msg and msg.get("branch"):
            result["notes"] = msg.get("notes", [])
            result["branch"] = True
        if result["thinking_notes"]:
            result["verdict"] = "chain-warning"
        if model_note:
            result["notes"].append(model_note)
        if compaction_note:
            result["notes"].append(compaction_note)
        result["notes"].extend(extra_notes)
        return result

    result["verdict"] = "mismatch"
    result["notes"] = sys_notes + tool_notes + (msg.get("notes", []) if msg and msg.get("kind") else [])
    if model_note:
        result["notes"].append(model_note)
    if compaction_note:
        result["notes"].append(compaction_note)
    result["notes"].extend(extra_notes)
    # kind / pattern in the API's words
    if len(sections) == 1:
        if sections == ["system"]:
            result.update(kind="system_changed", pattern="system_rerendered", changed_validated="system.%s" % next((n.split("[")[1].split("]")[0] for n in sys_notes if n.startswith("system[")), "0"))
        elif sections == ["tools"]:
            result.update(kind="tools_changed", pattern="tool_set_changed" if set_changed else "tool_schema_changed",
                          changed_validated="tools")
        else:
            result.update(kind=msg["kind"], pattern=msg["pattern"], changed_validated=msg.get("changed_validated"),
                          position=msg.get("position"))
    else:
        result["kind"] = "multiple"
        if "messages" in sections:
            result["pattern"] = msg["pattern"]
            result["changed_validated"] = msg.get("changed_validated")
            result["position"] = msg.get("position")
        else:
            result["pattern"] = "system_and_tools_changed"
            result["changed_validated"] = "system" if "system" in sections else "tools"
    for k in ("items_removed", "items_inserted", "items_modified", "messages_delta"):
        if msg and k in msg:
            result[k] = msg[k]
    # which replayed thinking blocks would fail: every one if system/tools changed,
    # else every one at or after the first changed message (request N+1 coordinates)
    tp = in_check
    if "system" in sections or "tools" in sections:
        failing = tp
    else:
        fc = msg.get("first_changed_msg", 0)          # same index in request N+1: later messages moved up to it
        fw = msg.get("first_changed_wire")             # (msg index, wire block index) for an in-place edit
        if fw and fw[0] == fc and fw[1] >= 0:
            failing = [(i, w) for i, w in tp if i > fc or (i == fc and w > fw[1])]
        else:
            failing = [(i, w) for i, w in tp if i >= fc]
    # blocks minted by a model other than the one this request calls are judged by the model check, and their
    # prefix record belongs to the model that minted them; count them apart so the expectation is not overstated
    if mint_models:
        sig_at = {(i, w): s for i, x in enumerate(B_msgs) for w, s in x["sigs"]}
        own, foreign = [], {}
        for pos in failing:
            m = mint_models.get(sig_at.get(pos))
            if m and reqB.get("model") and _model_key(m) != _model_key(reqB.get("model")):
                foreign[m] = foreign.get(m, 0) + 1
            else:
                own.append(pos)
        if foreign:
            result["thinking_blocks_minted_by_other_models"] = foreign
            result["notes"].append("%d replayed thinking block(s) minted by another model (%s) are not counted below: the model check "
                                   "decides whether %s reads them, and their prefix record belongs to the model that produced them."
                                   % (sum(foreign.values()), ", ".join("%s x%d" % kv for kv in sorted(foreign.items())), reqB.get("model")))
        failing = own
    result["thinking_blocks_that_would_fail"] = len(failing)
    result["first_failing_thinking_msg"] = failing[0][0] if failing else None
    return result



def diff_compaction_request(prev, creq):
    """Check a captured compaction request (beta compact-2026-09-04) against the conversation turn before it. The API
    verifies the kept turns' thinking only while the system prompt and the tools other than defer_loading ones match
    the compaction request, so a summarizer prompt or a trimmed tool set on that request fails every kept block at
    adoption: reported as a mismatch here, where it is caused (a note when the request summarizes the whole turn, since
    nothing of it is kept). Its messages should be the first messages of the turn before it, or all of them plus the
    reply and any tool results added before the compaction was sent (the recipe: compact exactly the messages of a
    request already sent); anything else is a warning. A different model is a note: the block is accepted, and whether
    the kept thinking survives is the model check's call."""
    result = {"compaction_request": True, "replayed_thinking_blocks": 0, "sections": [], "notes": [], "thinking_notes": []}
    if not isinstance(creq.get("messages"), list) or not isinstance(prev.get("messages"), list):
        result["thinking_notes"].append("the compaction request or the turn before it has no messages list: not checked")
        result["verdict"] = "chain-warning"
        return result
    P_msgs, C_msgs = canon_messages(prev.get("messages")), canon_messages(creq.get("messages"))
    sys_notes = diff_system(canon_system(prev.get("system")), canon_system(creq.get("system")))
    tool_notes, set_changed = diff_tools(canon_tools(prev.get("tools"), prev.get("messages")),
                                         canon_tools(creq.get("tools"), creq.get("messages")))
    n = len(C_msgs)
    p_fp, c_fp = [fp(x["msg"]) for x in P_msgs], [fp(x["msg"]) for x in C_msgs]
    if n == 0:
        result["thinking_notes"].append("the compaction request carries no messages: the API rejects a request with nothing to summarize")
    elif n < len(P_msgs) and p_fp[:n] == c_fp:
        result["notes"].append("summarizes messages[0..%d] of the previous turn; messages[%d..] would be kept behind the block" % (n - 1, n))
    elif n == len(P_msgs) and p_fp == c_fp:
        result["notes"].append("summarizes every message of the previous turn; nothing of it is kept behind the block (turns taken "
                               "while the summary ran are kept, and are checked at adoption)")
    elif P_msgs and c_fp[:len(P_msgs)] == p_fp:
        result["notes"].append("summarizes every message of the previous turn and the %d message(s) that followed it (the reply and "
                               "any tool results): nothing of the previous turn is kept behind the block" % (n - len(P_msgs)))
    else:
        result["thinking_notes"].append("the compaction request's %d message(s) are neither the first messages of the previous turn "
                                        "(which has %d) nor all of them plus what followed: compact exactly the messages of a request "
                                        "already sent, so the kept turns directly follow the summarized ones" % (n, len(P_msgs)))
    if prev.get("model") and creq.get("model") and prev["model"] != creq["model"]:
        result["model_switch"] = {"from": prev["model"], "to": creq["model"]}
        result["notes"].append("the compaction request runs on %s, the conversation on %s: the API accepts the block on any model "
                               "that supports the beta, but thinking in the turns kept after the block stays valid only if every "
                               "compaction request since it was produced ran on a model with preserved thinking, and only on a "
                               "model that can read it. This script cannot check either, so a MATCH on the pair that follows does "
                               "not cover them -- if unsure, send compaction requests to the conversation's model"
                               % (creq["model"], prev["model"]))
    sections = [s for s, notes in (("system", sys_notes), ("tools", tool_notes)) if notes]
    if sections and P_msgs and n >= len(P_msgs) and c_fp[:len(P_msgs)] == p_fp:
        result["notes"].append("the %s on the compaction request %s from the conversation's, but nothing of the previous turn is kept "
                               "behind the block, so no kept thinking of this turn fails; thinking in turns taken while the summary "
                               "ran would fail (%s)" % (" and ".join(("system prompt" if s == "system" else "tool set") for s in sections),
                                                    "differ" if len(sections) > 1 else "differs", "; ".join(sys_notes + tool_notes)))
        sections = []
    if not sections:
        result["verdict"] = "chain-warning" if result["thinking_notes"] else "match"
        return result
    result["sections"] = sections
    result["verdict"] = "mismatch"
    result["notes"] = sys_notes + tool_notes + result["notes"] + [
        "the compaction request ran under a different %s than the conversation: the kept turns' thinking verifies only "
        "while system and the non-deferred tools match the compaction request, so every kept block fails at adoption. Send "
        "the conversation's own system and tools on the compaction request, and put a summarization prompt in "
        "compaction.instructions" % " and ".join(("system prompt" if s == "system" else "tool set") for s in sections)]
    if sections == ["system"]:
        result.update(kind="system_changed", pattern="system_rerendered",
                      changed_validated="system.%s" % next((x.split("[")[1].split("]")[0] for x in sys_notes if x.startswith("system[")), "0"))
    elif sections == ["tools"]:
        result.update(kind="tools_changed", pattern="tool_set_changed" if set_changed else "tool_schema_changed", changed_validated="tools")
    else:
        result.update(kind="multiple", pattern="system_and_tools_changed", changed_validated="system")
    kept = [i for i, _w in thinking_positions(P_msgs) if i >= n]
    result["thinking_blocks_that_would_fail"] = len(kept)
    result["first_failing_thinking_msg"] = (kept[0] - n + 1) if kept else None
    return result


# ----------------------------------------------------------------------------- output


def header_line(r):
    parts = ["kind=%s" % r.get("kind"), "pattern=%s" % r.get("pattern")]
    if r.get("sections"):
        parts.append("sections=%s" % ",".join(r["sections"]))
    if r.get("changed_validated"):
        parts.append("changed_validated=%s" % r["changed_validated"])
    if r.get("position"):
        parts.append("position=%s" % r["position"])
    if r.get("model_switch"):
        parts.append("model_switch=%s->%s" % (r["model_switch"]["from"], r["model_switch"]["to"]))
    for k in ("items_removed", "items_inserted", "items_modified"):
        if k in r:
            parts.append("%s=%d" % (k.replace("items_", ""), r[k]))
    if "messages_delta" in r:
        parts.append("messages_delta=%d" % r["messages_delta"])
    return "; ".join(parts)


def print_pair(la, lb, r):
    tag = {"match": "MATCH", "mismatch": "MISMATCH", "chain-warning": "CHAIN-BREAK"}[r["verdict"]]
    print("%s -> %s: %s" % (la, lb, tag + (" (compaction request)" if r.get("compaction_request") else "")))
    if r["verdict"] == "mismatch":
        print("    " + header_line(r))
    elif r.get("model_switch"):
        print("    model_switch=%s->%s" % (r["model_switch"]["from"], r["model_switch"]["to"]))
    if r.get("compaction_request"):
        if r["verdict"] == "mismatch":
            n = r.get("thinking_blocks_that_would_fail", 0)
            if n:
                print("    kept thinking blocks of the previous turn that fail at adoption: %d (first one at messages[%s] of the adopting "
                      "request); thinking in turns taken while the summary ran fails too" % (n, r.get("first_failing_thinking_msg")))
            else:
                print("    kept thinking blocks of the previous turn that fail at adoption: none; thinking in turns taken while the "
                      "summary ran fails")
        for n in r.get("notes", []):
            print("    " + n)
        for n in r.get("thinking_notes", []):
            print("    ! " + n)
        return
    print("    replayed thinking blocks in the later request: %d" % r["replayed_thinking_blocks"]
          + ("  (a match proves nothing about binding when this is 0)" if r["replayed_thinking_blocks"] == 0 else ""))
    if r["verdict"] == "mismatch":
        n = r.get("thinking_blocks_that_would_fail", 0)
        if n:
            print("    thinking blocks that would be dropped/rejected: at most %d (first one in messages[%s]; a block minted before a later-referenced tool or tool_addition entered the prefix is not bound to it, so the API's count can be lower)" % (n, r.get("first_failing_thinking_msg")))
        else:
            print("    no replayed thinking block sits after the change -- nothing would be dropped on THIS request, but the edit is still a bug")
    for n in r.get("notes", []):
        print("    " + n)
    for n in r.get("thinking_notes", []):
        print("    ! " + n)


def run_diff(args):
    loaded = load_requests(args.paths)
    convs = []
    for _l, _b, c in loaded:
        if c not in convs:
            convs.append(c)
    multi = len(convs) > 1
    results, compared = [], 0
    for conv in convs:
        captured = [(l, b) for l, b, c in loaded if c == conv]
        display = os.path.basename(conv) or conv or "(command line)"
        n_turns = sum(1 for _l, b in captured if not is_compaction_request(b))
        if multi and n_turns < 2:
            sys.stderr.write("%s: only %d conversation turn(s), nothing to compare within it (pairs never cross conversations)\n"
                             % (display, n_turns))
            continue
        if multi and not args.json:
            print("== conversation %s ==" % display)
        before = len(results)
        diff_conversation(captured, args, results)
        if multi:
            for r in results[before:]:
                r["conversation"] = display
        compared += 1
    if not compared:
        raise SystemExit("need at least two request bodies of one conversation (a .jsonl capture, two .json files, or a directory)")
    if args.json:
        print(json.dumps(results, indent=2))
    n_bad = sum(1 for r in results if r["verdict"] == "mismatch")
    n_chain = sum(1 for r in results if r["verdict"] == "chain-warning")
    if not args.json:
        print("\n%d pair(s) compared, %d mismatch(es), %d chain break(s)." % (len(results), n_bad, n_chain))
    return 1 if (n_bad or n_chain) else 0


def diff_conversation(captured, args, results):
    """Diff the (label, body) turns of ONE conversation in send order, appending a record per pair
    to results. Pairs never cross conversations: run_diff calls this once per conversation."""
    # A body carrying the top-level compaction field is a compaction request (beta compact-2026-09-04), not a
    # conversation turn: its reply is the block. It is checked against the turn before it (diff_compaction_request)
    # and then held as the reference for the request that adopts its block; it is never paired as a turn itself.
    # The capture is read in send order: a compaction request is expected before the request that adopts its block.
    bodies, comp_after = [], {}
    for l, b in captured:
        if is_compaction_request(b):
            comp_after.setdefault(len(bodies) - 1, []).append((l, b))
        else:
            bodies.append((l, b))
    pending = list(comp_after.pop(-1, []))
    if pending:
        sys.stderr.write("%d compaction request(s) captured before any conversation turn, not checked against one: %s\n"
                         % (len(pending), ", ".join(l for l, _b in pending)))
    if len(bodies) < 2:
        raise SystemExit("need at least two request bodies (a .jsonl capture, two .json files, or a directory)")
    # which model minted each replayed block: a signature first seen in request N+1 was produced by request N's model
    mint_models, seen = {}, set()
    for _l, body in bodies:
        for m in body.get("messages") or []:
            for blk in (m.get("content") if isinstance(m.get("content"), list) else []):
                if isinstance(blk, dict) and blk.get("type") == "thinking" and blk.get("signature"):
                    seen.add(blk["signature"])
    seen_so_far = set()
    for idx, (_l, body) in enumerate(bodies):
        for m in body.get("messages") or []:
            for blk in (m.get("content") if isinstance(m.get("content"), list) else []):
                if isinstance(blk, dict) and blk.get("type") == "thinking" and blk.get("signature") and blk["signature"] not in seen_so_far:
                    seen_so_far.add(blk["signature"])
                    if idx > 0 and bodies[idx - 1][1].get("model"):
                        mint_models[blk["signature"]] = bodies[idx - 1][1]["model"]
    last_on_model = {}
    for idx, ((la, a), (lb, b)) in enumerate(zip(bodies, bodies[1:])):
        for lc, c in comp_after.get(idx, []):
            rc = diff_compaction_request(a, c)
            results.append({"from": la, "to": lc, **rc})
            if not args.json:
                print_pair(la, lc, rc)
            pending.append((lc, c))
        r = diff_pair(a, b, mint_models, compaction_requests=pending)
        pending_here = list(pending)
        if r.get("adopted_compaction"):
            # the adopted request and any older one are done with; a request captured after it stays pending. When no
            # captured request tied to this adoption, every pending one is older than the block and is dropped too.
            used = r.get("reference_request")
            cut = next((i for i, (l, _c) in enumerate(pending) if l == used), len(pending) - 1)
            pending = pending[cut + 1:]
        if a.get("model"):
            last_on_model[_model_key(a["model"])] = idx
        # on a switch pair with an edit, also compare against the last request that ran on the model now being
        # called: the prefix check judges a block against the prefix it was minted under, so a prompt or tool set
        # that is the same on every request of that model is not reported by the API even though this pair differs
        if (r.get("model_switch") and r["verdict"] == "mismatch" and _model_key(b.get("model")) in last_on_model
                and not r.get("reference_request")):
            # (when the pair's reference is a compaction request, its system/tools difference is against that request,
            # not the previous turn, so the per-model-prompt downgrade below does not apply)
            k = last_on_model[_model_key(b["model"])]
            same = diff_pair(bodies[k][1], b, mint_models, compaction_requests=pending_here)
            if not same.get("sections") and not same.get("thinking_notes"):
                # The API judges each block against the request that produced it, not against the previous request.
                # The last request on this model is an unchanged prefix of this one, so every block this model minted
                # is replayed under the prefix it was minted with: the API reports nothing here. Downgrade the verdict
                # and keep the previous-request difference as a note.
                r["same_model_prefix_unchanged"] = bodies[k][0]
                r["previous_request_diff"] = header_line(r)
                r["verdict"] = "match"
                r["thinking_blocks_that_would_fail"] = 0
                r["first_failing_thinking_msg"] = None
                r["notes"] = [n for n in r["notes"] if not n.startswith("model switch:")] + [
                    "differs from the previous request (%s), but that request ran on another model: against %s, the last request "
                    "that ran on %s, nothing the check compares has changed, so the blocks this model produced are replayed under the "
                    "prefix they were minted with and the API reports nothing on this request (the other model's turns still lose "
                    "this model's blocks through the model check, and blocks the other model produced are judged against its own "
                    "requests, where that model records a prefix at all). A prompt or tool set that is a pure function of the model called "
                    "is stable on each model's own turns; confirm with the probe." % (r["previous_request_diff"], bodies[k][0], b["model"])]
        results.append({"from": la, "to": lb, **r})
        if not args.json:
            print_pair(la, lb, r)
    for lc, c in comp_after.get(len(bodies) - 1, []):
        rc = diff_compaction_request(bodies[-1][1], c)
        results.append({"from": bodies[-1][0], "to": lc, **rc})
        if not args.json:
            print_pair(bodies[-1][0], lc, rc)
        pending.append((lc, c))
    if pending:
        sys.stderr.write("%d compaction request(s) whose block no later request in the capture adopted: %s\n"
                         % (len(pending), ", ".join(l for l, _c in pending)))


# ----------------------------------------------------------------------------- scan mode

# Each lead: (title, line pattern, context pattern or None, context window in lines, scope)
# scope "toolfn" = only inside a function whose name mentions tool (append/extend/push leads).
LEADS = [
    ("system prompt re-rendered (time, counters, live state in the system prompt)",
     r"^(?!.*\b(log|logger|LOG|logging|audit|print|console\.|metrics|trace)\b).*(datetime\.(now|utcnow|today)\(|date\.today\(|time\.(time|strftime|ctime)\(|new Date\(|Date\.now\(|time\.Now\(|Time\.now|DateTime\.(Now|UtcNow)|moment\(|dayjs\(|\bstrftime\(|\btoISOString\()",
     r"(system|SYSTEM|prompt|Prompt|PROMPT|template|TEMPLATE|instructions|persona|PERSONA|preamble|boilerplate|BOILERPLATE|opener|render|\.format\(|f\"|f'|\$\{|%\s*[\w{(])", 8, None),
    ("system prompt re-rendered (environment, ids or random values interpolated into prompt text)",
     r"(os\.environ|process\.env|getenv\(|uuid|Math\.random\(|random\.choice|request_id|session_id|user_id|cwd\(\)|getcwd\(\)|hostname)",
     r"(system|prompt|instructions|persona)\b.*(=|\+|format|f\"|f'|\$\{|\.replace\()|(\.format\(|f\"|f'|\$\{).*(system|prompt|instructions)", 0, "sameline"),
    ("tool set changed mid-conversation (tools list mutated after the first request)",
     r"(\btools?\b\s*(\.append|\.push|\.extend|\.remove|\.pop|\.splice|\.filter|\.concat|\s*=\s*\[|\s*\+=|\s*=\s*\w+\s*\+)|\[['\"]tools['\"]\]\s*=|\.tools\s*=|del\s+tools\[|list_tools\(|listTools\(|get_tools\(|getTools\(|available_tools|plugin_tools|mcp.*(connect|tools)|(\+=|\.append\(|\.extend\(|\.push\(|\.concat\().*(functions\(\)|tools\(\)|plugin|mcp|connector))",
     None, 0, None),
    ("tool set changed mid-conversation (a list built inside a tool-related function)",
     r"(\.append\(|\.extend\(|\.push\(|\.concat\()", None, 0, "toolfn"),
    ("tool definitions re-rendered (same names, description/schema text rebuilt each request)",
     r"(description[\"']?\s*[:=]\s*f[\"']|description[\"']?\s*[:=].*(\$\{|\.format\(|\+\s*\w|%\s*[\w(])|input_schema[\"']?\s*[:=].*(\$\{|\.format\()|render_tool_(def|definition|schema|description)s?\(|describe_tools?\(|tool_description\(|build_tool_(def|definition|schema)s?\()",
     None, 0, None),
    ("older turns dropped or collapsed (sliding window / keep-last / compaction)",
     r"([\w.]+\s*\[\s*-\s*[\w.]+\s*:\s*\]|[\w.]+\s*\[\s*[\w.]+\s*:\s*\]\s*$|\.slice\(\s*-\s*[\w.]+\s*\)|\.splice\(\s*0\s*,|len\([\w.]+\)\s*-\s*[\w.]+\s*:|\.shift\(\)|\.pop\(\s*0\s*\)|del\s+[\w.]+\[\s*0|keep_last|keepLast|max_turns|maxTurns|max_messages|maxMessages|max_history|maxHistory|window_size|windowSize|\bwindow\b|summar(y|ize|ise|ies)\b|compact|recap|condense|\bfold\b|digest|gist)",
     r"messages|history|turns|conversation|transcript|context|memory|chat|thread|dialogue|exchange|convo", 4, None),
    ("opening message rewritten (message 0 rebuilt from current state each request)",
     r"([\w.]+\s*\[\s*0\s*\]\s*(=|\[.content.\]\s*=|\.content\s*=)|first_message|firstMessage|opening_message|context_header|contextHeader|build_context\(|buildContext\(|initial_context|initialContext)",
     r"messages|history|conversation|transcript|turns|thread|dialogue|exchange|convo", 3, None),
    ("old tool results rewritten (truncated / cleared after they were sent)",
     r"(\[\s*:\s*\d|\[\s*:\s*[A-Z_]+\s*\]|truncat|\.\.\.\[|\.slice\(0|shorten|elide|clear_old|micro.?compact|\[truncated\]|\[\"']content[\"']\]\s*=|\.content\s*=)",
     r"tool_result|toolResult|tool_results|results?\b|output", 3, None),
    ("per-turn reminder injected then stripped",
     r"(system-reminder|system_reminder|<reminder|reminder>|\bremind(er)?s?\b.*(strip|remove|re\.sub|replace|filter|del\b|pop)|(strip|remove|re\.sub|replace|filter)\(.*remind|\bnote\b.*(strip|remove|replace\())",
     None, 0, None),
    ("message content rewritten in place with a regex or replace (generic)",
     r"(re\.sub\(|\.replace\(|re\.subn\(|\.replaceAll\()",
     r"(content|text|message|msg|turn)\b.*(re\.sub\(|\.replace\(|\.replaceAll\()|(re\.sub\(|\.replace\().*(content|text|message|msg)", 0, "sameline"),
    ("thinking blocks removed or reordered (only a contiguous window of the original blocks replays; a middle gap or a reorder fails)",
     r"([\"']thinking[\"'].*(filter|remove|del\b|not in|!=|strip|pop)|(filter|remove|del\b|strip|!=|not in).*[\"']thinking[\"']|redacted_thinking|\bsignature\b)",
     None, 0, None),
    ("history re-serialised (lossy round trip through the app's own message model)",
     r"(json\.loads\(json\.dumps\(|JSON\.parse\(JSON\.stringify\(|to_dict\(\)|from_dict\(|from_json\(|as_json\(|to_json\(|fromJSON\(|toJSON\(|model_dump\(|model_dump_json\(|model_validate\(|model_validate_json\(|marshal|pydantic|dataclasses\.asdict|\.strip\(\)|normalize|normalise|sort_keys|indent=|\.dict\(\)|parse_obj\(|default=str)",
     r"messages|history|content|transcript|turns|conversation|thread|dialogue|exchange|convo", 4, None),
    ("media in earlier turns dropped or re-encoded (client media cap, resize, URL re-sign)",
     r"(max_images|maxImages|image_cap|image_limit|strip.*image|image.*(strip|drop|remove|resize|downscale|cap\b)|attachments?\b.*(\[\s*:|\[-|filter|remove|drop|cap)|presign|signed_url|signedUrl|expires_in|\bresize\(|thumbnail|(kind|type)\s*!==?\s*[\"'](image|document)|(filter|\bfor\b.*\bin\b|\bif\b|\bnot\b|&&|\|\|).*(kind|type)\s*===?\s*[\"'](image|document)[\"']|pictures?|photos?\b.*(drop|remove|stale|old))",
     None, 0, None),
    # --- structural leads (shape of the code rather than names) ---
    ("system prompt produced by a call at request time (read that function for anything per-request: time, user, state)",
     r"[\"']?system[\"']?\s*[:=]\s*(?![\"'\[f])[\w.]+\(",
     None, 0, None),
    ("a time or date value passed into a prompt builder or template (the rendered prompt changes every call)",
     r"(\.format\([^)]*\b\w*(now|today|date|time|clock|stamp)\w*\s*=|\b(prompt|system|rules|instructions|persona|preamble|render|compose|build|banner|header|brief|opener)\w*\([^)]*\b\w*(now|today|clock|stamp)\w*\(\))",
     None, 0, None),
    ("opening message produced by a call and placed first (rebuilt from current state each request)",
     r"(\[\s*\w[\w.]*\([^)]*\)\s*,\s*(\.\.\.|\*)|\b(opening|opener|first|banner|preface|header|brief)\w*\([^)]*\)\s*,\s*(\.\.\.|\*)|^\s*[\w.]+\s*\[\s*0\s*\]\s*=\s*\{)",
     None, 0, None),
    ("a placeholder written into a content block (an earlier block replaced by a caption)",
     r"[\"']text[\"']\s*:\s*[\"'][^\"']*(omitted|no longer|earlier|elided|removed|truncated|redacted|placeholder|not shown|dropped)[^\"']*[\"']",
     None, 0, None),
    ("media counted against a budget while walking the history (older images or documents replaced or dropped)",
     r"\b(seen|count|kept|shown|n_media|n_images)\s*\+=\s*1",
     r"image|document|media|attachment|still|picture|photo|frame|visual", 3, None),
    ("turns removed in a loop until a budget fits (sliding window by tokens)",
     r"(\.splice\(\s*\d+\s*,\s*\d+\s*\)|\.shift\(\)|\.pop\(\s*0\s*\)|del\s+[\w.]+\[\s*\d+\s*\]|\.splice\(\s*\d+\s*,\s*0\s*,)",
     r"while|budget|tokens?|fit|limit|estimate|recap|summar|digest|gist|fold", 3, None),
    ("text blocks filtered by prefix (an injected note removed on replay)",
     r"(startswith|startsWith)\(",
     r"text|content|note|hint|remind", 0, "sameline"),
]
DEFAULT_EXT = "py,ts,tsx,js,jsx,mjs,go,rb,java,kt,rs,cs,php,scala,swift"
SKIP_DIRS = {".git", "node_modules", "dist", "build", "__pycache__", ".venv", "venv", "vendor", "target", ".next", "coverage", ".claude"}


def run_scan(args):
    exts = tuple("." + e.strip().lstrip(".") for e in args.ext.split(","))
    root = args.paths[0]
    if not os.path.isdir(root):
        raise SystemExit("--scan needs a directory (got %s)" % root)
    compiled = [(title, re.compile(pat, re.I), re.compile(ctx, re.I) if ctx else None, win, scope) for title, pat, ctx, win, scope in LEADS]
    fn_re = re.compile(r"^\s*(?:async\s+)?(?:def|function|func|fn|fun)\s+(\w+)|^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|^\s*(?:public|private|protected|static|\s)*\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[\w<>\[\]|, ]+)?\s*\{")
    hits = {title: [] for title, _, _, _, _ in LEADS}
    nfiles = 0
    own_dir = os.path.dirname(os.path.abspath(__file__))   # never scan this skill's own scripts
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and os.path.abspath(os.path.join(dirpath, d)) != own_dir]
        if os.path.abspath(dirpath) == own_dir:
            continue
        for fn in filenames:
            if not fn.endswith(exts):
                continue
            path = os.path.join(dirpath, fn)
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    lines = f.read().split("\n")
            except OSError:
                continue
            nfiles += 1
            current_fn = ""
            for i, line in enumerate(lines):
                m = fn_re.match(line)
                if m:
                    current_fn = next((g for g in m.groups() if g), "") or ""
                if len(line) > 400 or line.lstrip().startswith(("#", "//", "*", "/*")):
                    continue
                const_array = re.match(r"^\s*(export\s+)?(const|let|var|final|static)?\s*[A-Z][A-Z0-9_]*\s*(:[^=]+)?=\s*\[", line)
                for title, pat, ctx, win, scope in compiled:
                    if not pat.search(line):
                        continue
                    if const_array and title.startswith("tool set changed"):
                        continue
                    if scope == "toolfn" and not re.search(r"tool|function|capabilit|abilit|available|enabled|allowed", current_fn, re.I):
                        continue
                    if scope == "sameline":
                        if ctx is not None and not ctx.search(line):
                            continue
                    elif ctx is not None:
                        lo, hi = max(0, i - win), min(len(lines), i + win + 1)
                        if not any(ctx.search(lines[q]) for q in range(lo, hi)):
                            continue
                    hits[title].append((os.path.relpath(path, root), i + 1, line.strip()))
    print("prefix_diff --scan: %d file(s) read under %s" % (nfiles, root))
    print("These are regex LEADS (places worth reading), not findings. Confirm each one with the")
    print("request-pair diff or the API's input_transformations / anthropic-thinking-prefix-mismatch response.\n")
    total = 0
    for title, _, _, _, _ in LEADS:
        rows = hits[title]
        if not rows:
            continue
        total += len(rows)
        print("== %s  (%d lead%s)" % (title, len(rows), "" if len(rows) == 1 else "s"))
        for path, ln, src in rows[: args.max_per_cause]:
            print("   %s:%d    %s" % (path, ln, src[:140]))
        if len(rows) > args.max_per_cause:
            print("   ... %d more" % (len(rows) - args.max_per_cause))
        print()
    if total == 0:
        print("no leads matched. That is not proof of compliance -- run the request-pair diff on a capture.")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("paths", nargs="+", help="capture.jsonl | reqA.json reqB.json | directory of captures   (or a repository root with --scan)")
    ap.add_argument("--json", action="store_true", help="machine-readable output (diff mode)")
    ap.add_argument("--scan", action="store_true", help="scan a repository for likely causes instead of diffing requests")
    ap.add_argument("--ext", default=DEFAULT_EXT, help="comma-separated source extensions for --scan")
    ap.add_argument("--max-per-cause", type=int, default=25)
    args = ap.parse_args(argv)
    return run_scan(args) if args.scan else run_diff(args)


if __name__ == "__main__":
    sys.exit(main())
