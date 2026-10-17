"""Shared helpers: paths, settings, and fresh n8n instances for the scenario runs. Standard library only.

The skill reuses the scripts of compare-workflow-builders (settings, REST client, report parts,
live server). This module puts them on the import path.
"""

import os
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
SHARED = HERE.parents[1] / 'compare-workflow-builders' / 'scripts'
sys.path.insert(0, str(SHARED))

from n8n_api import REPO_ROOT, N8nClient, config, setting  # noqa: E402

CACHE = Path(setting('FEATURE_TEST_CACHE', default=str(Path.home() / '.cache' / 'n8n-feature-test'))).expanduser()
RUNS_ROOT = Path(setting('FEATURE_TEST_RUNS_DIR', default='/tmp/feature-test'))
# These settings belong to the instance that the user runs. A fresh instance must not reuse them.
INSTANCE_ENV_SKIP = ('N8N_LICENSE_', 'DB_', 'N8N_PORT', 'N8N_USER_FOLDER', 'N8N_EDITOR_BASE_URL', 'WEBHOOK_URL',
                     'N8N_RUNNERS_BROKER_PORT', 'N8N_HOST', 'N8N_PROTOCOL', 'N8N_ENCRYPTION_KEY', 'N8N_BASE_URL')


def free_port():
	with socket.socket() as s:
		s.bind(('127.0.0.1', 0))
		return s.getsockname()[1]


def instance_env(port, home):
	"""The settings of the user's instance (.env.local and .env.ai-surfaces), with a new port and data folder."""
	env = {k: v for k, v in os.environ.items() if not k.startswith(INSTANCE_ENV_SKIP)}
	env.update({k: v for k, v in config().items() if not k.startswith(INSTANCE_ENV_SKIP)})
	# Keep N8N_DIAGNOSTICS_ENABLED as the user set it: when it is false, Instance AI sends no LangSmith traces.
	env.update(
		N8N_PORT=str(port), N8N_RUNNERS_BROKER_PORT=str(free_port()), N8N_USER_FOLDER=str(home),
		N8N_EDITOR_BASE_URL=f'http://localhost:{port}', WEBHOOK_URL=f'http://localhost:{port}/',
		N8N_PERSONALIZATION_ENABLED='false',
	)
	return env


class Instance:
	"""A fresh n8n instance with its own port and data folder, started from a checkout that is built."""

	def __init__(self, name, root, home, log):
		self.name, self.root, self.home, self.log_path = name, Path(root), Path(home), Path(log)
		self.port = free_port()
		self.url = f'http://localhost:{self.port}'
		self.proc = None

	def start(self, timeout=180):
		self.home.mkdir(parents=True, exist_ok=True)
		log = self.log_path.open('w')
		# A new session, so stop() can end n8n and its task runners together.
		self.proc = subprocess.Popen(['node', str(self.root / 'packages' / 'cli' / 'bin' / 'n8n'), 'start'],
		                             cwd=self.home, env=instance_env(self.port, self.home),
		                             stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
		deadline = time.time() + timeout
		while time.time() < deadline:
			if self.proc.poll() is not None:
				raise RuntimeError(f'{self.name} instance stopped at start (exit {self.proc.returncode}), see {self.log_path}')
			try:
				with urllib.request.urlopen(f'{self.url}/healthz/readiness', timeout=2) as res:
					if res.status == 200:
						break
			except OSError:
				pass
			time.sleep(1)
		else:
			raise RuntimeError(f'{self.name} instance did not become ready in {timeout}s, see {self.log_path}')
		seed(self.url)
		return self

	def stop(self):
		if not self.proc or self.proc.poll() is not None:
			return
		try:
			os.killpg(self.proc.pid, signal.SIGTERM)
			self.proc.wait(timeout=30)
		except (ProcessLookupError, subprocess.TimeoutExpired):
			try:
				os.killpg(self.proc.pid, signal.SIGKILL)
			except ProcessLookupError:
				pass


def client(base_url):
	c = N8nClient()
	c.base_url = base_url.rstrip('/')
	return c


def seed(base_url):
	"""Create the owner (N8N_EVAL_EMAIL and N8N_EVAL_PASSWORD) and finish the Assistant setup."""
	c = client(base_url)
	c.request('POST', '/rest/owner/setup',
	          {'email': c.email, 'firstName': 'Feature', 'lastName': 'Test', 'password': c.password})
	c.login()
	# Web search is optional. Without a choice, the Assistant shows its setup screen instead of the chat.
	c.request('PUT', '/rest/instance-ai/settings', {'enabled': True, 'searchDisabled': True})


def git(*args, cwd=REPO_ROOT):
	return subprocess.run(['git', *args], cwd=cwd, capture_output=True, text=True, check=True).stdout.strip()
