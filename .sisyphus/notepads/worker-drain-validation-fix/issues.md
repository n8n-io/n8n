
2026-05-09: Skipped adding a new route-guard assertion because the existing route metadata tests already cover auth/scope and the worker-server test intentionally only verifies worker-local mounts; adding decorator-internal path assertions would be brittle for this quick verification pass.

2026-05-09: Final docs rejection came from the summary route bullet still showing the bare orchestration path. Fixing that line to the default public `/rest/...` path, while keeping the existing `N8N_REST_ENDPOINT` guidance and worker-local fallback notes, was enough for the follow-up validation pass.
