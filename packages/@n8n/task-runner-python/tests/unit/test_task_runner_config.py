import os
from unittest.mock import patch

from src.config.task_runner_config import TaskRunnerConfig
from src.constants import ENV_ALLOW_TRANSITIVE_IMPORTS, ENV_GRANT_TOKEN


class TestAllowTransitiveImports:
    def test_defaults_to_false(self):
        with patch.dict(os.environ, {ENV_GRANT_TOKEN: "t"}, clear=True):
            assert TaskRunnerConfig.from_env().allow_transitive_imports is False

    def test_reads_true_from_env(self):
        with patch.dict(
            os.environ,
            {ENV_GRANT_TOKEN: "t", ENV_ALLOW_TRANSITIVE_IMPORTS: "true"},
            clear=True,
        ):
            assert TaskRunnerConfig.from_env().allow_transitive_imports is True
