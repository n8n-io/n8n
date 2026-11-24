import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import n8n_api
import run_instance_ai


class OpenRouterEffortTest(unittest.TestCase):
	def test_reported_effort_matches_the_orchestrator(self):
		for effort, thinking_enabled, expected in (
			(' MEDIUM ', None, 'medium'),
			('none', 'true', 'none'),
			(None, 'true', None),
			('max', 'true', None),
			('high', 'false', None),
			('high', '0', None),
		):
			with self.subTest(effort=effort, thinking_enabled=thinking_enabled):
				settings = {
					'N8N_INSTANCE_AI_MODEL': 'openrouter/anthropic/claude-sonnet-4.5',
					'N8N_INSTANCE_AI_REASONING_EFFORT': effort,
					'N8N_INSTANCE_AI_THINKING_ENABLED': thinking_enabled,
				}
				with patch('n8n_api.config', return_value=settings):
					self.assertEqual(run_instance_ai.configured_effort(), expected)

	def test_file_backed_thinking_flag(self):
		with TemporaryDirectory() as tmp, patch('n8n_api.env_files', return_value=[]):
			flag_file = Path(tmp) / 'thinking-enabled'
			env = {
				'N8N_INSTANCE_AI_MODEL': 'openrouter/anthropic/claude-sonnet-4.5',
				'N8N_INSTANCE_AI_REASONING_EFFORT': 'medium',
				'N8N_INSTANCE_AI_THINKING_ENABLED_FILE': str(flag_file),
			}
			self.addCleanup(n8n_api.config.cache_clear)
			for contents, direct, expected in (
				(None, None, None),
				(' FALSE\n', None, None),
				('false', 'true', 'medium'),
				('false', '', 'medium'),
				('1\n', None, 'medium'),
			):
				with self.subTest(contents=contents, direct=direct), patch.dict(os.environ, env, clear=True):
					if contents is not None:
						flag_file.write_text(contents, encoding='utf-8')
					if direct is not None:
						os.environ['N8N_INSTANCE_AI_THINKING_ENABLED'] = direct
					n8n_api.config.cache_clear()
					self.assertEqual(run_instance_ai.configured_effort(), expected)
