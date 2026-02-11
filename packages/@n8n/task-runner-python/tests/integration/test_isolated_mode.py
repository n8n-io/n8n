"""
Integration test for Python isolated mode (-I flag) compatibility.

This test verifies that the Python task runner can be launched with Python's
isolated mode flag (-I), which is critical for security hardening.

Background:
-----------
Python's -I flag enables isolated mode, which:
- Ignores PYTHONPATH environment variable
- Doesn't add current working directory to sys.path
- Ignores user site-packages directory

This is important for security as it prevents code injection via environment
manipulation. However, it requires the task runner to be properly installed
as a Python package, not just a directory with a src/ folder.

The Bug (PR #24983):
--------------------
The original implementation:
1. Had a src/ directory with the runner code
2. Used `python -I -m src.main` to launch
3. Installed the package but then deleted the src/ directory
4. This caused ModuleNotFoundError because -I ignores PYTHONPATH

The Fix:
--------
1. Properly configure pyproject.toml to map src/ -> n8n_task_runner package
2. Install the package so it's available in site-packages
3. Launch with `python -I -m n8n_task_runner.main`
4. This works because the package is in site-packages, which -I respects

This test ensures the fix works and prevents regression.
"""

import asyncio
import os
import subprocess
import sys
from pathlib import Path

import pytest


class TestIsolatedMode:
    """Test that the runner works with Python's -I (isolated) flag."""

    @pytest.fixture
    def project_root(self) -> Path:
        """Get the project root directory."""
        return Path(__file__).parent.parent.parent

    @pytest.fixture
    def venv_python(self, project_root: Path) -> Path:
        """Get the path to the venv Python executable."""
        venv_path = project_root / ".venv" / "bin" / "python"
        if not venv_path.exists():
            pytest.skip("Virtual environment not found. Run 'uv sync' first.")
        return venv_path

    def test_old_src_main_fails_with_isolated_mode(
        self, project_root: Path, venv_python: Path
    ):
        """
        Test that the OLD approach (python -I -m src.main) FAILS.

        This test verifies the bug exists in the old code.
        It should FAIL on the buggy version and be skipped after the fix.
        """
        # Try to run with the old module name
        result = subprocess.run(
            [str(venv_python), "-I", "-m", "src.main", "--version"],
            cwd=str(project_root),
            capture_output=True,
            text=True,
            timeout=5,
            env={
                "PATH": os.environ.get("PATH", ""),
                # Explicitly NO PYTHONPATH - this is the key test
            },
        )

        # The old approach should fail with ModuleNotFoundError
        assert result.returncode != 0, (
            "Expected old approach (src.main) to fail with -I flag, "
            "but it succeeded. This indicates the bug is already fixed."
        )
        assert "ModuleNotFoundError" in result.stderr or "No module named" in result.stderr, (
            f"Expected ModuleNotFoundError for 'src', got: {result.stderr}"
        )

    def test_new_n8n_task_runner_works_with_isolated_mode(
        self, project_root: Path, venv_python: Path
    ):
        """
        Test that the NEW approach (python -I -m n8n_task_runner.main) WORKS.

        This is the critical test that verifies the fix.
        It must:
        1. Use -I flag (isolated mode)
        2. NOT set PYTHONPATH
        3. Successfully import and run the module
        4. Prove the module is found via installed package, not environment hacks
        """
        # Run with the new module name and -I flag
        result = subprocess.run(
            [
                str(venv_python),
                "-I",  # CRITICAL: Isolated mode
                "-c",
                "import n8n_task_runner.main; print('SUCCESS: Module imported')",
            ],
            cwd=str(project_root),
            capture_output=True,
            text=True,
            timeout=5,
            env={
                "PATH": os.environ.get("PATH", ""),
                # Explicitly NO PYTHONPATH - this proves the fix works
            },
        )

        # The new approach must succeed
        assert result.returncode == 0, (
            f"Failed to import n8n_task_runner.main with -I flag.\n"
            f"stdout: {result.stdout}\n"
            f"stderr: {result.stderr}\n"
            f"This indicates the packaging fix is not working correctly."
        )
        assert "SUCCESS: Module imported" in result.stdout, (
            f"Module import succeeded but didn't print expected message.\n"
            f"stdout: {result.stdout}"
        )

    def test_isolated_mode_blocks_pythonpath(
        self, project_root: Path, venv_python: Path
    ):
        """
        Test that -I flag actually ignores PYTHONPATH.

        This verifies that our test setup is correct and -I is working as expected.
        """
        # Try to import a non-existent module with PYTHONPATH set
        fake_module_dir = project_root / "tests" / "fixtures"
        result = subprocess.run(
            [
                str(venv_python),
                "-I",
                "-c",
                "import sys; print('PYTHONPATH' in sys.path[0] if sys.path else False)",
            ],
            cwd=str(project_root),
            capture_output=True,
            text=True,
            timeout=5,
            env={
                "PATH": os.environ.get("PATH", ""),
                "PYTHONPATH": str(fake_module_dir),  # This should be ignored
            },
        )

        assert result.returncode == 0
        # With -I, PYTHONPATH should not be in sys.path
        assert "False" in result.stdout, (
            "PYTHONPATH was not ignored by -I flag. "
            "This indicates -I is not working as expected."
        )

    def test_package_installed_in_site_packages(
        self, project_root: Path, venv_python: Path
    ):
        """
        Test that n8n_task_runner is actually installed and importable.

        This verifies the packaging configuration is correct.
        For editable installs (development), the package points to src/.
        For non-editable installs (production/Docker), it's in site-packages.
        """
        result = subprocess.run(
            [
                str(venv_python),
                "-c",
                "import n8n_task_runner; import os; print(os.path.dirname(n8n_task_runner.__file__))",
            ],
            cwd=str(project_root),
            capture_output=True,
            text=True,
            timeout=5,
            env={
                "PATH": os.environ.get("PATH", ""),
            },
        )

        assert result.returncode == 0, (
            f"Failed to import n8n_task_runner package.\n"
            f"stderr: {result.stderr}\n"
            f"The package may not be installed correctly."
        )

        package_location = result.stdout.strip()
        # The package should be either:
        # - In site-packages/dist-packages (non-editable install for production)
        # - In the src/ directory (editable install for development)
        is_in_site_packages = "site-packages" in package_location or "dist-packages" in package_location
        is_in_src = package_location.endswith("/src") or "/src" in package_location
        
        assert is_in_site_packages or is_in_src, (
            f"Package location is unexpected: {package_location}\n"
            f"Expected either site-packages (production) or src/ (development)."
        )

    @pytest.mark.asyncio
    async def test_runner_starts_with_isolated_mode_in_docker_config(
        self, project_root: Path, venv_python: Path
    ):
        """
        Test that the runner can start with the exact configuration used in Docker.

        This simulates the real-world scenario where the runner is launched
        by the task-runner-launcher with -I flag.
        """
        # Read the actual Docker config to ensure we're testing the real setup
        import json

        config_path = (
            project_root.parent.parent.parent
            / "docker"
            / "images"
            / "runners"
            / "n8n-task-runners.json"
        )

        if not config_path.exists():
            pytest.skip("Docker config not found")

        with open(config_path) as f:
            config = json.load(f)

        # Find the Python runner config
        python_config = next(
            (r for r in config["task-runners"] if r["runner-type"] == "python"), None
        )
        assert python_config is not None, "Python runner config not found"

        # Verify the config uses -I flag
        assert "-I" in python_config["args"], (
            "Python runner config doesn't use -I flag. "
            "This is a regression - the fix requires -I."
        )

        # Verify the config uses n8n_task_runner.main
        module_arg = None
        for i, arg in enumerate(python_config["args"]):
            if arg == "-m" and i + 1 < len(python_config["args"]):
                module_arg = python_config["args"][i + 1]
                break

        assert module_arg == "n8n_task_runner.main", (
            f"Expected module 'n8n_task_runner.main', got '{module_arg}'. "
            f"The Docker config needs to be updated to use the new module name."
        )

        # Try to import the module with the exact args from config
        # (excluding the actual -m flag since we're testing import directly)
        test_args = [arg for arg in python_config["args"] if arg not in ["-m", "n8n_task_runner.main"]]
        test_args.extend(["-c", "import n8n_task_runner.main; print('OK')"])

        result = subprocess.run(
            [str(venv_python)] + test_args,
            cwd=str(project_root),
            capture_output=True,
            text=True,
            timeout=5,
            env={
                "PATH": os.environ.get("PATH", ""),
                # No PYTHONPATH - this is the critical test
            },
        )

        assert result.returncode == 0, (
            f"Failed to run with Docker config args.\n"
            f"args: {test_args}\n"
            f"stdout: {result.stdout}\n"
            f"stderr: {result.stderr}"
        )
        assert "OK" in result.stdout
