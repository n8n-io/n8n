"""Config loader and small REST client for a local n8n instance. Standard library only."""

import http.cookiejar
import json
import os
import stat
import urllib.error
import urllib.request
import uuid
from functools import cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_BASE_URL = 'http://localhost:5678'
TOKEN_FILE = Path.home() / '.config' / 'n8n-builder-compare' / 'mcp-token'


def read_env_file(path):
	"""Return KEY=VALUE pairs from a dotenv file. Values are never printed."""
	values = {}
	p = Path(path)
	if not p.exists():
		return values
	for line in p.read_text().splitlines():
		line = line.strip()
		if line.startswith('export '):
			line = line[7:]
		if not line or line.startswith('#') or '=' not in line:
			continue
		key, value = line.split('=', 1)
		value = value.strip()
		if value[:1] in ('"', "'"):
			value = value[1:].split(value[0], 1)[0]
		else:
			value = value.split(' #', 1)[0].strip()
		values[key.strip()] = value
	return values


def env_files():
	"""Config files from lowest to highest priority."""
	custom = os.environ.get('AI_SURFACES_ENV')
	return [REPO_ROOT / '.env.local', Path(custom) if custom else REPO_ROOT / '.env.ai-surfaces']


@cache
def config():
	"""Merged settings: .env.local, then .env.ai-surfaces, then the process environment."""
	merged = {}
	for path in env_files():
		merged.update({k: v for k, v in read_env_file(path).items() if v != ''})
	merged.update({k: v for k, v in os.environ.items() if v != ''})
	return merged


def setting(*names, default=None):
	"""Return the first name that has a value."""
	values = config()
	for name in names:
		if values.get(name):
			return values[name]
	return default


class N8nClient:
	def __init__(self):
		self.base_url = setting('N8N_BASE_URL', default=DEFAULT_BASE_URL).rstrip('/')
		self.email = setting('N8N_EVAL_EMAIL', default='nathan@n8n.io')
		self.password = setting('N8N_EVAL_PASSWORD', default='PlaywrightTest123')
		# The auth cookie is bound to the browser-id header that was sent at login.
		self.browser_id = str(uuid.uuid4())
		self.cookies = http.cookiejar.CookieJar()
		self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))

	def headers(self, extra=None):
		h = {'content-type': 'application/json', 'browser-id': self.browser_id}
		h.update(extra or {})
		return h

	def request(self, method, path, body=None, timeout=60):
		data = json.dumps(body).encode() if body is not None else None
		req = urllib.request.Request(self.base_url + path, method=method, data=data, headers=self.headers())
		try:
			with self.opener.open(req, timeout=timeout) as res:
				raw = res.read()
		except urllib.error.HTTPError as e:
			detail = e.read()[:500].decode(errors='replace')
			raise RuntimeError(f'{method} {path} -> {e.code}: {detail}') from None
		parsed = json.loads(raw) if raw else None
		if isinstance(parsed, dict) and set(parsed) == {'data'}:
			return parsed['data']
		return parsed

	def open_stream(self, path):
		req = urllib.request.Request(
			self.base_url + path, headers=self.headers({'accept': 'text/event-stream'})
		)
		return self.opener.open(req, timeout=600)

	def login(self):
		self.request('POST', '/rest/login', {'emailOrLdapLoginId': self.email, 'password': self.password})
		return self

	def workflow(self, workflow_id):
		return self.request('GET', f'/rest/workflows/{workflow_id}')


def save_token(token):
	TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
	TOKEN_FILE.write_text(token)
	os.chmod(TOKEN_FILE, stat.S_IRUSR | stat.S_IWUSR)


def load_token():
	"""N8N_MCP_TOKEN from the config wins over the cached token."""
	token = setting('N8N_MCP_TOKEN')
	if token:
		return token
	return TOKEN_FILE.read_text().strip() if TOKEN_FILE.exists() else None


def is_full_token(value):
	return isinstance(value, str) and value.count('.') == 2 and '*' not in value
