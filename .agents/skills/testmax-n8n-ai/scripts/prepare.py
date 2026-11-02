#!/usr/bin/env python3
"""Check the local setup and make the n8n MCP token available.

Prints a JSON status object. It never prints a token or a key.

  prepare.py            check everything, reuse the cached MCP token
  prepare.py --rotate   create a new MCP key (this breaks other clients that use the old key)
"""

import argparse
import json
import shutil
import subprocess
import sys
import urllib.request

from n8n_api import TOKEN_FILE, N8nClient, env_files, is_full_token, load_token, save_token, setting


def mcp_handshake(base_url, token):
	body = json.dumps({
		'jsonrpc': '2.0', 'id': 1, 'method': 'initialize',
		'params': {'protocolVersion': '2025-03-26', 'capabilities': {},
		           'clientInfo': {'name': 'testmax-n8n-ai', 'version': '1'}},
	}).encode()
	req = urllib.request.Request(base_url + '/mcp-server/http', data=body, method='POST', headers={
		'content-type': 'application/json',
		'accept': 'application/json, text/event-stream',
		'authorization': f'Bearer {token}',
	})
	try:
		with urllib.request.urlopen(req, timeout=20) as res:
			return res.status == 200
	except Exception:
		return False


def docker_ready():
	if not shutil.which('docker'):
		return False
	return subprocess.run(['docker', 'info'], capture_output=True).returncode == 0


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('--rotate', action='store_true')
	args = ap.parse_args()

	status = {
		'configFiles': [str(p) for p in env_files() if p.exists()],
		'tokenFile': str(TOKEN_FILE),
		'builders': setting('COMPARE_BUILDERS', default='iai,claude,codex'),
		'keys': {
			'claude': bool(setting('CLAUDE_API_KEY', 'ANTHROPIC_API_KEY')),
			'codex': bool(setting('CODEX_API_KEY', 'OPENAI_API_KEY')),
			'langsmith': bool(setting('LANGSMITH_API_KEY')),
		},
	}
	client = N8nClient()
	status['baseUrl'] = client.base_url
	try:
		client.login()
		status['login'] = True
	except Exception as e:
		status['login'] = False
		status['error'] = str(e)
		print(json.dumps(status, indent=2))
		sys.exit(1)

	try:
		settings = client.request('GET', '/rest/instance-ai/settings')
		status['instanceAiEnabled'] = bool(settings.get('enabled'))
	except Exception:
		status['instanceAiEnabled'] = False

	client.request('PATCH', '/rest/mcp/settings', {'mcpAccessEnabled': True})
	status['mcpAccessEnabled'] = True

	token = None
	if args.rotate:
		if setting('N8N_MCP_TOKEN'):
			# The clients would keep the configured token, which the rotation makes invalid.
			sys.exit('Remove N8N_MCP_TOKEN from the config before you rotate the MCP key, then run prepare.py --rotate again.')
		token = client.request('POST', '/rest/mcp/api-key/rotate')['apiKey']
		save_token(token)
	else:
		current = client.request('GET', '/rest/mcp/api-key')['apiKey']
		if is_full_token(current):
			# A new key was created for this user, so the full value is visible once.
			save_token(current)
		token = load_token()
	status['mcpTokenSource'] = 'N8N_MCP_TOKEN' if setting('N8N_MCP_TOKEN') else 'cache'

	status['mcpTokenAvailable'] = bool(token)
	status['mcpTokenWorks'] = bool(token) and mcp_handshake(client.base_url, token)
	if not status['mcpTokenWorks']:
		status['mcpTokenHelp'] = (
			'The MCP token is missing or invalid. Set N8N_MCP_TOKEN in .env.ai-surfaces, or run '
			'prepare.py --rotate after the user agrees. Rotation invalidates the old key in every other MCP client.'
		)

	status['docker'] = docker_ready()
	status['claudeOnHost'] = bool(shutil.which('claude'))
	status['codexOnHost'] = bool(shutil.which('codex'))
	print(json.dumps(status, indent=2))


if __name__ == '__main__':
	main()
