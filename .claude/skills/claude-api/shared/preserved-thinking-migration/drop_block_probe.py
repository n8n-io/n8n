#!/usr/bin/env python3
"""drop_block_probe.py -- replay a captured conversation against the Messages API with the
preserved thinking controls turned on, and report what the API drops and why.

Dependency-free (Python 3.8+, urllib only). Credentials come from the environment and are never
printed: ANTHROPIC_API_KEY (sent as x-api-key) or ANTHROPIC_AUTH_TOKEN (sent as
"Authorization: Bearer ..."; for example the short-lived token an OAuth login provides). When both
are set only the token is sent -- the API rejects a request carrying both headers. A bearer token
also gets the oauth-2025-04-20 beta value, which the API requires for OAuth and workload-identity
tokens.

    python3 drop_block_probe.py capture.jsonl --yes            # replay, mode drop_block (without --yes: plan only)
    python3 drop_block_probe.py capture.jsonl --yes --mode error   # the loud arm (expect 400s)
    python3 drop_block_probe.py captures/ --yes                # one conversation per *.jsonl file
    python3 drop_block_probe.py captures/ --yes --count-tokens # free first pass on the token-counting endpoint
    python3 drop_block_probe.py capture.jsonl --dry-run        # validate the capture, send nothing
    python3 drop_block_probe.py capture.jsonl --json out.json  # machine-readable results too
    python3 drop_block_probe.py --self-test --model <model-id> --yes # three tiny live requests (cents); exits 1 if the check is not running

First-party only: the probe speaks to the Claude API (POST /v1/messages). Captures
taken on Amazon Bedrock or Google Cloud Vertex AI cannot be replayed here -- their request shape,
authentication and per-model availability of the controls differ; run the account's own client
there and read input_transformations from its responses.

Use a key from the SAME organization as the capture (a dedicated key or workspace is fine; a
capture replayed with a different organization's key is not diagnosed). Captures hold end-user
content: keep them out of the repository, share the --json output rather than the captures,
and delete them when the work is done. Requests that replay no thinking block are skipped by
default (they cannot fail the check); --include-no-thinking sends them too.

Capture format: one request body per line, in the order the harness sent them, for ONE
conversation (a directory holds one file per conversation). A line may also be a wrapper
{"conversation_id": "...", "headers": {"anthropic-beta": "..."}, "request": {...}} so several
conversations can share a file and the capture's own beta values travel with it (they are merged
into the anthropic-beta value the probe sends).
Assistant turns must carry the thinking blocks exactly as the API returned them (signature
included) -- that is what the API checks. Captures taken from another organization's traffic
cannot be replayed meaningfully: the API only diagnoses blocks your own organization created.

What the probe changes on every request: the anthropic-beta value thinking-binding-controls-2026-08-01
(plus --beta values and the capture's own), thinking.block_binding.prefix_mismatch_behavior = --mode,
max_tokens = --max-tokens (default 16: the verdict is decided before the first output token, so the
reply is not needed and the replay stays cheap), and stream off unless --stream. Any
other spelling of the mismatch-behavior field found under block_binding in a capture is removed so
that only the documented name is sent. A request with no thinking configuration is sent with {type: adaptive} (on models with preserved thinking
that is what the API runs anyway, and the thinking configuration is outside the compared prefix); a request
with {type: enabled} or {type: between_tools} is rewritten to adaptive for the same reason; thinking disabled is SKIPPED. On every
request that declares tools the probe sets tool_choice to none (outside the compared prefix) so that no
tool -- server-side or the harness's own -- can run during a replay; it never removes tools from the
capture, because the tool set IS compared. temperature is set to 1 and top_p / top_k are removed (a
thinking request rejects them). Every such change is printed as a "shaped:" note. Nothing is sent without
--yes. --count-tokens replays against /v1/messages/count_tokens, which runs the same conversation check
for free (a 400 in --mode error is the break signal; no input_transformations on a 200).

Status words per turn: BREAK (a prefix-check drop or rejection), ok (replayed thinking, nothing dropped),
none (the request replayed no thinking block, so it could not fail), model (only model-check drops: a
model switch, not a prefix edit), WARN (a drop reason this probe does not classify), HTTP nnn / N/A
(not evaluated). Exit status: 0 no break, 1 inconclusive, 2 at least one break -- not severity-ordered.

What it records per request: HTTP status, every input_transformations entry, the
anthropic-thinking-prefix-mismatch response header if the API sent one, request id, usage, and a
client-side digest of the three compared parts (system, tools, and the messages before each
replayed thinking block) so the request where a digest changed can be found without the header.
A model_binding_mismatch entry (the current model cannot read a block another model produced -- a model
switch, not a prefix edit) is counted apart from prefix breaks: per turn as model_drops, per conversation
as model_drop_turns. It never makes a request fail, in either mode.

Per conversation: the first request (turn) with a prefix_binding_mismatch drop, the number of NEW
dropped blocks per request -- keyed by the dropped block's signature (or a redacted block's data),
resolved from the body that was sent, because paths shift when history is truncated; the path is
kept in the record -- the distinct dropped blocks in total (turns of reasoning lost), and the
diagnosis pattern(s) seen. A request whose status is not 200, and not a 400 that says "bound to a
different conversation", is NOT EVALUATED (a 401, a 429 that outlasted the retries, a network
error, ...): it is reported as such, and a conversation with any unevaluated request is marked
inconclusive and left out of the break share. A 200 whose body carries NO input_transformations
key at all is also NOT EVALUATED: the check never saw the request (a gateway stripping the beta
header, or a surface without the controls). So is a 200 carrying a thinking_mismatch_allowed
entry: the probe sets thinking.block_binding on every replay and a request that sets the field
never receives one, so the field was stripped on the way (a gateway or proxy rebuilding the
body) and the check ran record-only. So is a 200 whose only drops are organization_binding_mismatch:
another account produced those blocks, so they were dropped before the prefix check (the usual
cause is a replay key from a different account). Exit status: 0 clean, 1 inconclusive or errors,
2 breaks found. --json is validated before the first request and written after every request, so
a bad path costs nothing and a crash loses nothing.

Costs real money: every replayed request is billed (input tokens; the reply is capped). Use a
small slice; --max-requests caps it; --dry-run prints an input-token estimate for the approval.
Replaying does not run the application's own tools (the capture already holds their results), and
server-side tools -- web search, code execution, MCP connectors -- cannot run either, because the
probe sets tool_choice to none on every replayed request that declares tools; never remove tools
from a capture to the same end (the tool set IS compared).
"""
import argparse
import glob
import hashlib
import http.client
import json
import os
import re
import socket
import sys
import time
import urllib.error
import urllib.request

# With stdout/stderr redirected to a pipe (as under a tool runner), CPython on Windows encodes with
# the ANSI code page and errors="strict", so one character outside it (an emoji in an excerpt)
# would abort the run mid-report. Never raise on output.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(errors="backslashreplace")
    except (AttributeError, ValueError):  # a non-TextIOWrapper stand-in; nothing to configure
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import prefix_diff  # optional sibling: canonical form for digests and the --dry-run pair diff
except Exception:  # pragma: no cover
    prefix_diff = None

BINDING_BETA = "thinking-binding-controls-2026-08-01"
OAUTH_BETA = "oauth-2025-04-20"   # required with a bearer token (OAuth or workload identity); the API 401s without it
# Fields of a create request that the token-counting endpoint does not accept (it rejects unknown fields).
COUNT_TOKENS_EXCLUDED = ("max_tokens", "stream", "temperature", "top_p", "top_k", "stop_sequences", "metadata",
                         "service_tier")   # create-only fields the count endpoint rejects; everything else goes as captured
# The public entry types in input_transformations, written as the wire examples show them. The
# record-only entry (thinking_mismatch_allowed) is written when the beta header is present but
# thinking.block_binding is unset; a request that sets the field never receives one, and the probe
# sets it on every replay, so one on a replay proves the field was stripped on the way to the check.
DROPPED_ENTRY = {"type": "thinking_dropped"}
ALLOWED_ENTRY = {"type": "thinking_mismatch_allowed"}
PREFIX_HEADER = "anthropic-thinking-prefix-mismatch"
DEFAULT_BASE_URL = os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
RETRY_STATUSES = {408, 409, 429, 529, 500, 502, 503, 504}
# The HTTP status each documented in-band SSE error type stands for: a streamed request can
# answer 200 and then fail with an error event before message_start (the streaming form of a
# 429/529), and the retry loop and error handling must see that as the failure it is.
STREAM_ERROR_STATUSES = {"invalid_request_error": 400, "authentication_error": 401, "permission_error": 403,
                         "not_found_error": 404, "request_too_large": 413, "rate_limit_error": 429,
                         "api_error": 500, "overloaded_error": 529}


# ----------------------------------------------------------------------------- capture loading


def iter_lines(path):
    with open(path, "r", encoding="utf-8") as f:
        for n, line in enumerate(f, 1):
            line = line.strip()
            if line:
                try:
                    yield n, json.loads(line)
                except ValueError as e:
                    raise SystemExit("%s:%d: not valid JSON (%s)" % (path, n, e))


def load_capture(path):
    """Return an ordered dict conversation_id -> list of (label, body)."""
    convs, skipped_compaction = {}, []
    files = sorted(glob.glob(os.path.join(path, "*.jsonl"))) if os.path.isdir(path) else [path]
    if not files:
        raise SystemExit("no *.jsonl files under %s" % path)
    for fpath in files:
        base = os.path.splitext(os.path.basename(fpath))[0]
        for n, obj in iter_lines(fpath):
            hdrs = {}
            if isinstance(obj, dict) and "request" in obj and isinstance(obj["request"], dict):
                # Only the documented conversation_id groups (the same rule as
                # prefix_diff.load_requests); a wrapper's id is a per-request stamp in some
                # captures and a correlation key in others, so it never decides grouping.
                cid = str(obj["conversation_id"]) if obj.get("conversation_id") else base
                body = obj["request"]
                hdrs = {k.lower(): v for k, v in (obj.get("headers") or {}).items()} if isinstance(obj.get("headers"), dict) else {}
            else:
                cid, body = base, obj
            if not isinstance(body, dict) or "messages" not in body:
                raise SystemExit("%s:%d is not a Messages API request body" % (fpath, n))
            if isinstance(body.get("compaction"), dict):
                # A compaction request (beta compact-2026-09-04; the same test as prefix_diff.is_compaction_request):
                # replaying it would buy a summary, not test a turn, and its 200 would count as a passing turn.
                skipped_compaction.append("%s:%d" % (os.path.basename(fpath), n))
                continue
            convs.setdefault(cid, []).append(("%s:%d" % (os.path.basename(fpath), n), body, hdrs))
    if skipped_compaction:
        sys.stderr.write("skipped %d compaction request(s) (top-level compaction field), not conversation turns: %s\n"
                         % (len(skipped_compaction), ", ".join(skipped_compaction)))
    return convs


def count_thinking(body):
    n = 0
    for m in body.get("messages", []):
        c = m.get("content")
        if isinstance(c, list):
            n += sum(1 for b in c if isinstance(b, dict) and b.get("type") in ("thinking", "redacted_thinking"))
    return n


def estimate_input_tokens(body):
    """Rough input-token estimate for an approval number: JSON bytes / 4 (images excluded)."""
    slim = json.loads(json.dumps(body))
    for m in slim.get("messages", []):
        if isinstance(m.get("content"), list):
            for b in m["content"]:
                if isinstance(b, dict) and b.get("type") in ("image", "document") and isinstance(b.get("source"), dict):
                    b["source"] = {"type": b["source"].get("type")}
    return len(json.dumps(slim)) // 4


def resolve_block(body, path):
    """messages.{i}.content.{j} -> the block in the body that was sent, or None."""
    try:
        parts = path.split(".")
        if parts[0] != "messages" or parts[2] != "content":
            return None
        m = body["messages"][int(parts[1])]
        c = m.get("content")
        return c[int(parts[3])] if isinstance(c, list) else None
    except (KeyError, IndexError, ValueError, TypeError):
        return None


def block_key(block, path):
    """Stable identity of a thinking block across requests: its signature (thinking) or data
    (redacted_thinking); the path only as a last resort."""
    h = lambda s: hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]
    if isinstance(block, dict):
        if block.get("type") == "thinking" and block.get("signature"):
            return "sig:" + h(block["signature"])
        if block.get("type") == "redacted_thinking" and block.get("data"):
            return "data:" + h(block["data"])
    return "path:" + path


def digests(body):
    """Client-side digests of the compared parts: system, tools, and messages before each replayed
    thinking block. Uses prefix_diff's canonical form when available."""
    h = lambda s: hashlib.sha256(s.encode("utf-8")).hexdigest()[:16]
    if prefix_diff is not None:
        sysd = h(prefix_diff.fp(prefix_diff.canon_system(body.get("system"))))
        inline, deferred, refd = prefix_diff.canon_tools(body.get("tools"), body.get("messages"))
        toolsd = h(prefix_diff.fp(inline))
        raw_msgs, start = prefix_diff.from_compaction(body.get("messages"))   # the check restarts at the last compaction block
        msgs = prefix_diff.canon_messages(raw_msgs)
        before = []
        acc = []
        for i, x in enumerate(msgs):
            if x["sigs"]:
                before.append({"path": "messages.%d" % (i + (start or 0)), "digest": h(prefix_diff.fp(acc))})
            acc.append(x["msg"])
        return {"system": sysd, "tools": toolsd, "messages_before_thinking": before}
    j = lambda o: json.dumps(o, sort_keys=True, separators=(",", ":"))
    return {"system": h(j(body.get("system"))), "tools": h(j(body.get("tools"))), "messages_before_thinking": []}


def validate(convs):
    """Structural checks; returns a list of problems (strings)."""
    problems = []
    for cid, reqs in convs.items():
        for label, body, hdrs in reqs:
            for name in hdrs:
                low = str(name).lower()
                if any(w in low for w in ("key", "authorization", "token", "secret", "cookie")):
                    problems.append("%s: the capture wrapper carries a %s header that looks like a credential -- remove credentials "
                                    "from captures (the probe never sends or prints them; only anthropic-beta is read)" % (label, name))
            if not body.get("model"):
                problems.append("%s: no model" % label)
            for srv in body.get("mcp_servers") or []:
                if isinstance(srv, dict) and srv.get("authorization_token"):
                    problems.append("%s: mcp_servers[%s] carries an authorization_token -- the probe sends it as the harness did (the "
                                    "connector's tool list is part of what the check compares, so it cannot be removed); use a "
                                    "test-scoped token in the capture and rotate it afterwards" % (label, srv.get("name")))
                    break
            for i, m in enumerate(body.get("messages", [])):
                c = m.get("content")
                if isinstance(c, list):
                    for j, b in enumerate(c):
                        if isinstance(b, dict) and b.get("type") == "thinking" and not b.get("signature"):
                            problems.append("%s: messages.%d.content.%d thinking block has no signature (the API needs the signature it returned)" % (label, i, j))
        if prefix_diff is not None:
            for (la, a, _ha), (lb, b, _hb) in zip(reqs, reqs[1:]):
                r = prefix_diff.diff_pair(a, b)
                if r["verdict"] == "chain-warning":
                    problems.append("%s -> %s: %s" % (la, lb, "; ".join(r.get("thinking_notes", []))))
                if r["verdict"] == "mismatch":
                    problems.append("%s -> %s: prefix edit in the capture itself (%s) -- expected if this is the harness under test, "
                                    "but a capture that was hand-edited will be diagnosed as such" % (la, lb, prefix_diff.header_line(r)))
    return problems


# ----------------------------------------------------------------------------- request shaping


def prepare(body, mode, model=None, stream=False, max_tokens=16):
    """Return (shaped body, skip reason or None, notes). Only fields OUTSIDE the compared prefix are touched:
    the model (on request), the thinking configuration, block_binding, max_tokens, stream, tool_choice and
    the sampling parameters a thinking request rejects. system, tools and messages go out exactly as captured."""
    notes = []
    b = json.loads(json.dumps(body))  # deep copy
    if model:
        b["model"] = model
    th = b.get("thinking")
    if not isinstance(th, dict):
        # On models with preserved thinking a request with no thinking key already runs with adaptive thinking,
        # and the thinking configuration is outside the compared prefix, so adding it changes no verdict.
        th = {"type": "adaptive"}
        notes.append("no thinking configuration in the capture: sent with {type: adaptive} (outside the compared prefix)")
    if th.get("type") == "disabled":
        return None, "thinking is disabled in this request; nothing to check", notes
    bb = th.get("block_binding")
    if th.get("type") == "enabled":
        # The budget form is rejected by models that only take adaptive thinking; adaptive is accepted everywhere the
        # check runs, and the configuration is outside the compared prefix.
        th = {"type": "adaptive"}
        notes.append("thinking {type: enabled} rewritten to {type: adaptive} (budget_tokens dropped; outside the compared prefix)")
    if th.get("type") == "between_tools":
        # block_binding is a 400 with this thinking type (it is accepted only with adaptive), and the thinking
        # configuration is outside the compared prefix, so the replay goes out as adaptive.
        th = {"type": "adaptive"}
        notes.append("thinking {type: between_tools} rewritten to {type: adaptive} (block_binding is a 400 with between_tools; outside the compared prefix)")
    if not isinstance(bb, dict):
        bb = {}
    removed = [k for k in bb if k != "prefix_mismatch_behavior"]
    for k in removed:
        bb.pop(k)                               # only the documented key goes out
    if removed:
        notes.append("removed undocumented block_binding key(s) %s" % removed)
    bb["prefix_mismatch_behavior"] = mode
    th["block_binding"] = bb
    b["thinking"] = th
    # A thinking request rejects temperature != 1, top_p and top_k; none is part of the compared prefix.
    if b.get("temperature") not in (None, 1, 1.0):
        b["temperature"] = 1
        notes.append("temperature set to 1 (required with a thinking configuration)")
    for k in ("top_p", "top_k"):
        if k in b:
            b.pop(k)
            notes.append("%s removed (rejected with a thinking configuration)" % k)
    # No tool may run during a replay, server-side or the harness's own: tool_choice is outside the compared
    # prefix, so "none" is safe to set on every request that declares tools or MCP servers. Never remove tools
    # from the capture (the tool set IS compared; removing one would turn the request into a tool_set_changed break).
    if b.get("tools") or b.get("mcp_servers"):   # connector tools are declared server-side, so mcp_servers alone counts
        prior = b.get("tool_choice")
        b["tool_choice"] = {"type": "none"}
        if isinstance(prior, dict) and prior.get("type") in ("any", "tool"):
            notes.append("forced tool_choice %s replaced by none (no tool runs during a replay)" % prior.get("type"))
    # mcp_servers stay as captured: the API fetches the connector's tool list server-side and those tools are
    # part of the compared tool set, so removing the entry would read as a tool_set_changed break the harness
    # never made. validate() warns when the entry carries an authorization_token (it goes out as the harness
    # sent it); tool_choice none keeps the connector's tools from being called.
    if max_tokens:
        b["max_tokens"] = max_tokens
    b["stream"] = bool(stream)
    return b, None, notes



def stream_error(body, status, raw):
    """The error object of an in-band SSE error event that arrived on a streamed 200 before any
    message_start, or None. An error after message_start is a mid-stream cut of a request the
    check already saw, so it is left to parse_body."""
    if status != 200 or not (isinstance(body, dict) and body.get("stream")):
        return None
    for line in raw.decode("utf-8", errors="replace").split("\n"):
        if not line.startswith("data:"):
            continue
        try:
            ev = json.loads(line[5:].strip())
        except ValueError:
            continue
        if ev.get("type") == "message_start":
            return None
        if ev.get("type") == "error":
            return ev.get("error") or {}
    return None


def post_with_retries(base_url, path, body, betas, api_key, timeout, retries=3, backoff=5.0):
    """post(), retrying the same request on 408/409/429/529/5xx (unless x-should-retry: false).
    An in-band SSE error event on a streamed 200 is surfaced as the status it stands for
    (STREAM_ERROR_STATUSES), so an overloaded_error is retried and reported, never misread
    as a response without the input_transformations key."""
    attempt = 0
    while True:
        status, headers, raw, secs = post(base_url, path, body, betas, api_key, timeout)
        err = stream_error(body, status, raw)
        if err is not None:
            status = STREAM_ERROR_STATUSES.get(err.get("type"), 500)
            raw = json.dumps({"type": "error", "error": err}).encode("utf-8")
        should = headers.get("x-should-retry", "").lower()
        if (status is None or status in RETRY_STATUSES) and should != "false" and attempt < retries:
            attempt += 1
            wait = backoff * attempt
            try:
                wait = float(headers.get("retry-after", wait))
            except ValueError:
                pass
            time.sleep(wait)
            continue
        if attempt:
            headers = dict(headers)
            headers["x-probe-retries"] = str(attempt)
        return status, headers, raw, secs


def read_credentials():
    """Credential headers from the environment, or None when neither variable is set. Values are
    never printed by this script. Exactly one header is sent: the API rejects a request carrying
    x-api-key and Authorization together, so when both variables are set the token wins."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    token = os.environ.get("ANTHROPIC_AUTH_TOKEN")
    if token:
        if key:
            sys.stderr.write("both ANTHROPIC_API_KEY and ANTHROPIC_AUTH_TOKEN are set; sending only the token"
                             " (the API rejects a request carrying both headers)\n")
        return {"authorization": "Bearer " + token}
    if key:
        return {"x-api-key": key}
    return None


CREDENTIALS_HINT = "set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN (neither is ever printed)"


def post(base_url, path, body, betas, api_key, timeout):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(base_url.rstrip("/") + path, data=data, method="POST")
    req.add_header("content-type", "application/json")
    for name, value in (api_key if isinstance(api_key, dict) else {"x-api-key": api_key}).items():
        req.add_header(name, value)
    req.add_header("anthropic-version", "2023-06-01")
    req.add_header("anthropic-beta", ",".join(betas))
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return resp.status, dict((k.lower(), v) for k, v in resp.headers.items()), raw, time.time() - t0
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, dict((k.lower(), v) for k, v in e.headers.items()), raw, time.time() - t0
    except (urllib.error.URLError, socket.timeout, OSError, http.client.HTTPException) as e:
        # HTTPException covers a body cut short mid-read (IncompleteRead, BadStatusLine): it is not
        # an OSError, and without this arm it would abort the whole run instead of counting as a
        # network error the retry path and the unevaluated bookkeeping already handle.
        err = json.dumps({"type": "error", "error": {"type": "network_error", "message": "%s: %s" % (type(e).__name__, e)}}).encode("utf-8")
        return None, {"x-probe-network-error": str(e)}, err, time.time() - t0


def parse_body(status, raw, streamed):
    """Return (message_json_or_error, input_transformations). The second value is a list when the
    response carried the key (empty included), and None when a 200 carried no key at all -- the
    guide's contract is that every checked response has it, so its absence means the check never
    saw the request and the caller must not read the turn as clean."""
    text = raw.decode("utf-8", errors="replace")
    if streamed and status == 200:
        # take input_transformations from message_start, then message_delta if it carries one
        msg, transformations = None, None
        for line in text.split("\n"):
            if not line.startswith("data:"):
                continue
            try:
                ev = json.loads(line[5:].strip())
            except ValueError:
                continue
            if ev.get("type") == "message_start":
                msg = ev.get("message", {})
                if "input_transformations" in msg:
                    transformations = msg.get("input_transformations") or []
            elif ev.get("type") == "message_delta" and "input_transformations" in ev:
                transformations = ev.get("input_transformations") or []
        return msg or {"type": "stream", "raw_head": text[:200]}, transformations
    try:
        obj = json.loads(text)
    except ValueError:
        return {"type": "unparsable", "raw_head": text[:300]}, []
    if status != 200:
        return obj, []
    if "input_transformations" not in obj:
        return obj, None
    return obj, (obj.get("input_transformations") or [])


def parse_header(value):
    out = {}
    for part in (value or "").split(";"):
        if "=" in part:
            k, v = part.strip().split("=", 1)
            out[k.strip()] = v.strip()
    return out


# ----------------------------------------------------------------------------- the run


# The conversation check's own 400s are fixed-form: the failing block's path,
# then the fixed clause. The binding form is pinned to the exact documented
# clause (the error-codes reference spells it), with nothing free between the
# path and the clause; the modified form's wire text is not published in full,
# so its middle is bounded and quote-free - API validation messages echo
# request values inside quotes, so an echoed capture value carrying the same
# words cannot ride it. Backticks stay allowed in that middle: the API's own
# clauses use them for field names (see the binding clause), so refusing them
# would fail every genuine modified 400, while a match forged by unquoted echo
# text can only mislabel that one conversation - the stored text is
# reconstructed from validated pieces either way, never copied. A
# conversation-check 400 the anchors miss fails closed: the turn is not
# evaluated and its error is reduced, never shared. The block path's two
# indices carry the same six-digit budget as shareable_field_path and
# FIRST_CHANGE_RE: real indices are short, a longer digit run is a
# capture-derived number echoed into the text, and the lookahead refuses the
# whole match rather than truncating it, so a forged head falls through to
# the reduced branch instead of riding the reconstruction.
_BLOCK_PATH = r"(messages\.\d{1,6}(?!\d)\.content\.\d{1,6}(?!\d))"
BINDING_400_RE = re.compile(
    _BLOCK_PATH + r": Invalid `signature` in `thinking` block\."
    r" The block is bound to a different conversation\.")
MODIFIED_400_RE = re.compile(_BLOCK_PATH + r": [^\"'\n]{0,120}cannot be modified")
# The trailing first-changed-message diagnostic some conversation-check 400s
# end with: fixed words plus a bounded index. Real message indices are short;
# a longer digit run is a capture-derived number echoed into the text (the
# same class shareable_field_path's digit budget blocks), so the lookahead
# refuses it outright rather than truncating it, and the search runs only
# over the text AFTER the matched clause, never the free middle.
FIRST_CHANGE_RE = re.compile(r"starting at `?messages\.\d{1,6}(?!\d)`?")
# Top-level Messages API request fields: the only heads a field path in the
# reduced form may start with, so an echoed value at the head of a message is
# not copied into the shared output as the "field path".
REQUEST_FIELD_HEADS = frozenset((
    "model", "messages", "max_tokens", "system", "tools", "tool_choice",
    "thinking", "metadata", "stream", "temperature", "top_p", "top_k",
    "stop_sequences", "service_tier", "betas", "mcp_servers", "container",
))
# Known structural sub-field names of Messages API request shapes: the only
# non-numeric tail segments a reduced-form field path may carry. Any other
# segment - a pydantic extra-field path names the unknown key itself, and
# unknown keys here come from the captures - ends the emitted path.
STRUCTURAL_SUBFIELDS = frozenset((
    "role", "content", "type", "text", "source", "data", "media_type", "url",
    "file_id", "name", "input", "id", "tool_use_id", "is_error", "thinking",
    "signature", "description", "input_schema", "cache_control", "ttl",
    "budget_tokens", "user_id", "title", "context", "citations",
))
PATH_SEGMENT_RE = re.compile(r"([A-Za-z0-9_]+)(?:\[[0-9]{1,6}\])*\Z")


def shareable_field_path(path):
    """The leading run of `path` segments that are provably request structure:
    the head a top-level request field, every later dot-segment a short
    numeric index or a known structural sub-field name (short numeric bracket
    indices allowed on either - real array indices are small, while a long
    digit run can be a capture-derived numeric key, e.g. an account number
    used as a JSON key). The whole kept path also has a six-digit budget
    across all its indices, so splitting a long number over several segments
    or bracket groups buys nothing over what one segment may carry. Cut at
    the first segment that does not conform, marking the cut with a "*"
    segment, and cap the whole path - so a capture-derived key name inside
    a validation path (or text shaped like one) is never copied into the
    shared output. None when even the head is not a request field."""
    segments = path.split(".")
    kept = []
    digit_budget = 6
    for i, segment in enumerate(segments):
        m = PATH_SEGMENT_RE.match(segment)
        base = m.group(1) if m else None
        if i == 0:
            if base not in REQUEST_FIELD_HEADS:
                return None
        elif base is None or not ((base.isdigit() and len(base) <= 6) or base in STRUCTURAL_SUBFIELDS):
            kept.append("*")
            break
        digits = sum(c.isdigit() for c in segment)
        if digits > digit_budget:
            if i == 0:
                return None
            kept.append("*")
            break
        digit_budget -= digits
        kept.append(segment)
    out = ".".join(kept)
    return out[:120] + "..." if len(out) > 120 else out


def is_conversation_check_400(status, error_text):
    return bool(status == 400 and error_text and (BINDING_400_RE.match(error_text) or MODIFIED_400_RE.match(error_text)))


def shareable_error(status, msg, error_text, conversation_check):
    """The error text as stored in the --json results file. The conversation
    check's own 400s are stored as a reconstruction built only from validated
    pieces - the matched block path, this file's fixed clause, and the
    digits-only trailing diagnostic - never as a copy of the server line, so
    even a validation 400 that echoed capture words into the anchored shape
    could put no capture-derived byte in the shared file. Every other error is
    reduced to its type and any leading allowlisted field path, because API
    validation messages can echo request values (which here come from the
    captures) and the --json file is documented as safe to share. The branch
    re-checks the anchored fixed form itself, so no caller flag can route
    echoed text into it. The full text still prints on the terminal, which
    already shows the captures."""
    if not error_text:
        return error_text
    if conversation_check and is_conversation_check_400(status, error_text):
        m = BINDING_400_RE.match(error_text)
        got = m or MODIFIED_400_RE.match(error_text)
        clause = ("Invalid `signature` in `thinking` block. The block is bound to a different conversation."
                  if m else "`thinking` block cannot be modified.")
        tail = FIRST_CHANGE_RE.search(error_text, got.end())
        return "%s: %s%s (reconstructed; the terminal output has the server text)" % (
            got.group(1), clause, (" " + tail.group(0)) if tail else "")
    etype = (msg.get("error") or {}).get("type") if isinstance(msg, dict) else None
    m = re.match(r"([A-Za-z0-9_]+(?:\.[A-Za-z0-9_\[\]]+)*)\s*:", error_text)
    where = ""
    if m:
        path = shareable_field_path(m.group(1))
        if path:
            where = " at " + path
    return "%s%s (message withheld from --json: not the conversation check; the terminal output has it)" % (etype or ("HTTP %s" % status), where)


def run_conversation(cid, reqs, args, api_key, betas, sink=None, flush=None):
    """sink/flush: main's shared results list and --json writer, fed after every request so a crash
    or Ctrl-C mid-conversation keeps the turns already billed."""
    def record(rec):
        results.append(rec)
        if sink is not None:
            sink.append(rec)
        if flush:
            flush()
    results = []
    seen_keys = set()
    first_break = None
    patterns = []
    model_drop_turns = []
    skipped = 0
    unevaluated = []
    for turn, (label, body, hdrs) in enumerate(reqs, 1):
        if args.max_requests and turn > args.max_requests:
            break
        replayed = count_thinking(body)
        shaped, skip, shaping_notes = prepare(body, args.mode, args.model, args.stream, args.max_tokens)
        if not skip and replayed == 0 and not args.include_no_thinking:
            skip = "replays no thinking block (nothing for the check to verify); --include-no-thinking to send it anyway"
        if skip:
            skipped += 1
            if not args.quiet:
                print("  turn %2d  SKIP   %s" % (turn, skip))
            record({"conversation": cid, "turn": turn, "label": label, "status": None, "skipped": skip,
                    "replayed_thinking_blocks": replayed})
            continue
        req_betas = list(betas)
        for v in (hdrs.get("anthropic-beta") or "").split(","):
            v = v.strip()
            if v and v not in req_betas:
                req_betas.append(v)
        if args.count_tokens:
            # the token-counting endpoint runs the same conversation check for free: a 400 in error mode is the
            # break signal; a 200 carries no input_transformations, so it cannot count dropped blocks. It takes only
            # the parameters of a count request, so the create-only fields are left out.
            for k in COUNT_TOKENS_EXCLUDED:
                shaped.pop(k, None)
        path = "/v1/messages/count_tokens" if args.count_tokens else "/v1/messages"
        status, headers, raw, secs = post_with_retries(args.base_url, path, shaped, req_betas, api_key,
                                                       args.timeout, args.retries, args.backoff)
        msg, transformations = parse_body(status, raw, args.stream and not args.count_tokens)
        # A 200 with no input_transformations key was never checked (the count endpoint aside,
        # which carries none by design): reading it as clean would be a false pass, so the turn
        # is not evaluated and the conversation goes inconclusive.
        missing_transformations = transformations is None and status == 200 and not args.count_tokens
        if transformations is None:
            transformations = []
        if not args.quiet and shaping_notes:
            for n in shaping_notes:
                print("           shaped: " + n)
        prefix_drops = [t for t in transformations if t.get("type") == DROPPED_ENTRY["type"] and t.get("reason") == "prefix_binding_mismatch"]
        # A model_binding_mismatch drop comes from the separate model check (the conversation switched to a
        # model that cannot read the block). It is not a prefix edit, so it is counted apart from the prefix
        # breaks this script measures; it is still reported per turn and per conversation.
        model_drops = [t for t in transformations if t.get("type") == DROPPED_ENTRY["type"] and t.get("reason") == "model_binding_mismatch"]
        # A thinking_mismatch_allowed entry on a replay means thinking.block_binding never reached the
        # check (the probe sets it on every request; a request that sets it never receives one): the check
        # ran record-only, so the turn measured nothing and reading it as clean would be a false pass.
        allowed_entries = [t for t in transformations if t.get("type") == ALLOWED_ENTRY["type"]]
        # An organization_binding_mismatch drop means another account produced the block. It is removed before
        # the prefix check judges it, so a turn with only these measured nothing: reading it as clean would be
        # a false pass (the usual cause is a replay key from a different account than the capture's).
        account_drops = [t for t in transformations if t.get("type") == DROPPED_ENTRY["type"] and t.get("reason") == "organization_binding_mismatch"]
        other_drops = [t for t in transformations if t not in prefix_drops and t not in model_drops and t not in allowed_entries and t not in account_drops]
        keys = {}
        for t in prefix_drops:
            keys[t.get("path")] = block_key(resolve_block(shaped, t.get("path") or ""), t.get("path") or "")
        new_keys = sorted(set(keys.values()) - seen_keys)
        new_paths = sorted(p for p, k in keys.items() if k in new_keys)
        seen_keys |= set(keys.values())
        hdr = headers.get(PREFIX_HEADER)
        diag = parse_header(hdr) if hdr else None
        error_text = None
        if status != 200:
            error_text = (msg.get("error") or {}).get("message") if isinstance(msg, dict) else None
        binding_m = BINDING_400_RE.match(error_text) if status == 400 and error_text else None
        rejected = bool(binding_m)
        # a thinking block whose text was changed is a different 400 ("cannot be modified"): a harness finding,
        # not an unevaluated request. The binding classification is pinned to the exact documented clause and
        # the modified one to a bounded quote-free middle (see BINDING_400_RE) so echoed capture text cannot
        # forge a BREAK; either way the shared record stores only reconstructed text, never the server line.
        modified_m = MODIFIED_400_RE.match(error_text) if status == 400 and error_text else None
        modified = bool(modified_m)
        if modified:
            rejected = True
            patterns.append("thinking_modified")
        if rejected:
            # the block path persisted in the shared record is the classifier
            # match's own bounded capture, never a re-parse of the free text
            p = (binding_m or modified_m).group(1)
            kkey = block_key(resolve_block(shaped, p), p)
            keys[p] = kkey
            if kkey not in seen_keys:
                new_keys.append(kkey)
                new_paths.append(p)
            seen_keys.add(kkey)
        binding_field_stripped = bool(allowed_entries) and status == 200
        other_account = bool(account_drops) and status == 200 and not prefix_drops
        evaluated = (status == 200 and not missing_transformations and not binding_field_stripped and not other_account) or rejected
        if not evaluated:
            if missing_transformations:
                unevaluated.append((turn, status, "200 without the input_transformations key: the check never saw this"
                                    " request (a gateway stripping anthropic-beta, or a surface without the controls);"
                                    " run --self-test through the same path"))
            elif binding_field_stripped:
                unevaluated.append((turn, status, "200 with thinking_mismatch_allowed entries although the request set"
                                    " thinking.block_binding: the field was stripped before the check (a gateway or"
                                    " proxy rebuilding the body and dropping thinking.block_binding), so the check ran"
                                    " record-only; run --self-test through the same path"))
            elif other_account:
                unevaluated.append((turn, status, "200 with organization_binding_mismatch drops: another account produced"
                                    " those blocks, so they were dropped before the prefix check; replay with a key from"
                                    " the account that made the capture, or one linked to it"))
            else:
                unevaluated.append((turn, status, (shareable_error(status, msg, error_text, False) or "")[:120]))
        is_break = bool(prefix_drops) or bool(rejected)
        if is_break and first_break is None:
            first_break = turn
        if model_drops:
            model_drop_turns.append(turn)
        if diag and diag.get("pattern"):
            patterns.append(diag["pattern"])
        usage = msg.get("usage") if isinstance(msg, dict) else None
        rec = {
            "conversation": cid, "turn": turn, "label": label, "status": status,
            "request_id": headers.get("request-id") or headers.get("x-request-id") or (msg.get("request_id") if isinstance(msg, dict) else None),
            "replayed_thinking_blocks": replayed,
            "input_transformations": transformations,
            "prefix_drops": len(prefix_drops), "new_dropped_blocks": len(new_keys), "new_dropped_paths": new_paths,
            "dropped_block_keys": sorted(set(keys.values())), "model_drops": len(model_drops),
            "model_dropped_paths": [t.get("path") for t in model_drops], "other_drops": other_drops,
            "mismatch_allowed": len(allowed_entries), "binding_field_stripped": binding_field_stripped,
            "account_drops": len(account_drops), "account_dropped_paths": [t.get("path") for t in account_drops],
            "client_digests": digests(shaped), "retries": int(headers.get("x-probe-retries", 0)),
            "prefix_mismatch_header": hdr, "diagnosis": diag,
            "error": shareable_error(status, msg, error_text, bool(rejected)),
            "shaping": shaping_notes, "endpoint": path,
            "missing_input_transformations": missing_transformations,
            "evaluated": evaluated, "seconds": round(secs, 2),
            "usage": {k: usage.get(k) for k in ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens")} if isinstance(usage, dict) else None,
        }
        record(rec)
        if not args.quiet:
            print_turn(rec, error_text)
        if status == 400 and args.mode == "error" and not args.continue_after_error:
            if not args.quiet:
                print("    (error mode: stopping this conversation at the first 400; --continue-after-error to keep going)")
            break
    sent = [r for r in results if "evaluated" in r]
    summary = {"conversation": cid, "requests_sent": len(sent), "requests_skipped": skipped, "first_break_turn": first_break,
               # which model the replayed blocks were minted by (and replayed on, absent --model): a capture taken on
               # a model without preserved thinking cannot show a prefix break, so the reader must see the ids
               "models": sorted({b.get("model") for _l, b, _h in reqs if b.get("model")}),
               "replayed_model": args.model or None,
               "distinct_dropped_blocks": len(seen_keys), "patterns": sorted(set(patterns)),
               "model_drop_turns": model_drop_turns,
               "replayed_thinking_blocks_max": max([r["replayed_thinking_blocks"] for r in results] or [0]),
               "statuses": sorted(set(str(r["status"]) for r in sent)),
               "unevaluated": [{"turn": t, "status": s, "error": e} for t, s, e in unevaluated],
               "inconclusive": bool(unevaluated) or not sent,
               "_results": sent}
    return results, summary


def print_turn(r, full_error=None):
    if not r.get("evaluated"):
        flag = "N/A  " if r["status"] is None else "HTTP %s" % r["status"]
    else:
        if r["prefix_drops"] or (r["status"] == 400 and r["error"] and ("different conversation" in r["error"] or "cannot be modified" in r["error"] or ("thinking" in r["error"] and "modified" in r["error"]))):
            flag = "BREAK"
        elif r["replayed_thinking_blocks"] == 0:
            flag = "none "      # nothing replayed: this request could not fail the check
        elif r.get("other_drops"):
            flag = "WARN "      # a drop reason this probe does not classify: read the entries
        elif r.get("model_drops"):
            flag = "model"      # only model-check drops: reasoning lost by routing, not a prefix break
        else:
            flag = "ok"
    line = "  turn %2d  %-5s  replayed_thinking=%d" % (r["turn"], flag, r["replayed_thinking_blocks"])
    if r["status"] == 200:
        line += "  dropped=%d new_blocks=%d new_paths=%s" % (r["prefix_drops"], r["new_dropped_blocks"], r["new_dropped_paths"] or "[]")
        if r.get("model_drops"):
            line += "  model_drops=%d paths=%s (model_binding_mismatch: this model cannot read those blocks -- a model switch, not a prefix edit)" % (r["model_drops"], r["model_dropped_paths"])
        if r["other_drops"]:
            line += "  other=%s" % [(t.get("type"), t.get("reason")) for t in r["other_drops"]]
        if r.get("account_drops"):
            line += "  account_drops=%d paths=%s" % (r["account_drops"], r["account_dropped_paths"])
    print(line + "  (%s, %.1fs%s)" % (r["request_id"], r["seconds"], ", %d retr." % r["retries"] if r.get("retries") else ""))
    if r["diagnosis"]:
        d = r["diagnosis"]
        print("           why: kind=%s pattern=%s sections=%s changed_validated=%s position=%s item=%s" % (
            d.get("kind"), d.get("pattern"), d.get("sections"), d.get("changed_validated"), d.get("position"), d.get("item")))
    elif r["status"] == 200 and r["prefix_drops"]:
        print("           why: (no %s header on this response -- the header is best-effort; use the client-side diff)" % PREFIX_HEADER)
    err = full_error if full_error is not None else r["error"]
    if err:
        print("           error: %s" % err[:400])
    if r.get("missing_input_transformations"):
        print("           no input_transformations key on this 200: the check never saw the request (a gateway"
              " stripping anthropic-beta, or a surface without the controls) -- not evaluated")
    if r.get("binding_field_stripped"):
        print("           thinking_mismatch_allowed on this 200 although the request set thinking.block_binding:"
              " the field was stripped before the check (a gateway or proxy rebuilding the body), so the check ran"
              " record-only -- not evaluated")
    if r.get("account_drops"):
        print("           organization_binding_mismatch: another account produced those blocks, so they were dropped"
              " before the prefix check -- replay with a key from the account that made the capture, or one linked"
              " to it%s" % ("" if r.get("evaluated") else " -- not evaluated"))


def print_summary(summaries):
    print("\n== per conversation ==")
    for s in summaries:
        print("  %-24s requests=%d%s  first_break_turn=%s  dropped_blocks=%d  max_replayed_thinking=%d  patterns=%s  statuses=%s%s%s%s" % (
            s["conversation"][:24], s["requests_sent"], (" (+%d skipped)" % s["requests_skipped"]) if s["requests_skipped"] else "",
            s["first_break_turn"], s["distinct_dropped_blocks"],
            s["replayed_thinking_blocks_max"], ",".join(s["patterns"]) or "-", s["statuses"],
            ("  models=%s" % ",".join(s["models"])) if s.get("models") else "",
            ("  model_drop_turns=%s" % s["model_drop_turns"]) if s.get("model_drop_turns") else "",
            "  INCONCLUSIVE" if s["inconclusive"] else ""))
    conclusive = [s for s in summaries if not s["inconclusive"]]
    nothing_sent = [s for s in summaries if s["inconclusive"] and not s["unevaluated"]]
    n = len(conclusive)
    broken = sum(1 for s in conclusive if s["first_break_turn"] is not None)
    never_replayed = sum(1 for s in conclusive if s["replayed_thinking_blocks_max"] == 0)
    lost = sum(s["distinct_dropped_blocks"] for s in conclusive)
    unevald = [u for s in summaries for u in s["unevaluated"]]
    print("\n%d conversation(s) evaluated: %d with a prefix break (%.0f%%); %d distinct thinking block(s) dropped in total (turns of reasoning lost)" % (n, broken, 100.0 * broken / n if n else 0, lost))
    unclassified = sum(1 for s in summaries for r in s.get("_results", []) if r.get("other_drops"))
    if unclassified:
        print("%d request(s) reported a drop reason this probe does not classify -- read their input_transformations entries" % unclassified)
    model_switched = sum(1 for s in conclusive if s.get("model_drop_turns"))
    if model_switched:
        print("%d conversation(s) also had model_binding_mismatch drops (a model that cannot read earlier blocks) -- counted apart from prefix breaks; see each turn's model_drops" % model_switched)
    if unevald:
        by = {}
        for u in unevald:
            by[u["status"]] = by.get(u["status"], 0) + 1
        print("!! %d request(s) not evaluated (%s) -- %d conversation(s) marked inconclusive and left out of the share" % (
            len(unevald), ", ".join("HTTP %s x%d" % (k, v) if k is not None else "network error x%d" % v for k, v in by.items()),
            len(summaries) - n))
    if nothing_sent:
        print("!! %d conversation(s) had no request to send (every request was skipped: thinking disabled, or no replayed thinking) -- inconclusive, left out of the share" % len(nothing_sent))
    if never_replayed:
        print("!! %d conversation(s) never replayed a thinking block -- a clean result on those proves nothing about binding" % never_replayed)


def self_test(args, api_key, betas):
    """Three tiny live requests: one mint, then two replays of its thinking block - an honest replay
    (expect []) and an edited replay (expect a drop)."""
    if not args.model:
        raise SystemExit("--self-test needs --model <id of a model with preserved thinking>")
    q1 = "What is 17*23? Think it through, then answer with just the number."
    body1 = {"model": args.model, "max_tokens": 400, "thinking": {"type": "adaptive"},
             "output_config": {"effort": "max"},   # a short turn at default effort often carries no thinking
             "messages": [{"role": "user", "content": q1}]}
    print("self-test 1/3: minting a thinking block ...")
    shaped, _skip, _n = prepare(body1, args.mode, None, False, max_tokens=0)   # the mint needs a real reply
    status, headers, raw, _ = post_with_retries(args.base_url, "/v1/messages", shaped, betas, api_key, args.timeout)
    msg, tr = parse_body(status, raw, False)
    if status != 200:
        raise SystemExit("turn 1 failed: HTTP %d %s" % (status, (msg.get("error") or {}).get("message") if isinstance(msg, dict) else raw[:200]))
    content = msg.get("content", [])
    if not any(b.get("type") == "thinking" for b in content):
        raise SystemExit("turn 1 returned no thinking block; pick a model that returns thinking with a signature")
    print("   ok: %d content block(s), input_transformations=%s, request %s" % (len(content), tr, headers.get("request-id")))
    follow = {"role": "user", "content": "Now add 9 to that. Just the number."}
    honest = {"model": args.model, "max_tokens": 200, "thinking": {"type": "adaptive"},
              "messages": [{"role": "user", "content": q1}, {"role": "assistant", "content": content}, follow]}
    edited = json.loads(json.dumps(honest))
    edited["messages"][0]["content"] = "What is 17*23? Answer with just the number."   # the edit
    outcomes = {}
    for name, body, expect in (("honest replay", honest, "[]"), ("edited first message", edited, "a dropped-block entry (or a 400 in --mode error)")):
        print("self-test: %s (expect %s) ..." % (name, expect))
        shaped, _skip, _n = prepare(body, args.mode, None, args.stream, args.max_tokens)
        status, headers, raw, secs = post_with_retries(args.base_url, "/v1/messages", shaped, betas, api_key, args.timeout)
        msg, tr = parse_body(status, raw, args.stream)
        hdr = headers.get(PREFIX_HEADER)
        print("   HTTP %d  input_transformations=%s" % (status, json.dumps(tr)))
        print("   %s: %s" % (PREFIX_HEADER, hdr or "(absent)"))
        err = ((msg.get("error") or {}).get("message") or "") if (status != 200 and isinstance(msg, dict)) else ""
        if err:
            print("   error: %s" % err[:400])
        print("   request %s, %.1fs" % (headers.get("request-id") or headers.get("x-request-id"), secs))
        outcomes[name] = (status, tr, err)
    h_status, h_tr, _ = outcomes["honest replay"]
    e_status, e_tr, e_err = outcomes["edited first message"]
    honest_ok = h_status == 200 and h_tr == []
    if args.mode == "error":
        edited_ok = e_status == 400 and "bound to a different conversation" in e_err
    else:
        edited_ok = e_status == 200 and any(t.get("type") == DROPPED_ENTRY["type"] and t.get("reason") == "prefix_binding_mismatch" for t in (e_tr or []))
    if honest_ok and edited_ok:
        print("WIRED: the honest replay reported no drop and the edited replay was caught (%s)." % ("a 400, as the loud arm should" if args.mode == "error" else "reported as a dropped block"))
        return 0
    why = []
    if not honest_ok:
        if h_status == 200 and h_tr is None:
            why.append("the honest replay's 200 carried no input_transformations key at all -- the beta header did not"
                       " reach the API (a gateway or proxy stripping anthropic-beta, or a surface without the controls)")
        else:
            why.append("the honest replay did not come back 200 with an empty input_transformations (something in the path already edits the history)")
    if not edited_ok:
        if e_status == 200 and any(t.get("type") == ALLOWED_ENTRY["type"] for t in (e_tr or [])):
            why.append("the edited replay came back 200 with thinking_mismatch_allowed entries although the request set"
                       " thinking.block_binding: anthropic-beta reached the API but the field did not (a gateway or"
                       " proxy rebuilding the body and dropping thinking.block_binding), so the check records instead"
                       " of enforcing")
        else:
            why.append("the edited replay was not caught (wrong model id, the header missing, a platform without the controls, or the field misspelled)")
    print("NOT WIRED: " + "; ".join(why))
    return 1


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("capture", nargs="?", help="capture.jsonl or a directory of *.jsonl (one conversation each)")
    ap.add_argument("--mode", choices=["drop_block", "error"], default="drop_block")
    ap.add_argument("--model", help="override the model id in every request (default: the capture's own)")
    ap.add_argument("--base-url", default=DEFAULT_BASE_URL)
    ap.add_argument("--beta", action="append", default=[], help="extra anthropic-beta value(s); %s is always sent" % BINDING_BETA)
    ap.add_argument("--stream", action="store_true", help="replay with stream:true (input_transformations read from message_start)")
    ap.add_argument("--max-requests", type=int, default=0, help="cap per conversation (0 = all)")
    ap.add_argument("--max-conversations", type=int, default=0)
    ap.add_argument("--continue-after-error", action="store_true")
    ap.add_argument("--max-tokens", type=int, default=16, help="max_tokens on every replayed request (0 = keep the capture's); the verdict is decided before the first output token")
    ap.add_argument("--count-tokens", action="store_true", help="replay against /v1/messages/count_tokens instead of /v1/messages: free, runs the same conversation check; implies --mode error because a 400 is its only break signal (no input_transformations on a 200, so it cannot count dropped blocks)")
    ap.add_argument("--yes", action="store_true", help="send the replay; without it the plan is printed and nothing is sent (same as --dry-run), so a live run is always an explicit decision")
    ap.add_argument("--include-no-thinking", action="store_true", help="also send requests that replay no thinking block (skipped by default: they cannot fail the check and only add cost)")
    ap.add_argument("--retries", type=int, default=3, help="retries of the same request on 408/409/429/529/5xx (x-should-retry: false is honoured)")
    ap.add_argument("--timeout", type=float, default=600)
    ap.add_argument("--backoff", type=float, default=5)
    ap.add_argument("--json", help="write full per-request results to this file")
    ap.add_argument("--dry-run", action="store_true", help="validate the capture (structure, signatures, consecutive-pair diff via prefix_diff.py) and print the plan with an input-token estimate; send nothing")
    ap.add_argument("--self-test", action="store_true", help="three tiny live requests to check the wiring (needs --model and --yes); exits 1 if the check is not running")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)

    betas = [BINDING_BETA] + [b for b in args.beta if b != BINDING_BETA]
    creds = read_credentials()
    if creds and "authorization" in creds and OAUTH_BETA not in betas:
        # a bearer token (OAuth or workload identity) authenticates only with this beta value; without it the API
        # 401s every request, so the token path the guide advertises would never run
        betas.append(OAUTH_BETA)
    if args.count_tokens and args.mode != "error":
        # on the count endpoint a drop-mode 200 carries no input_transformations, so every turn would read "ok"
        # and the run would be a false clean; the loud arm is the only one the endpoint can report
        print("--count-tokens implies --mode error (the count endpoint reports a break only as a 400); using error mode.")
        args.mode = "error"
    if args.self_test:
        if not args.yes:
            # every live path sits behind --yes, the self-test included: a bare invocation prints the plan and stops
            print("self-test plan: three small live requests to %s on model=%s (one mint with a real reply, two replays"
                  " of its thinking block), billed at the model's normal rates; mode=%s; betas=%s"
                  % (args.base_url, args.model or "<--model required>", args.mode, ",".join(betas)))
            print("nothing sent: re-run with --yes to send them (they spend real money).")
            return 0
        if not creds:
            raise SystemExit(CREDENTIALS_HINT)
        return self_test(args, creds, betas)
    if not args.capture:
        ap.error("capture path required (or --self-test)")
    convs = load_capture(args.capture)
    if args.max_conversations:
        convs = dict(list(convs.items())[: args.max_conversations])
    n_req = sum(len(v) for v in convs.values())
    n_think = sum(count_thinking(b) for v in convs.values() for _, b, _h in v)
    n_tokens = sum(estimate_input_tokens(b) for v in convs.values() for _, b, _h in v)
    problems = validate(convs)
    # the plan uses prepare() so the "will be sent" count and the shaping notes match the live run exactly
    plan = []
    for v in convs.values():
        for label, b, _h in v:
            shaped, skip, notes = prepare(b, args.mode, args.model, args.stream, args.max_tokens)
            if not skip and count_thinking(b) == 0 and not args.include_no_thinking:
                skip = "replays no thinking block"
            plan.append((label, b, skip, notes))
    n_send = sum(1 for _l, _b, skip, _n in plan if not skip)
    n_tokens_send = sum(estimate_input_tokens(b) for _l, b, skip, _n in plan if not skip)
    shaping = {}
    for _l, _b, skip, notes in plan:
        for n in notes:
            shaping[n] = shaping.get(n, 0) + 1
    print("capture: %d conversation(s), %d request(s) of which %d replay thinking and will be sent, %d replayed thinking block(s) in total; mode=%s; betas=%s; base_url=%s"
          % (len(convs), n_req, n_send, n_think, args.mode, ",".join(betas), args.base_url))
    capture_models = sorted({b.get("model") for v in convs.values() for _l, b, _h in v if b.get("model")})
    print("model(s) in the capture: %s%s -- a block is judged by the model that minted it, so a capture whose blocks were"
          " minted by a model without preserved thinking cannot show a prefix break (see 'Suspect the test slice' in the guide)"
          % (", ".join(capture_models) or "(none)", ("; every request replayed as %s" % args.model) if args.model else ""))
    print("estimated input tokens for the %d request(s) to be sent: about %s (JSON bytes / 4, images excluded; all %d requests would be about %s; output capped at max_tokens=%d) -- price it at the model's current input rate for the approval"
          % (n_send, "{:,}".format(n_tokens_send), n_req, "{:,}".format(n_tokens), args.max_tokens))
    for p in problems:
        print("  note: " + p)
    for n, c in sorted(shaping.items()):
        print("  shaping (%d request(s)): %s" % (c, n))
    skipped_plan = [(l, s) for l, _b, s, _n in plan if s]
    if skipped_plan and not args.quiet:
        print("  %d request(s) will be skipped: %s" % (len(skipped_plan), "; ".join("%s (%s)" % ls for ls in skipped_plan[:8]) + (" ..." if len(skipped_plan) > 8 else "")))
    if n_think == 0:
        print("!! no request in this capture replays a thinking block: the prefix check has nothing to verify. "
              "Capture turns AFTER the first assistant reply, with its thinking blocks included.")
    if args.dry_run or not args.yes:
        print("dry run: nothing sent." if args.dry_run else "nothing sent: re-run with --yes to send the replay above (it spends real money).")
        return 0
    if not creds:
        raise SystemExit(CREDENTIALS_HINT)
    all_results, summaries = [], []

    def flush():
        if args.json:
            with open(args.json, "w") as f:
                json.dump({"mode": args.mode, "betas": betas, "results": all_results,
                           "summaries": [{k: v for k, v in s.items() if k != "_results"} for s in summaries]}, f, indent=2)

    if args.json:
        try:
            flush()   # an unwritable --json path must fail here, before the first request is billed
        except OSError as e:
            raise SystemExit("--json %s: %s" % (args.json, e))
    try:
        for cid, reqs in convs.items():
            if not args.quiet:
                print("\nconversation %s (%d request(s))" % (cid, len(reqs)))
            _results, summary = run_conversation(cid, reqs, args, creds, betas, all_results, flush)
            summaries.append(summary)
            flush()
    finally:
        try:
            flush()
        except OSError:
            pass   # the per-request flushes already persisted what they could
    print_summary(summaries)
    if args.json:
        print("wrote %s" % args.json)
    if any(s["first_break_turn"] is not None for s in summaries):
        return 2
    if any(s["inconclusive"] for s in summaries) or not summaries:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
