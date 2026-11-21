# Upgrading the `anthropic` Python SDK: 0.x -> 1.x

> **If you arrived via `/claude-api upgrade`:** this is the right file. Execute the steps below in order - do not summarize them back to the user. Start with Step 0 before touching any file.

`anthropic` 1.x is deliberately a small step from the last 0.x release: no method was restructured and no new pattern is required. Long-deprecated surface was removed, the HTTP layer moved from `httpx` to its maintained fork `httpx2`, and the minimum Python version is now 3.10. Almost every required edit is mechanical, and a type checker flags nearly all of them once 1.x is installed - which makes `pyright` / `mypy` output a good cross-check for the inventory below.

The SDK repository's `MIGRATION.md` is the authoritative change list - WebFetch it (URL in `shared/live-sources.md` -> SDK major-version upgrade guides) when you can, and if it disagrees with this file, follow `MIGRATION.md` and say so in your report. The other Python files in this skill may still show 0.x-era details; for a project on 1.x, this file takes precedence.


---

## Step 0: Confirm scope, current version, and target

**Scope - ask before editing unless it is already unambiguous.** Same rule as model migration: if the request does not name an exact file, a specific directory, or an explicit file list, ask one question offering (1) the whole working directory, (2) a specific subdirectory, (3) specific files - and wait. `upgrade`, `upgrade python`, "move my project to anthropic v1" are all scope-ambiguous. A trailing path in the subcommand (`upgrade python src/`) is a scope. Dependency manifests and lockfiles at the project root (`pyproject.toml`, `requirements*.txt`, `setup.py`/`setup.cfg`, `Pipfile`, `uv.lock`, `poetry.lock`) count as in scope whenever any code under them is - say so when you confirm the scope.

**Current version.** Read the declared requirement (`anthropic...` in the manifests above) and, if a project environment is available, the installed one (`python -c "import anthropic; print(anthropic.__version__)"`). If the project is already on 1.x, skip the dependency bump and treat this as a call-site cleanup. If nothing in scope declares the dependency (a bare scripts directory, or `anthropic` arrives transitively), don't invent a manifest - upgrade the code and put the install command in the report.

**Target version.** Before writing any pin, confirm a 1.x release is actually published: `pip index versions anthropic` (or `curl -s https://pypi.org/pypi/anthropic/json` and read `info.version`). Use the newest 1.x you find. If no 1.x release exists yet, stop and tell the user - do not write an uninstallable requirement. If you cannot check (no network), proceed with `>=1,<2` and list the unverified pin in your report.

If the scope is under git, check `git status` before editing - unexpected modifications mean a concurrent process; stop and investigate before proceeding.

## Step 1: Inventory the call sites

Search the scope for each signal below (`rg -n -F` for the literal strings; exclude virtualenvs, `.git`, build output and vendored code) and keep the hit list - it is your checklist and, re-run at the end, your verification.

| Signal | What it finds | Section |
|---|---|---|
| `requires-python`, `python_requires`, `python-version`, `py39`, `3.9` in manifests, CI config, `tox.ini`, `noxfile.py`, `.python-version`, `Dockerfile` | a Python 3.9 floor | Step 2 |
| `anthropic` entries in manifests / lockfiles; `httpx-aiohttp`, `httpx_aiohttp` | the pins to change | Step 2 |
| `import httpx`, `from httpx` | modules that may hand `httpx` objects to the SDK | Step 3 |
| `respx`, `pytest_httpx` / `httpx_mock`, `vcr`, `MockTransport`; `HTTPXClientInstrumentor` / `opentelemetry.instrumentation.httpx`, `HttpxIntegration` (Sentry) | HTTP mocking and tracing / APM instrumentation that patch `httpx` and silently stop seeing SDK traffic | Step 3 |
| `with_raw_response` | raw-response call sites | Step 4 |
| `LegacyAPIResponse`, `_legacy_response` | annotations / imports of the removed class | Step 4 |
| `completions.create`, `HUMAN_PROMPT`, `AI_PROMPT`, `max_tokens_to_sample` | the removed Text Completions API | Step 5 |
| `temperature`, `top_p`, `top_k` (keyword arguments and quoted dict keys) | removed sampling parameters - only hits that feed Anthropic SDK calls count | Step 6 |
| `output_format` | raw `output_format={...}` dicts vs the unchanged `output_format=Model` helper argument | Step 6 |
| `BetaBase64PDFBlockParam`, `READ_MAX_BYTES`, `ProxiesTypes` / `Transport` imported from `anthropic`, `AsyncTransport` / `ProxiesDict` imported from `anthropic._types` | renamed / removed exports | Step 7 |
| `.parse(` calls that pass `stream=` | `messages.parse(stream=...)` | Step 8 |
| `compaction_control` | client-side tool-runner compaction | Step 8 |
| `body=` on `client.get` / `post` / `put` / `patch` / `delete` calls whose value is `bytes` (`b"..."`, `.encode()`, a bytes variable) | raw bytes passed as `body=` | Step 8 |
| `isinstance(` checks against `Stream` / `AsyncStream` | checks aimed at message streams | Step 8 |
| `default_headers`, `extra_headers`, `ANTHROPIC_CUSTOM_HEADERS` | header maps to check for duplicate casings / `bytes` values | Step 9 |
| `AnthropicBedrock(`, `AsyncAnthropicBedrock(` | Bedrock clients that may rely on the old region fallback | Step 10 |

Classify each hit before editing: **SDK call site** (edit), **unrelated use of the same name** (leave - e.g. `httpx` calls to other services, `urllib.parse`, a pydantic `.parse_obj`, a `temperature` variable for a thermostat), **test** (edit, and keep the test meaningful), **docs / README snippet or notebook inside the scope** (edit - for `.ipynb`, the greps match inside the JSON cell sources; edit the source strings, `%pip install` lines included, and keep the JSON valid). Never touch installed packages or vendored third-party code.

## Step 2: Environment - Python >= 3.10 and the dependency pins

- **[DECIDE] Python floor.** 1.x requires Python 3.10+. If the project still declares or tests 3.9 (`requires-python = ">=3.9"`, trove classifiers, a `3.9` CI matrix entry, tox/nox envs, a `python:3.9` base image), that is the user's decision, not a silent edit: propose the floor bump and the CI-matrix change as their own hunk and call it out in the report. On 3.9, `pip` simply keeps resolving the last 0.x release, so nothing breaks until they move.
- **[BREAKS] The `anthropic` requirement.** Rewrite it in the file's existing style - `anthropic>=1,<2` for a range, `anthropic~=1.0` / Poetry `^1.0` for compatible-release styles, `anthropic==<latest 1.x from Step 0>` where the project pins exactly. Extras (`anthropic[bedrock]`, `[vertex]`, `[aiohttp]`) are unchanged. Regenerate the lockfile with the project's own tool (`uv lock`, `poetry lock`, `pip-compile`, `pipenv lock`) if you can run it; otherwise give the user the exact command.
- **`httpx-aiohttp`.** If it is pinned only so `DefaultAioHttpClient()` works, remove it - the aiohttp transport now ships inside the SDK and the `aiohttp` extra installs only `aiohttp`.
- **`httpx2` / `httpx`.** After Step 3, if any project module imports `httpx2` directly, add `httpx2` to the declared dependencies (it arrives transitively with `anthropic`, but direct imports should be declared). `httpx2` has its own version line starting at 2.0 - write `httpx2>=2.0` (or match what `anthropic` resolved: `pip index versions httpx2`), never a specifier copied from the old `httpx` pin such as `>=0.27`. Keep `httpx` declared only if the project still uses it for something other than the SDK.

Pydantic v1 and v2 both remain supported; nothing else about the environment changes.

## Step 3: `httpx` -> `httpx2`, only where objects cross the SDK boundary

`httpx2` is the API-compatible, maintained fork of `httpx` (same classes, same behaviour). The change only matters for `httpx` objects handed **to** the SDK or received **from** it; plain values (`timeout=30.0`, `max_retries=3`) need nothing.

- **[BREAKS] Objects passed in.** `httpx.Timeout`, `httpx.Limits`, transports (`httpx.HTTPTransport(...)`, `AsyncHTTPTransport`, `MockTransport`), and whole clients (`httpx.Client` / `AsyncClient` as `http_client=`) must come from `httpx2`. An old-`httpx` client passed as `http_client=` raises `TypeError` at construction. This includes the project's own middleware, not just the outermost object handed to `Anthropic(...)`: a `class TracingTransport(httpx.BaseTransport)` subclass, the inner `httpx.HTTPTransport()` a wrapper delegates to, an `httpx.Auth` flow, and the annotations on `event_hooks` callables all re-base onto `httpx2` - a wrapper left delegating to an old-`httpx` transport hands the SDK `httpx.Response` objects. If the module uses `httpx` only for the SDK, alias the import (`import httpx2 as httpx`) and nothing else changes; if it also talks to other services with `httpx`, import both and switch only the SDK-bound objects to `httpx2`. Prefer the SDK's own re-exports where they let you drop the import entirely: `anthropic.Timeout`, `anthropic.DefaultHttpxClient`, `anthropic.DefaultAsyncHttpxClient`, `anthropic.DefaultAioHttpClient` (all already `httpx2`-based, all unchanged).

  ```python
  # Before
  import httpx
  from anthropic import Anthropic, DefaultHttpxClient

  client = Anthropic(
      timeout=httpx.Timeout(60.0, connect=5.0),
      http_client=DefaultHttpxClient(proxy="http://proxy.example", transport=httpx.HTTPTransport(retries=1)),
  )

  # After
  import httpx2 as httpx
  from anthropic import Anthropic, DefaultHttpxClient

  client = Anthropic(
      timeout=httpx.Timeout(60.0, connect=5.0),
      http_client=DefaultHttpxClient(proxy="http://proxy.example", transport=httpx.HTTPTransport(retries=1)),
  )
  ```

- **[DECIDE] Or alias process-wide, for applications.** `httpx2.alias_httpx()` makes `import httpx` / `import httpcore` resolve to `httpx2` / `httpcore2` for the whole process, so nothing else needs editing. Reach for it instead of the import edits when the scope is an **application** that shares clients, transports or exception types between the SDK and other `httpx` code, or that relies on tooling which patches `httpx` itself (tracing / APM instrumentation, HTTP mocking - see **Instrumentation and tests** below). Two hard rules: it must run before anything imports `httpx` or `httpcore` (otherwise it raises `RuntimeError`; calling it twice is a no-op), so it goes at the very top of the entry point; and it is for applications only - never add it to a **library's** import path on behalf of that library's users (edit the imports there instead). Say which you chose and why in the report.

  ```python
  # the very first lines of the application's entry point
  import httpx2

  httpx2.alias_httpx()

  import httpx  # now the httpx2 module: httpx.Client is httpx2.Client
  ```

- **[BREAKS] Objects coming out.** `APIStatusError.response`, `APIConnectionError.request`, `.http_response` / `.headers` / `.url` on raw and streaming responses, the `request` / `response` arguments your `http_client` event hooks receive, and `cast_to=httpx.Response` on the low-level `client.get/post/...` methods are now `httpx2` types with identical attributes. Only `isinstance` checks and annotations naming `httpx.Response` / `httpx.Request` / `httpx.Headers` / `httpx.URL` change (`httpx2.Response`, ...).
- **Removed re-exports.** `anthropic.Transport` and `anthropic.ProxiesTypes` (and `AsyncTransport` / `ProxiesDict` from `anthropic._types`) are gone; use `httpx2.BaseTransport`, `httpx2.AsyncBaseTransport`, `httpx2.Proxy` (or a proxy URL string).
- **Instrumentation and tests.** Libraries that observe or stub HTTP by patching `httpx` - OpenTelemetry's `HTTPXClientInstrumentor`, Sentry's `httpx` integration, `respx`, `pytest-httpx`, `vcrpy` - keep importing fine but silently stop seeing the SDK's requests, so nothing fails loudly. The fix is the same `httpx2.alias_httpx()` call - not swapping in some `*-httpx2` instrumentation package (verify any such name is a real, populated release before depending on it) - made before any of them (or `httpx`) is imported: at the top of the application entry point for instrumentation, and under pytest as an early plugin so it runs before `respx` / `pytest-httpx` and the test modules load:

  ```python
  # tests/_alias_httpx.py
  import httpx2

  httpx2.alias_httpx()  # `import httpx` / `import httpcore` now resolve to httpx2 / httpcore2
  ```

  ```toml
  # pyproject.toml
  [tool.pytest.ini_options]
  addopts = "-p tests._alias_httpx"
  pythonpath = ["."]
  ```

  Merge into an existing `addopts` rather than replacing it (`pytest.ini` / `setup.cfg` / `tox.ini` equivalents work the same way). Transport-level fakes (`httpx2.Client(transport=httpx2.MockTransport(handler))`, a handler typed `httpx2.Request -> httpx2.Response`) only need the import swap.

## Step 4: `.with_raw_response` returns `APIResponse` / `AsyncAPIResponse`

`.with_raw_response` used to return `LegacyAPIResponse` on both clients; it now returns the same classes `.with_streaming_response` already used. Two consequences:

- **[BREAKS] On async clients, reading the body is awaited** - `parse()`, `json()`, `text()`, `read()` are coroutines. Decide sync vs async from the client the accessor hangs off (`AsyncAnthropic` and the other `Async*` platform clients) or an `await` on the `.with_raw_response...(...)` call itself - not from the enclosing function alone.
- **[BREAKS] `.text` and `.content` are methods now, on the sync client too:** `.text` -> `.text()`, `.content` -> `.read()`. The new classes also expose `json()` and the `iter_bytes()` / `iter_text()` / `iter_lines()` iterators directly; 0.x code reached those through `r.http_response`, which still works and need not be rewritten.

| 0.x (`LegacyAPIResponse`) | 1.x sync (`APIResponse`) | 1.x async (`AsyncAPIResponse`) |
|---|---|---|
| `r.parse()` | `r.parse()` | `await r.parse()` |
| `r.text` | `r.text()` | `await r.text()` |
| `r.content` | `r.read()` | `await r.read()` |
| - (only `r.http_response.json()`) | `r.json()` | `await r.json()` |
| - (only `r.http_response.iter_bytes()` ...) | `r.iter_bytes()` / `.iter_text()` / `.iter_lines()` | `async for chunk in r.iter_bytes():` ... |
| `.headers`, `.status_code`, `.url`, `.request_id`, `.retries_taken`, `.http_response`, `.elapsed` | unchanged | unchanged (plain attributes - never awaited) |

```python
# Before (async client)
raw = await client.messages.with_raw_response.create(...)
print(raw.headers["request-id"], raw.text)
message = raw.parse()

# After
raw = await client.messages.with_raw_response.create(...)
print(raw.headers["request-id"], await raw.text())
message = await raw.parse()
```

Anchor every edit on a value that demonstrably comes from a `.with_raw_response.` call (follow it through variables, return values and fixtures); do not touch `.parse()` / `.text` on unrelated objects, and do not double-await. Annotations and imports of `anthropic._legacy_response.LegacyAPIResponse` become `anthropic.APIResponse` / `anthropic.AsyncAPIResponse`. `.with_streaming_response` code is unchanged.

## Step 5: Text Completions -> Messages (the one non-mechanical change)

**[BREAKS]** `client.completions.create()` (`/v1/complete`), the `Completion` types, and the `anthropic.HUMAN_PROMPT` / `anthropic.AI_PROMPT` constants are removed (also from `AnthropicBedrock`). Port each call to `client.messages.create()`:

- the `f"{HUMAN_PROMPT} ...{AI_PROMPT}"` prompt string becomes `messages=[{"role": "user", "content": "..."}]`; text that preceded the first `HUMAN_PROMPT` as instructions becomes `system=`; alternating `HUMAN_PROMPT`/`AI_PROMPT` turns become alternating `user`/`assistant` messages;
- `max_tokens_to_sample=` -> `max_tokens=`; `stop_sequences=` carries over; drop `temperature`/`top_p`/`top_k` (Step 6);
- `completion.completion` -> the text blocks of `message.content` (`"".join(b.text for b in message.content if b.type == "text")`); `stop_reason` values carry over (`"stop_sequence"`, `"max_tokens"`), with `"end_turn"` as the new normal-completion value;
- `stream=True` completions -> `client.messages.stream(...)` and its `text_stream`.

```python
# Before
from anthropic import AI_PROMPT, HUMAN_PROMPT

completion = client.completions.create(
    model="claude-2.1",
    max_tokens_to_sample=256,
    prompt=f"{HUMAN_PROMPT} Why is the sky blue?{AI_PROMPT}",
)
print(completion.completion)

# After
message = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=256,
    messages=[{"role": "user", "content": "Why is the sky blue?"}],
)
print("".join(block.text for block in message.content if block.type == "text"))
```

**[DECIDE] The model.** Code still on Text Completions usually pins a retired model (`claude-2.x`, `claude-instant-*`), which 404s regardless of SDK version. Keep a model that is still served; otherwise switch to `claude-opus-5-5` so the code runs, say so prominently in the report, and point the user at `/claude-api migrate` for validating prompts against the new model - a completions-era prompt is exactly what `shared/prompt-audit.md` exists for.

## Step 6: Removed request parameters

- **[BREAKS] `temperature`, `top_p`, `top_k`** are no longer accepted by `messages.create()` / `.stream()` / `.parse()`, their `beta.messages` counterparts, or `beta.messages.tool_runner()` (passing them is a `TypeError`), and are gone from the per-request `params` TypedDict of `messages.batches.create()` (a type checker flags the key; at runtime the SDK still forwards it). Delete them - they are gone from the 1.x signatures, not from the API, and whether a model still honours them is a model question (`shared/model-migration.md`): Opus 4.7 and later return a 400 for any request that carries one (the default value included), Claude Sonnet 5.5, Claude Sonnet 5, and Claude Haiku 5.5 reject non-default values, and every still-served model before those accepts them - the Claude 4.6 / 4.5 line (Opus 4.6, Sonnet 4.6, Opus 4.5, Sonnet 4.5, Haiku 4.5) and the deprecated-but-still-served Claude 4 models (`shared/models.md` -> Deprecated Models). So **[DECIDE]** when the call pins one of those accepting models and visibly depends on the setting (a documented determinism requirement, an A/B on temperature), move it into `extra_body` instead of deleting it - `extra_body={"temperature": 0.2}` is merged into the request JSON as-is - and for a `messages.batches.create()` request leave the key in that request's `params` dict (it is forwarded, see above). A call that pins a retired model (`shared/models.md` -> Retired Models) is the `migrate` flow's problem first: it needs a replacement model, and the replacement decides whether the setting survives. Say which calls kept a setting this way in the report. When a test existed only to assert that these parameters pass through, keep it meaningful by asserting on parameters that still exist (`stop_sequences`, `metadata`, `service_tier`, `max_tokens`) rather than deleting it.

  ```python
  # Before
  client.messages.create(..., model="claude-sonnet-4-6", temperature=0.2)

  # After (only when the pinned model accepts it and the code depends on it)
  client.messages.create(..., model="claude-sonnet-4-6", extra_body={"temperature": 0.2})
  ```

- **[BREAKS] `output_format={...}` as a raw dict/TypedDict** - on `beta.messages.create()`, `beta.messages.count_tokens()` and batch params (where the parameter is gone) and on the `messages.stream()` / `messages.count_tokens()` / `beta.messages.stream()` helpers (which used to accept a dict as well and now raise `TypeError` for one) -> `output_config={"format": {...}}` (merge into an existing `output_config` if one is already passed, e.g. alongside `effort`). **Leave `output_format=SomeModel` alone** when the value is a *type* (a Pydantic model / class passed to the `parse()`, `stream()` or `tool_runner()` helpers, or to the non-beta `messages.count_tokens()`) - that is the one form the helpers still take (`beta.messages.count_tokens()` only ever took the dict form, and has no `output_format` at all now). Tell them apart by the value: dict literal / `{"type": "json_schema", ...}` -> migrate; a class name -> keep.

  ```python
  # Before
  client.beta.messages.create(..., temperature=0.2, output_format={"type": "json_schema", "schema": Order.model_json_schema()})

  # After
  client.beta.messages.create(..., output_config={"format": {"type": "json_schema", "schema": Order.model_json_schema()}})
  # or, usually better: client.beta.messages.parse(..., output_format=Order)
  ```

## Step 7: Renamed and removed names (pure renames)

**[BREAKS]** Replace imports and every reference; the replacement types are identical.

| Removed | Replacement |
|---|---|
| `anthropic.types.beta.BetaBase64PDFBlockParam` | `anthropic.types.beta.BetaRequestDocumentBlockParam` |
| `anthropic.Transport` / `anthropic.ProxiesTypes` (and `anthropic._types.AsyncTransport` / `ProxiesDict`) | `httpx2.BaseTransport` / `httpx2.Proxy` (`httpx2.AsyncBaseTransport`) |
| `anthropic.HUMAN_PROMPT` / `anthropic.AI_PROMPT` | none - Step 5 |
| `anthropic.lib.tools.agent_toolset.READ_MAX_BYTES` | `anthropic.lib.tools.agent_toolset.DEFAULT_MAX_FILE_BYTES` |

## Step 8: Removed helper arguments and behaviour

- **[BREAKS] `messages.parse(..., stream=True)`** (and `beta.messages.parse`): the argument is gone (it never streamed). Use the streaming helper, which supports the same structured-output types:

  ```python
  # Before
  result = client.messages.parse(..., output_format=Order, stream=True)

  # After
  with client.messages.stream(..., output_format=Order) as stream:
      order = stream.get_final_message().parsed_output
  ```

  A `parse(..., stream=False)` just loses the argument.
- **[BREAKS] `tool_runner(compaction_control=...)`** - client-side compaction is removed in favour of server-side compaction. Carry the old `context_token_threshold` over as the trigger value (the API minimum is 50,000; raise smaller values to that and mention it):

  ```python
  # Before
  runner = client.beta.messages.tool_runner(..., compaction_control={"enabled": True, "context_token_threshold": 100_000})

  # After
  runner = client.beta.messages.tool_runner(
      ...,
      betas=["compact-2026-01-12"],
      context_management={"edits": [{"type": "compact_20260112", "trigger": {"type": "input_tokens", "value": 100_000}}]},
  )
  ```

  If the loop around the runner rebuilds `messages` itself, make sure it appends the full `message.content` (compaction blocks included) - see the Compaction section of `python/claude-api/README.md`.
- **[BREAKS] Raw `bytes` as `body=`** on `client.get/post/put/patch/delete`: `body=` is always JSON-serialised now; raw payloads (and iterators, for streaming uploads) go through `content=`:

  ```python
  # Before
  client.post("/v1/example", body=b"raw payload", cast_to=httpx.Response)

  # After
  client.post("/v1/example", content=b"raw payload", cast_to=httpx2.Response)
  ```

- **[BREAKS] `isinstance(x, anthropic.Stream)` / `AsyncStream` meant to match `client.messages.stream()` objects** now returns `False` (the compatibility shim and its `DeprecationWarning` are gone). Check for `anthropic.lib.streaming.MessageStream` / `AsyncMessageStream` instead; keep `Stream` only where the value really is a raw `create(stream=True)` stream.

## Step 9: Header names are matched case-insensitively

Usually nothing to edit. The SDK now merges `default_headers`, `extra_headers`, `with_options(default_headers=...)` and `ANTHROPIC_CUSTOM_HEADERS` case-insensitively: a later entry replaces an earlier header of the same name whatever its casing (including headers the SDK sets itself), and `omit` removes one the same way. Scan the Step 1 hits for two things and fix only those: **[DECIDE]** the same header name spelled with two casings where the code relied on both lines being sent (send one comma-joined value instead), and **[BREAKS]** `bytes` header values, which now raise - `.decode()` them.

## Step 10: Bedrock - a region is required

**[DECIDE]** `AnthropicBedrock()` / `AsyncAnthropicBedrock()` used to warn and fall back to `us-east-1` when no region was configured; they now raise `ValueError` at construction. Resolution order: `aws_region=` -> `AWS_REGION` / `AWS_DEFAULT_REGION` -> the region configured for the boto3 session / `aws_profile` (the profile is now honoured for region lookup). For each construction without `aws_region=`, check whether the deployment provides a region (env files, Dockerfiles, deployment manifests, AWS profile config in the repo). If it demonstrably does, nothing to do; if you cannot tell, do **not** invent a region - list the call site in the report as needing `aws_region=` or `AWS_REGION`, and only hardcode `"us-east-1"` if the user confirms that the old implicit default is what they were actually using.

Streaming from Bedrock also changes: event types the SDK does not know are now skipped instead of yielded - the only known case is the `amazon-bedrock-invocationMetrics` frame. Code that filtered those frames out can be deleted; code that *consumed* invocation metrics loses them on 1.x - **[DECIDE]** list it in the report (the SDK asks such users to open an issue).

## Step 11: Verify

1. Re-run the Step 1 greps over the scope. Every remaining hit needs a reason (unrelated `httpx` use, `Raw*` names, helper `output_format=Model`, ...) - put the reasons in the report.
2. `python -m compileall -q <scope>` must pass. If the project has a type checker configured, run it - nearly every missed call site is a type error on 1.x. Run the test suite if it is runnable without credentials.
3. If 1.x is installed in the environment: `python -c "import anthropic, httpx2; print(anthropic.__version__)"`.

## Step 12: Report

Lead with the outcome, then:

- what changed, grouped by the steps above, with file counts and the notable files;
- **decisions the user owns** - Python floor / CI matrix (Step 2), import edits vs `alias_httpx()` (Step 3), sampling-parameter reliance (Step 6), the model chosen for ported completions calls (Step 5), duplicate-casing headers (Step 9), Bedrock regions and invocation metrics (Step 10);
- if you introduced `httpx2` anywhere, one provenance line, because reviewers and supply-chain scanners flag unfamiliar package names as possible typosquats: it is the SDK's own HTTP dependency, the maintained fork of `httpx` by its original author, published by Pydantic (`github.com/pydantic/httpx2`), version line 2.x;
- what you could not verify (offline PyPI check, no type checker, tests not runnable, pre-commit hooks that need the new packages installed) and the exact commands to finish: the install / lock command and, if relevant, `pip uninstall httpx-aiohttp`.

## Checklist

- [ ] **[BREAKS]** `anthropic` requirement moved to 1.x in the project's pin style; lockfile regenerated or command given
- [ ] **[DECIDE]** Python >= 3.10 floor and CI matrix proposed as a separate hunk
- [ ] **[BREAKS]** `httpx` objects passed to / received from the SDK (custom transports, auth flows and event hooks included) come from `httpx2` - or **[DECIDE]** `httpx2.alias_httpx()` at the top of an application entry point; `httpx`-patching instrumentation / mocking (`respx`, `pytest-httpx`, `vcrpy`, OpenTelemetry, Sentry) covered by the alias; `httpx-aiohttp` dropped; `httpx2>=2.0` declared if imported
- [ ] **[BREAKS]** async `.with_raw_response`: `await` on `parse()/json()/text()/read()`; `.text` -> `.text()`, `.content` -> `.read()` everywhere; `LegacyAPIResponse` annotations replaced
- [ ] **[BREAKS]** `completions.create` / `HUMAN_PROMPT` / `AI_PROMPT` ported to Messages; **[DECIDE]** model choice surfaced
- [ ] **[BREAKS]** `temperature` / `top_p` / `top_k` removed from SDK calls - or, **[DECIDE]**, moved to `extra_body` only where the call pins an older model *and* visibly depends on the setting; raw `output_format={...}` -> `output_config={"format": ...}` everywhere (helpers included); helper `output_format=Model` untouched
- [ ] **[BREAKS]** `BetaBase64PDFBlockParam` -> `BetaRequestDocumentBlockParam`; `Transport`/`AsyncTransport`/`ProxiesTypes` -> `httpx2` names; `READ_MAX_BYTES` -> `DEFAULT_MAX_FILE_BYTES`
- [ ] **[BREAKS]** `parse(stream=)` -> `messages.stream()`; `compaction_control` -> server-side compaction; `body=bytes` -> `content=`; `Stream` isinstance checks retargeted
- [ ] **[DECIDE]** duplicate-casing headers joined; **[BREAKS]** `bytes` header values decoded
- [ ] **[DECIDE]** Bedrock constructions without a discoverable region listed, not guessed; invocation-metrics consumers flagged
- [ ] Step 11 verification run and Step 12 report written
