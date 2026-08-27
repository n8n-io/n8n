"""Python half of the allowlist-parsing contract.

n8n parses N8N_RUNNERS_STDLIB_ALLOW / N8N_RUNNERS_EXTERNAL_ALLOW too, so it can tell
the workflow builder what a Code node may import. Both parsers read the same fixture,
so a change to either side that alters the meaning fails here or in its n8n twin
(packages/cli/src/modules/instance-ai/__tests__/python-import-policy.contract.test.ts)
instead of silently letting the builder describe a policy the runner does not enforce.
"""

import json
from pathlib import Path

import pytest

from src.config.task_runner_config import parse_allowlist
from src.errors import ConfigurationError

FIXTURE = Path(__file__).parent.parent / "fixtures" / "allowlist-parsing.json"

CASES = json.loads(FIXTURE.read_text())["cases"]

VALID_CASES = [c for c in CASES if not c.get("invalid")]
INVALID_CASES = [c for c in CASES if c.get("invalid")]


class TestAllowlistParsingContract:
    @pytest.mark.parametrize("case", VALID_CASES, ids=lambda c: c["name"])
    def test_parses_to_the_agreed_modules(self, case):
        assert parse_allowlist(case["input"], "N8N_RUNNERS_STDLIB_ALLOW") == set(
            case["modules"]
        )

    @pytest.mark.parametrize("case", INVALID_CASES, ids=lambda c: c["name"])
    def test_rejects_the_agreed_invalid_inputs(self, case):
        with pytest.raises(ConfigurationError):
            parse_allowlist(case["input"], "N8N_RUNNERS_STDLIB_ALLOW")

    def test_fixture_covers_both_outcomes(self):
        # A fixture that lost all of one kind would make half the contract vacuous.
        assert VALID_CASES and INVALID_CASES
