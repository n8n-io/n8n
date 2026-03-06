import asyncio
import os
import re
import sys
from pathlib import Path

from src.constants import (
    ENV_GRACEFUL_SHUTDOWN_TIMEOUT,
    ENV_GRANT_TOKEN,
    ENV_HEALTH_CHECK_SERVER_ENABLED,
    ENV_HEALTH_CHECK_SERVER_PORT,
    ENV_LAUNCHER_LOG_LEVEL,
    ENV_TASK_BROKER_URI,
    ENV_TASK_TIMEOUT,
)

from tests.fixtures.test_constants import (
    GRACEFUL_SHUTDOWN_TIMEOUT,
    TASK_TIMEOUT,
)


class TaskRunnerManager:
    """Responsible for managing the lifecycle of a task runner subprocess."""

    def __init__(
        self,
        task_broker_url: str | None = None,
        graceful_shutdown_timeout: float | None = None,
        custom_env: dict[str, str] | None = None,
    ):
        self.task_broker_url = task_broker_url
        self.graceful_shutdown_timeout = graceful_shutdown_timeout
        self.custom_env = custom_env or {}
        self.subprocess: asyncio.subprocess.Process | None = None
        self.stdout_buffer: list[str] = []
        self.stderr_buffer: list[str] = []
        self.health_check_port: int | None = None

    async def start(self):
        project_root = Path(__file__).parent.parent.parent
        runner_path = project_root / "src" / "main.py"

        env_vars = os.environ.copy()
        env_vars[ENV_GRANT_TOKEN] = "test_token"
        env_vars[ENV_TASK_BROKER_URI] = self.task_broker_url
        env_vars[ENV_TASK_TIMEOUT] = str(TASK_TIMEOUT)
        env_vars[ENV_HEALTH_CHECK_SERVER_ENABLED] = "true"
        env_vars[ENV_HEALTH_CHECK_SERVER_PORT] = "0"
        env_vars[ENV_LAUNCHER_LOG_LEVEL] = "INFO"
        if self.graceful_shutdown_timeout is not None:
            env_vars[ENV_GRACEFUL_SHUTDOWN_TIMEOUT] = str(
                self.graceful_shutdown_timeout
            )
        env_vars["PYTHONPATH"] = str(project_root)
        env_vars.update(self.custom_env)

        self.subprocess = await asyncio.create_subprocess_exec(
            sys.executable,
            str(runner_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env_vars,
            cwd=str(project_root),
        )

        asyncio.create_task(self._read_stdout())
        asyncio.create_task(self._read_stderr())

        await self._wait_for_health_check_port()

    def is_running(self) -> bool:
        return self.subprocess is not None and self.subprocess.returncode is None

    def get_health_check_url(self) -> str:
        return f"http://localhost:{self.health_check_port}"

    async def stop(self) -> None:
        if not self.subprocess or self.subprocess.returncode is not None:
            return

        self.subprocess.terminate()
        try:
            await asyncio.wait_for(
                self.subprocess.wait(), timeout=GRACEFUL_SHUTDOWN_TIMEOUT
            )
        except asyncio.TimeoutError:
            self.subprocess.kill()
            await self.subprocess.wait()

    async def _read_stdout(self):
        if not self.subprocess or not self.subprocess.stdout:
            return

        while True:
            line = await self.subprocess.stdout.readline()
            if not line:
                break
            self.stdout_buffer.append(line.decode().strip())

    async def _read_stderr(self):
        if not self.subprocess or not self.subprocess.stderr:
            return

        while True:
            line = await self.subprocess.stderr.readline()
            if not line:
                break
            self.stderr_buffer.append(line.decode().strip())

    async def _wait_for_health_check_port(self, timeout: float = 5.0):
        pattern = re.compile(r"Health check server listening on .+, port (\d+)")
        start_time = asyncio.get_running_loop().time()

        while asyncio.get_running_loop().time() - start_time < timeout:
            for line in self.stdout_buffer:
                match = pattern.search(line)
                if match:
                    self.health_check_port = int(match.group(1))
                    return

            await asyncio.sleep(0.1)

        raise TimeoutError(
            f"Failed to detect health check port within {timeout}s. "
            f"Stdout: {self.stdout_buffer}"
        )
